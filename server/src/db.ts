import mongoose from 'mongoose';
import { config } from './config.js';


 // Connect to MongoDB. If the connection fails or MONGO_URI is not configured,
 // the server continues running without database functionality.
 
export async function connectDatabase(): Promise<void> {
  const uri = config.MONGO_URI;

  if (!uri) {
    console.warn('[DB] MONGO_URI is not set — running without database');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[DB] Connected to MongoDB');

    mongoose.connection.on('error', (err) => {
      console.error('[DB] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB disconnected');
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[DB] Failed to connect to MongoDB: ${errorMessage}`);
    console.warn('[DB] Server will continue without database');
  }
}
