import mongoose from 'mongoose';
async function withTransaction(callback, { session: existing } = {}) {
  if (existing) return callback({ session: existing });   // join an outer transaction
  if (mongoose.connection.readyState !== 1) {
    if (process.env.NODE_ENV === 'test') return callback({ session: null });
    throw new Error('Database is not connected; refusing to run without a transaction');
  }
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(
      async () => { result = await callback({ session }); },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
    );
    return result;
  } finally {
    await session.endSession();
  }
}
export { withTransaction };
