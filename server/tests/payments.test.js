import mongoose from 'mongoose';
import FeeStructure from '../src/models/FeeStructure.js';

const id = () => new mongoose.Types.ObjectId();

describe('FeeStructure', () => {
  const fee = (over = {}) => new FeeStructure({
    purpose: 'admission', academicYearId: id(), programId: id(), feesCategory: 'PAYING', amountPaise: 1200000, ...over,
  });
  test('a valid fee passes', async () => { await expect(fee().validate()).resolves.toBeUndefined(); });
  test.each([
    ['negative amount', { amountPaise: -1 }],
    ['fraction of a paisa', { amountPaise: 10.5 }],
    ['unknown category', { feesCategory: 'VIP' }],
    ['unknown purpose', { purpose: 'library' }],
  ])('rejects %s', async (_n, over) => { await expect(fee(over).validate()).rejects.toThrow(); });
  test('a free category (amount 0) is allowed', async () => { await expect(fee({ amountPaise: 0 }).validate()).resolves.toBeUndefined(); });
});
