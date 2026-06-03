import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  PORT: number;
  MONGO_URI: string;
  ALLOWED_ORIGINS: string[];
}

function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw || raw.trim() === '') {
    return ['http://localhost:5173'];
  }
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export const config: AppConfig = {
  PORT: parseInt(process.env['PORT'] ?? '3001', 10),
  MONGO_URI: process.env['MONGO_URI'] ?? 'mongodb://localhost:27017/aether',
  ALLOWED_ORIGINS: parseAllowedOrigins(process.env['ALLOWED_ORIGINS']),
};
