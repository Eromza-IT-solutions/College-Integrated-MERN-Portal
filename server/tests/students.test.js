import User from '../src/models/User.js';
import { parseLoginId, hashAadhaar } from '../src/utils/loginId.js';

beforeAll(() => { process.env.LOGIN_ID_HASH_SECRET = 'a-long-test-secret-for-hashing'; });

describe('parseLoginId', () => {
  test.each([
    ['Aman@Demo.example', { type: 'email', value: 'aman@demo.example' }],
    ['  a@b.co ', { type: 'email', value: 'a@b.co' }],
    ['9876543210', { type: 'mobile', value: '9876543210' }],
    ['98765 43210', { type: 'mobile', value: '9876543210' }],
    ['+91 98765-43210', { type: 'mobile', value: '9876543210' }],
    ['1234 5678 9012', { type: 'aadhaar', value: '123456789012' }],
    ['1234-5678-9012', { type: 'aadhaar', value: '123456789012' }],
  ])('reads %s', (input, expected) => { expect(parseLoginId(input)).toEqual(expected); });

  test.each([[''], ['   '], ['not an email'], ['12345'], ['12345678901'], ['abc@'], ['98765x43210'], [null], [undefined], [12345], ['+1 555']])(
    'returns null for %p', (input) => { expect(parseLoginId(input)).toBeNull(); }
  );
});

describe('hashAadhaar', () => {
  test('same number gives the same hash, however it is typed; it is not the number', () => {
    const a = hashAadhaar('123456789012');
    expect(hashAadhaar('1234 5678 9012')).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('123456789012');
  });
  test('different numbers differ; a different secret differs', () => {
    const a = hashAadhaar('123456789012');
    expect(hashAadhaar('123456789013')).not.toBe(a);
    process.env.LOGIN_ID_HASH_SECRET = 'another-long-test-secret-value';
    expect(hashAadhaar('123456789012')).not.toBe(a);
    process.env.LOGIN_ID_HASH_SECRET = 'a-long-test-secret-for-hashing';
  });
  test('refuses bad numbers and a missing secret', () => {
    expect(() => hashAadhaar('123')).toThrow(/12 digits/);
    const keep = process.env.LOGIN_ID_HASH_SECRET;
    delete process.env.LOGIN_ID_HASH_SECRET;
    expect(() => hashAadhaar('123456789012')).toThrow(/LOGIN_ID_HASH_SECRET/);
    process.env.LOGIN_ID_HASH_SECRET = keep;
  });
});

describe('User sign-in identifiers', () => {
  const user = (over = {}) => new User({ fullName: 'A', email: 'a@b.com', passwordHash: 'x', role: 'student', ...over });

  test('mobile must be 10 digits when given; it is optional', async () => {
    await expect(user().validate()).resolves.toBeUndefined();
    await expect(user({ mobile: '9876543210' }).validate()).resolves.toBeUndefined();
    await expect(user({ mobile: '12345' }).validate()).rejects.toThrow();
  });

  test('setAadhaar keeps only a hash and the last 4 digits, and the hash never leaves in JSON', () => {
    const u = user();
    u.setAadhaar('1234 5678 9012');
    expect(u.aadhaarLast4).toBe('9012');
    expect(u.aadhaarHash).toBe(hashAadhaar('123456789012'));
    expect(JSON.stringify(u.toJSON())).not.toContain(u.aadhaarHash);
    expect(User.schema.path('aadhaarHash').options.select).toBe(false);
  });

  test('findByLoginId searches the right field for each kind of input', () => {
    const seen = [];
    User.findOne = (filter) => { seen.push(filter); return { select: (s) => ({ filter, s }) }; };
    expect(User.findByLoginId('A@B.com')).toEqual({ filter: { email: 'a@b.com' }, s: '+passwordHash' });
    expect(User.findByLoginId('98765 43210').filter).toEqual({ mobile: '9876543210' });
    expect(User.findByLoginId('1234 5678 9012').filter).toEqual({ aadhaarHash: hashAadhaar('123456789012') });
    expect(User.findByLoginId('nonsense')).toBeNull();
    expect(seen).toHaveLength(3);
  });
});
