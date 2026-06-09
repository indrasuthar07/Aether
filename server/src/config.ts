import dotenv from 'dotenv';
import type { LogLevel } from './logger';

dotenv.config();

// Type definitions 

export interface AppConfig {
  PORT: number;
  MONGO_URI: string;
  ALLOWED_ORIGINS: string[];
  LOG_LEVEL: LogLevel;
  // Room lifecycle
  ROOM_TTL_MS: number;
  // Security — connection limits
  MAX_ROOMS: number;
  MAX_CONNECTIONS_PER_IP: number;
  MAX_GLOBAL_CONNECTIONS: number;
  MAX_PAYLOAD_BYTES: number;
  // Security — rate limiting (per window)
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_CONNECTIONS: number;
  RATE_LIMIT_MAX_REGISTERS: number;
  RATE_LIMIT_MAX_JOINS: number;
}

// Helpers 

function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw || raw.trim() === '') {
    return ['http://useaether.vercel.app'];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseIntSafe(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

const VALID_LOG_LEVELS = new Set<string>(['debug', 'info', 'warn', 'error']);

function parseLogLevel(raw: string | undefined): LogLevel {
  const level = raw?.toLowerCase();
  if (level && VALID_LOG_LEVELS.has(level)) {
    return level as LogLevel;
  }
  return 'info';
}

// Exported config singleton 
export const config: AppConfig = {
  PORT: parseIntSafe(process.env['PORT'], 3001),
  LOG_LEVEL: parseLogLevel(process.env['LOG_LEVEL']),
  // Database — only connects if explicitly provided
  MONGO_URI: process.env['MONGO_URI'] ?? '',

  ALLOWED_ORIGINS: parseAllowedOrigins(process.env['ALLOWED_ORIGINS']),

  // Room lifecycle
  ROOM_TTL_MS: parseIntSafe(process.env['ROOM_TTL_MS'], 300_000), // 5 minutes

  // Connection limits
  MAX_ROOMS: parseIntSafe(process.env['MAX_ROOMS'], 500),
  MAX_CONNECTIONS_PER_IP: parseIntSafe(process.env['MAX_CONNECTIONS_PER_IP'], 10),
  MAX_GLOBAL_CONNECTIONS: parseIntSafe(process.env['MAX_GLOBAL_CONNECTIONS'], 500),
  MAX_PAYLOAD_BYTES: parseIntSafe(process.env['MAX_PAYLOAD_BYTES'], 65_536), // 64 KB

  // Rate limiting — defaults to 1-minute windows
  RATE_LIMIT_WINDOW_MS: parseIntSafe(process.env['RATE_LIMIT_WINDOW_MS'], 60_000),
  RATE_LIMIT_MAX_CONNECTIONS: parseIntSafe(process.env['RATE_LIMIT_MAX_CONNECTIONS'], 20),
  RATE_LIMIT_MAX_REGISTERS: parseIntSafe(process.env['RATE_LIMIT_MAX_REGISTERS'], 5),
  RATE_LIMIT_MAX_JOINS: parseIntSafe(process.env['RATE_LIMIT_MAX_JOINS'], 15),
};

// Startup validation 
export function validateConfig(cfg: AppConfig): void {
  const errors: string[] = [];

  if (cfg.PORT < 1 || cfg.PORT > 65535) {
    errors.push(`PORT must be between 1 and 65535 (got ${cfg.PORT})`);
  }
  if (cfg.ROOM_TTL_MS < 10_000) {
    errors.push(`ROOM_TTL_MS must be >= 10000ms (got ${cfg.ROOM_TTL_MS})`);
  }

  if (cfg.MAX_ROOMS < 1) {
    errors.push(`MAX_ROOMS must be >= 1 (got ${cfg.MAX_ROOMS})`);
  }

  if (cfg.MAX_PAYLOAD_BYTES < 1024) {
    errors.push(`MAX_PAYLOAD_BYTES must be >= 1024 (got ${cfg.MAX_PAYLOAD_BYTES})`);
  }

  if (cfg.MAX_CONNECTIONS_PER_IP < 1) {
    errors.push(`MAX_CONNECTIONS_PER_IP must be >= 1 (got ${cfg.MAX_CONNECTIONS_PER_IP})`);
  }

  if (cfg.MAX_GLOBAL_CONNECTIONS < 1) {
    errors.push(`MAX_GLOBAL_CONNECTIONS must be >= 1 (got ${cfg.MAX_GLOBAL_CONNECTIONS})`);
  }

  if (cfg.RATE_LIMIT_WINDOW_MS < 1000) {
    errors.push(`RATE_LIMIT_WINDOW_MS must be >= 1000 (got ${cfg.RATE_LIMIT_WINDOW_MS})`);
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid server configuration:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }
}
