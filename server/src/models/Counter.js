import mongoose from 'mongoose';

// One document per running number, for example:
//   { _id: 'application:2026-27', seq: 41 }
// Used for application, student, receipt and exam seat numbers.
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // the key, like "receipt:2026-27"
    seq: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

/**
 * Get the next number for a key. Safe when many requests arrive at the same time:
 * the increment happens inside MongoDB in one step, so two requests can never get the same number.
 *
 * Pass { session } to make it part of a transaction.
 * Example: const n = await Counter.next('application:2026-27');
 */
counterSchema.statics.next = async function next(key, { session } = {}) {
  if (!key || typeof key !== 'string') {
    throw new Error('Counter key is required');
  }
  const options = { new: true, upsert: true, setDefaultsOnInsert: true, session };

  try {
    const doc = await this.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, options);
    return doc.seq;
  } catch (err) {
    // Two requests creating the very first number of a new key at the same moment:
    // one of them can get a duplicate-key error. Just try once more.
    if (err && err.code === 11000) {
      const doc = await this.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, options);
      return doc.seq;
    }
    throw err;
  }
};

/**
 * Turn a number into the text shown to people. The exact formats are still an open decision,
 * so the prefix and width are passed in. Example:
 *   Counter.format({ prefix: 'APP', yearLabel: '2026-27', seq: 123 }) -> "APP-2026-27-000123"
 */
counterSchema.statics.format = function format({ prefix, yearLabel, seq, width = 6 }) {
  const parts = [prefix];
  if (yearLabel) parts.push(yearLabel);
  parts.push(String(seq).padStart(width, '0'));
  return parts.join('-');
};

export default mongoose.model('Counter', counterSchema);
