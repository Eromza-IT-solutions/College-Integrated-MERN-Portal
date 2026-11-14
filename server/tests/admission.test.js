import mongoose from 'mongoose';
import Program from '../src/models/Program.js';

const id = () => new mongoose.Types.ObjectId();

describe('Program', () => {
  test('needs name, code and department; code is upper-cased', async () => {
    await expect(new Program({}).validate()).rejects.toThrow();
    const p = new Program({ name: 'F.Y.B.Sc.(Computer Application)', code: 'fybsc-ca', departmentId: id() });
    await expect(p.validate()).resolves.toBeUndefined();
    expect(p.code).toBe('FYBSC-CA');
  });
});
