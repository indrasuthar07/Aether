import mongoose from 'mongoose';
import { config } from './config';
import { createLogger } from './logger';
const log = createLogger('db');

 // Connect to MongoDB. If the connection fails or MONGO_URI is not
 // configured, the server continues running without database
 // functionality.
export async function connectDatabase(): Promise<void> {
  const uri = config.MONGO_URI;

  if (!uri) {
    log.warn('MONGO_URI is not set — running without database');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    log.info('Connected to MongoDB');

    mongoose.connection.on('error', (err) => {
      log.error('MongoDB connection error', { error: err instanceof Error ? err : new Error(String(err)) });
    });

    mongoose.connection.on('disconnected', () => {
      log.warn('MongoDB disconnected');
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log.warn('Failed to connect to MongoDB — server will continue without database', { error });
  }
}
