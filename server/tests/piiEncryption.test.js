import crypto from 'node:crypto';
import Application from '../src/models/Application.js';
import ExamForm from '../src/models/ExamForm.js';
import { stripSecrets } from '../src/models/AuditLog.js';
import env from '../src/config/env.js';
import { hashMobile } from '../src/utils/blindIndex.js';
import {
  PREFIX,
  ciphertextKeyId,
  decryptDateField,
  decryptField,
  encryptDateField,
  encryptField,
  isEncrypted,
} from '../src/utils/fieldCrypto.js';
import {
  EXAM_FORM_FIELDS,
  decryptedUpdates,
  encryptedCandidates,
  encryptedUpdates,
  piiCandidates,
} from '../scripts/migrate-pii-encryption.js';

describe('field encryption', () => {
  test('encrypts with a random IV and round-trips the original value', () => {
    const first = encryptField('123456789012');
    const second = encryptField('123456789012');

    expect(first.startsWith(PREFIX)).toBe(true);
    expect(first).not.toBe(second);
    expect(decryptField(first)).toBe('123456789012');
    expect(decryptField(second)).toBe('123456789012');
  });

  test('leaves legacy plaintext untouched so old rows remain readable', () => {
    expect(decryptField('9000000000')).toBe('9000000000');
    expect(decryptField(undefined)).toBeUndefined();
    expect(decryptField(null)).toBeNull();
    expect(isEncrypted('9000000000')).toBe(false);
    expect(isEncrypted(encryptField('9000000000'))).toBe(true);
  });

  test('detects tampering with an encrypted value', () => {
    const value = encryptField('123456789012');
    const parts = value.slice(PREFIX.length).split(':');
    parts[2] = `${parts[2].slice(0, -2)}AA`;
    expect(() => decryptField(`${PREFIX}${parts.join(':')}`)).toThrow();
  });

  test('round-trips a date of birth', () => {
    const dob = new Date('2001-05-14T00:00:00.000Z');
    const encrypted = encryptDateField(dob);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(decryptDateField(encrypted)).toEqual(dob);
    expect(decryptDateField('2001-05-14')).toBe('2001-05-14');
  });

  test('embeds a key ID, a fresh 12-byte IV and a verifiable 16-byte auth tag', () => {
    const value = encryptField('9000000005');
    const [marker, id, iv, tag, data] = value.slice(PREFIX.length).split(':');
    expect(marker).toBe('k');
    expect(id).toBe(env.fieldEncryptionKeyId);
    expect(Buffer.from(iv, 'base64')).toHaveLength(12);
    expect(Buffer.from(tag, 'base64')).toHaveLength(16);
    expect(Buffer.from(data, 'base64').length).toBeGreaterThan(0);
    expect(ciphertextKeyId(value)).toBe(env.fieldEncryptionKeyId);
  });

  test('reads pre-key-ID ciphertext and decrypts it with a previous key after rotation', () => {
    const originalKey = env.fieldEncryptionKey;
    const originalId = env.fieldEncryptionKeyId;
    const originalPrevious = env.fieldEncryptionPreviousKeys;
    const current = encryptField('123456789012');
    const legacy = `${PREFIX}${current.slice(PREFIX.length).split(':').slice(2).join(':')}`;
    try {
      expect(decryptField(legacy)).toBe('123456789012');
      const nextKey = crypto.randomBytes(32).toString('base64');
      env.fieldEncryptionKey = nextKey;
      env.fieldEncryptionKeyId = 'v2';
      env.fieldEncryptionPreviousKeys = { v1: originalKey };
      expect(decryptField(legacy)).toBe('123456789012');
      expect(decryptField(current)).toBe('123456789012');
      const rotated = encryptField('123456789012');
      expect(ciphertextKeyId(rotated)).toBe('v2');
      expect(decryptField(rotated)).toBe('123456789012');
      const tampered = current.slice(PREFIX.length).split(':');
      tampered[3] = `${tampered[3][0] === 'A' ? 'B' : 'A'}${tampered[3].slice(1)}`;
      expect(() => decryptField(`${PREFIX}${tampered.join(':')}`)).toThrow();
    } finally {
      env.fieldEncryptionKey = originalKey;
      env.fieldEncryptionKeyId = originalId;
      env.fieldEncryptionPreviousKeys = originalPrevious;
    }
  });

  test('a wrong key throws instead of returning a value', () => {
    const value = encryptField('123456789012');
    const originalKey = env.fieldEncryptionKey;
    try {
      env.fieldEncryptionKey = crypto.randomBytes(32).toString('base64');
      expect(() => decryptField(value)).toThrow(/No encryption key|Unsupported state|auth/i);
    } finally {
      env.fieldEncryptionKey = originalKey;
    }
  });
});

describe('search and audit safeguards', () => {
  test('mobile blind index is deterministic, keyed and works on ciphertext', () => {
    const application = new Application();
    application.set('student.mobile', '9000000007');
    const ciphertext = application.get('student.mobile', null, { getters: false });
    const hash = hashMobile('9000000007');
    expect(hash).toMatch(/^[a-f\d]{64}$/);
    expect(hash).not.toContain('9000000007');
    expect(hashMobile(ciphertext)).toBe(hash);
    expect(hashMobile('9000000008')).not.toBe(hash);
  });

  test('audit details strip PII keys at every depth', () => {
    const cleaned = stripSecrets({
      aadhaarNumber: '123456789012',
      student: { mobile: '9000000001', birthDate: '2000-01-01', address: { line1: 'Secret Lane' } },
      parent: { phone: '9000000002' },
      amountPaise: 100,
      nested: [{ email: 'a@example.test', password: 'hunter2' }],
    });
    expect(cleaned.aadhaarNumber).toBe('[removed]');
    expect(cleaned.student.mobile).toBe('[removed]');
    expect(cleaned.student.birthDate).toBe('[removed]');
    expect(cleaned.student.address).toBe('[removed]');
    expect(cleaned.parent.phone).toBe('[removed]');
    expect(cleaned.nested[0].email).toBe('[removed]');
    expect(cleaned.nested[0].password).toBe('[removed]');
    expect(cleaned.amountPaise).toBe(100);
  });
});

