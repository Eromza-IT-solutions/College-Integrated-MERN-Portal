import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Permission from '../src/models/Permission.js';
import { seedPermissions, validateMatrix } from '../scripts/seed-permissions.js';
import { changeScope, grantPermission, revokePermission } from '../src/modules/admin/super/rbac.service.js';

const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));
const keyOf = (r) => `${r.roleKey}|${r.resource}|${r.action}`;
const find = (roleKey, resource, action) => Permission.findOne({ roleKey, resource, action });

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Permission.init(); // make sure the unique index exists
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  jest.restoreAllMocks();
  await Permission.deleteMany({});
});

async function duplicateGroups() {
  return Permission.aggregate([{ $group: { _id: { r: '$roleKey', s: '$resource', a: '$action' }, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }]);
}

describe('seedPermissions (insert-only)', () => {
  test('the signed-off matrix still has 178 unique rules', () => {
    expect(matrix).toHaveLength(178);
    expect(new Set(matrix.map(keyOf)).size).toBe(178);
  });

  test('initial seeding creates all 178 rules, equal to the matrix, with timestamps', async () => {
    const s = await seedPermissions();
    expect(s).toMatchObject({ total: 178, added: 178, preserved: 0, customised: 0, removed: 0, extra: 0 });
    const stored = await Permission.find().lean();
    expect(stored).toHaveLength(178);
    expect(new Map(stored.map((p) => [keyOf(p), p.scope]))).toEqual(new Map(matrix.map((r) => [keyOf(r), r.scope])));
    for (const p of stored) {
      expect(p.createdAt).toBeInstanceOf(Date);
      expect(p.updatedAt).toBeInstanceOf(Date);
    }
  });

  test('repeated seeding creates no duplicates and adds nothing', async () => {
    await seedPermissions();
    for (let i = 0; i < 3; i += 1) {
      const s = await seedPermissions();
      expect(s).toMatchObject({ added: 0, preserved: 178, customised: 0 });
    }
    expect(await Permission.countDocuments()).toBe(178);
    expect(await duplicateGroups()).toEqual([]);
  });

  test('a scope customised through the Super Admin API is preserved', async () => {
    await seedPermissions();
    const rule = await find('hod', 'notices', 'update'); // matrix says department
    expect(rule.scope).toBe('department');
    await changeScope(rule.id, 'all');

    const s = await seedPermissions();
    expect(s).toMatchObject({ added: 0, preserved: 178, customised: 1 });
    expect((await find('hod', 'notices', 'update')).scope).toBe('all');
  });

  test('existing rules keep their exact createdAt and updatedAt', async () => {
    await seedPermissions();
    const old = new Date('2020-01-01T00:00:00Z');
    await Permission.collection.updateMany({}, { $set: { createdAt: old, updatedAt: old } }); // raw write: no auto timestamps
    await seedPermissions();
    const stored = await Permission.find().lean();
    expect(stored).toHaveLength(178);
    for (const p of stored) {
      expect(p.updatedAt.getTime()).toBe(old.getTime());
      expect(p.createdAt.getTime()).toBe(old.getTime());
    }
  });

  test('a rule added through the API is kept (and listed as extra), a missing matrix rule is added', async () => {
    await seedPermissions();
    await grantPermission({ roleKey: 'teacher', resource: 'notices', action: 'create', scope: 'department' });
    await Permission.deleteMany({ roleKey: 'student', resource: 'results', action: 'view' });
    await Permission.deleteMany({ roleKey: 'hod', resource: 'reports', action: 'export' });

    const s = await seedPermissions();
    expect(s).toMatchObject({ added: 2, preserved: 176, extra: 1, removed: 0 });
    expect((await find('teacher', 'notices', 'create')).scope).toBe('department');
    expect(await Permission.countDocuments()).toBe(179);
  });

  test('a partly filled database only gets the missing rules', async () => {
    await Permission.insertMany(matrix.slice(0, 90));
    const s = await seedPermissions();
    expect(s).toMatchObject({ added: 88, preserved: 90 });
    expect(await Permission.countDocuments()).toBe(178);
  });

  test('a deleted rule is restored with the matrix scope, and nothing else changes', async () => {
    await seedPermissions();
    const rule = await find('hod', 'notices', 'update');
    await changeScope(rule.id, 'all'); // customised neighbour
    const revoked = await find('student', 'results', 'view');
    await revokePermission(revoked.id);
    expect(await find('student', 'results', 'view')).toBeNull();

    const s = await seedPermissions();
    expect(s.added).toBe(1);
    expect((await find('student', 'results', 'view')).scope).toBe('own'); // matrix value
    expect((await find('hod', 'notices', 'update')).scope).toBe('all'); // neighbour untouched
  });

  test('unknown rules stay without --prune and are deleted with it; customised rules survive prune', async () => {
    await seedPermissions();
    await Permission.create({ roleKey: 'teacher', resource: 'oldThing', action: 'view', scope: 'own' });
    await changeScope((await find('hod', 'notices', 'update')).id, 'all');

    const kept = await seedPermissions();
    expect(kept).toMatchObject({ extra: 1, removed: 0 });
    expect(await find('teacher', 'oldThing', 'view')).toBeTruthy();

    const pruned = await seedPermissions({ prune: true });
    expect(pruned).toMatchObject({ removed: 1, extra: 0 });
    expect(await find('teacher', 'oldThing', 'view')).toBeNull();
    expect((await find('hod', 'notices', 'update')).scope).toBe('all');
    expect(await Permission.countDocuments()).toBe(178);
  });

  test('invalid matrices throw and write nothing', async () => {
    const good = matrix[0];
    const bad = [
      [],
      [good, { ...good, roleKey: 'wizard', resource: 'x' }],
      [good, { ...good, resource: 'Bad_Name' }],
      [good, { ...good, action: 'explode' }],
      [good, { ...good, scope: 'galaxy' }],
      [good, { ...good }], // duplicate
    ];
    for (const rows of bad) {
      await expect(seedPermissions({ rows })).rejects.toThrow();
    }
    expect(() => validateMatrix('nope')).toThrow();
    expect(await Permission.countDocuments()).toBe(0);
  });

  test('seeders running at the same time create no duplicates and no error', async () => {
    const runs = await Promise.all([seedPermissions(), seedPermissions(), seedPermissions(), seedPermissions()]);
    expect(await Permission.countDocuments()).toBe(178);
    expect(await duplicateGroups()).toEqual([]);
    for (const s of runs) expect(s.total).toBe(178);
  });

  test('only duplicate-key errors are ignored; any other database error is thrown', async () => {
    const dup = Object.assign(new Error('dup'), { writeErrors: [{ code: 11000 }, { code: 11000 }], result: { upsertedCount: 3 } });
    jest.spyOn(Permission, 'bulkWrite').mockRejectedValueOnce(dup);
    const s = await seedPermissions();
    expect(s.added).toBe(3);

    const mixed = Object.assign(new Error('mixed'), { writeErrors: [{ code: 11000 }, { code: 121 }] });
    jest.spyOn(Permission, 'bulkWrite').mockRejectedValueOnce(mixed);
    await expect(seedPermissions()).rejects.toThrow('mixed');

    jest.spyOn(Permission, 'bulkWrite').mockRejectedValueOnce(new Error('connection lost'));
    await expect(seedPermissions()).rejects.toThrow('connection lost');
  });
});
