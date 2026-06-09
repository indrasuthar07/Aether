export interface AgentConfig {
  SERVER_URL: string;
  WEB_URL: string;
  ICE_SERVERS: Array<{ urls: string; username?: string; credential?: string }>;
  MAX_INPUT_SIZE: number;
  MAX_COLS: number;
  MAX_ROWS: number;
  // Signaling resilience
  MAX_RECONNECT_ATTEMPTS: number;
  RECONNECT_BASE_DELAY_MS: number;
  CONNECTION_TIMEOUT_MS: number;
}

// Helpers 

function parseIntSafe(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

function parseIceServers(raw: string | undefined): AgentConfig['ICE_SERVERS'] {
  if (!raw) {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
  }
  try {
    const parsed = JSON.parse(raw) as AgentConfig['ICE_SERVERS'];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall through to defaults
  }
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
}

// Exported config singleton 
export const config: AgentConfig = {
  SERVER_URL: process.env['SERVER_URL'] || 'wss://aether-d8tj.onrender.com',
  WEB_URL: process.env['WEB_URL'] || 'https://useaether.vercel.app',
  ICE_SERVERS: parseIceServers(process.env['ICE_SERVERS']),

  MAX_INPUT_SIZE: parseIntSafe(process.env['MAX_INPUT_SIZE'], 4096),
  MAX_COLS: parseIntSafe(process.env['MAX_COLS'], 500),
  MAX_ROWS: parseIntSafe(process.env['MAX_ROWS'], 200),

  MAX_RECONNECT_ATTEMPTS: parseIntSafe(process.env['MAX_RECONNECT_ATTEMPTS'], 3),
  RECONNECT_BASE_DELAY_MS: parseIntSafe(process.env['RECONNECT_BASE_DELAY_MS'], 1000),
  CONNECTION_TIMEOUT_MS: parseIntSafe(process.env['CONNECTION_TIMEOUT_MS'], 10000),
};