describe('encrypted application fields', () => {
  test('stores ciphertext but exposes plaintext through getters and toObject', () => {
    const application = new Application();
    application.set('aadhaarNumber', '123456789012');
    application.set('student.mobile', '9000000001');
    application.set('student.birthDate', new Date('2000-01-01T00:00:00.000Z'));

    expect(isEncrypted(application.get('aadhaarNumber', null, { getters: false }))).toBe(true);
    expect(application.get('aadhaarNumber')).toBe('123456789012');
    expect(application.get('student.mobile')).toBe('9000000001');
    expect(application.get('student.birthDate')).toEqual(new Date('2000-01-01T00:00:00.000Z'));

    const view = application.toObject();
    expect(view.aadhaarNumber).toBe('123456789012');
    expect(view.student.mobile).toBe('9000000001');
    expect(view.student.birthDate).toEqual(new Date('2000-01-01T00:00:00.000Z'));
  });

  test('encrypts the exam form mobile snapshot but exposes it through getters', () => {
    const form = new ExamForm();
    form.set('details.mobile', '9000000009');
    expect(isEncrypted(form.get('details.mobile', null, { getters: false }))).toBe(true);
    expect(form.get('details.mobile')).toBe('9000000009');
    expect(form.toObject().details.mobile).toBe('9000000009');
  });

  test('rejects malformed encrypted identifiers during validation', async () => {
    const application = new Application();
    application.set('aadhaarNumber', '123');
    application.set('student.mobile', '123');

    await expect(application.validate()).rejects.toThrow(/Application validation failed/);
    try {
      await application.validate();
    } catch (error) {
      expect(error.errors.aadhaarNumber.reason.message).toMatch(/Aadhaar number must be 12 digits/);
      expect(error.errors['student.mobile'].reason.message).toMatch(/Mobile number must be 10 digits/);
    }
  });
});

describe('PII encryption migration helpers', () => {
  const plainRow = () => ({
    aadhaarNumber: '123456789012',
    student: { mobile: '9000000002', birthDate: new Date('1999-02-03T00:00:00.000Z'), fullName: 'Keep Me' },
    parent: { fatherMobile: '9000000003' },
  });

  // Mirrors MongoDB $set with dotted paths: update the leaf without replacing its parent.
  const applyUpdates = (row, updates) => {
    const out = { ...row };
    for (const [path, value] of Object.entries(updates)) {
      const parts = path.split('.');
      const last = parts.pop();
      let target = out;
      for (const part of parts) {
        target[part] = { ...(target[part] || {}) };
        target = target[part];
      }
      target[last] = value;
    }
    return out;
  };

  test('counts only plaintext values and produces dotted encrypted updates', () => {
    const row = plainRow();
    const before = piiCandidates([row]);
    expect(before.documents).toBe(1);
    expect(before.counts.aadhaarNumber).toBe(1);
    expect(before.counts['student.mobile']).toBe(1);
    expect(before.counts['student.birthDate']).toBe(1);
    expect(before.counts['parent.fatherMobile']).toBe(1);
    expect(before.counts['parent.motherMobile']).toBe(0);

    const updates = encryptedUpdates(row);
    expect(isEncrypted(updates.aadhaarNumber)).toBe(true);
    expect(isEncrypted(updates['student.mobile'])).toBe(true);
    expect(isEncrypted(updates['student.birthDate'])).toBe(true);
    expect(isEncrypted(updates['parent.fatherMobile'])).toBe(true);

    const encryptedRow = applyUpdates(row, updates);
    expect(encryptedRow.student.fullName).toBe('Keep Me');
    expect(piiCandidates([encryptedRow]).documents).toBe(0);
    expect(encryptedCandidates([encryptedRow]).documents).toBe(1);
    expect(encryptedUpdates(encryptedRow)).toEqual({});

    const restored = decryptedUpdates(encryptedRow);
    expect(restored.aadhaarNumber).toBe(row.aadhaarNumber);
    expect(restored['student.mobile']).toBe(row.student.mobile);
    expect(restored['student.birthDate']).toEqual(row.student.birthDate);

    const restoredRow = applyUpdates(encryptedRow, restored);
    expect(restoredRow.student.fullName).toBe('Keep Me');
    expect(encryptedCandidates([restoredRow]).documents).toBe(0);
    expect(piiCandidates([restoredRow]).documents).toBe(1);
  });

  test('also migrates the exam form mobile snapshot without replacing its parent', () => {
    const row = { details: { mobile: '9000000004', purpose: 'exam' } };
    expect(piiCandidates([row], EXAM_FORM_FIELDS).documents).toBe(1);
    const updates = encryptedUpdates(row, EXAM_FORM_FIELDS);
    expect(isEncrypted(updates['details.mobile'])).toBe(true);
    const encryptedRow = applyUpdates(row, updates);
    expect(encryptedRow.details.purpose).toBe('exam');
    expect(piiCandidates([encryptedRow], EXAM_FORM_FIELDS).documents).toBe(0);
    expect(decryptedUpdates(encryptedRow, EXAM_FORM_FIELDS)['details.mobile']).toBe('9000000004');
  });
});
