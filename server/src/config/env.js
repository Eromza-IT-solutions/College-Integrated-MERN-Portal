// Reads .env and stops the server early, with a clear message, if something is missing.
import 'dotenv/config';

const required = process.env.NODE_ENV === 'test' ? [] : ['MONGODB_URI', 'SESSION_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

export default {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI,
  sessionSecret: process.env.SESSION_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
