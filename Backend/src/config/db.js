// MongoDB Atlas connection. Call connectDatabase() once, before the server starts listening.
import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

async function connectDatabase() {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
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
