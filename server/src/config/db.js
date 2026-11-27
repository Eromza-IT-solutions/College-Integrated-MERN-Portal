// MongoDB Atlas connection. Call connectDatabase() once, before the server starts listening.
import dns from 'node:dns';
import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

async function connect() {
  // Indexes are created by `npm run sync:indexes` during deployment, never implicitly at startup.
  await mongoose.connect(env.mongodbUri, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
}

async function connectDatabase() {
  try {
    try {
      await connect();
    } catch (err) {
      // Some local resolvers (e.g. a 127.0.0.1 stub) refuse SRV lookups needed by mongodb+srv://.
      // Retry once with public DNS in that case.
      if (err.code !== 'ECONNREFUSED' || err.syscall !== 'querySrv') throw err;
      console.warn('SRV lookup refused by local DNS; retrying with public DNS servers.');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      await connect();
    }
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

async function disconnectDatabase() {
  await mongoose.connection.close();
}

export { connectDatabase, disconnectDatabase };
