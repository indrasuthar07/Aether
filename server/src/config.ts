import dotenv from 'dotenv';

dotenv.config();

// ── Type definitions ────────────────────────────────────────────

export interface AppConfig {
  PORT: number;
  MONGO_URI: string;
  ALLOWED_ORIGINS: string[];

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

// ── Helpers ─────────────────────────────────────────────────────

function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw || raw.trim() === '') {
    return ['http://localhost:5173'];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Safe integer parser that falls back to `defaultValue` when the
 * input is missing, non-numeric, zero, or negative.
 */
function parseIntSafe(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

// ── Exported config singleton ───────────────────────────────────

export const config: AppConfig = {
  PORT: parseIntSafe(process.env['PORT'], 3001),
  MONGO_URI: process.env['MONGO_URI'] ?? 'mongodb://localhost:27017/aether',
  ALLOWED_ORIGINS: parseAllowedOrigins(process.env['ALLOWED_ORIGINS']),

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
