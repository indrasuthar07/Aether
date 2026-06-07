// Types 
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

// Level ranking 
const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const VALID_LEVELS = new Set<string>(Object.keys(LOG_LEVEL_RANK));

function resolveMinLevel(): number {
  const raw = process.env['LOG_LEVEL']?.toLowerCase();
  if (raw && VALID_LEVELS.has(raw)) {
    return LOG_LEVEL_RANK[raw as LogLevel];
  }
  return LOG_LEVEL_RANK.info; // default
}

// Resolved once at module load — after dotenv has run (config.ts
// is always imported before any logger consumer).
const MIN_LEVEL = resolveMinLevel();

// Meta sanitization 
function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value instanceof Error) {
      result[key] = value.message;
      if (value.stack) {
        result[`${key}Stack`] = value.stack;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Formatting
function formatEntry(
  level: LogLevel,
  component: string,
  msg: string,
  meta?: Record<string, unknown>,
): string {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    component,
    msg,
  };

  if (meta) {
    Object.assign(entry, sanitizeMeta(meta));
  }

  try {
    return JSON.stringify(entry);
  } catch {
    // Fallback for circular references or exotic values
    return JSON.stringify({
      ts: entry['ts'],
      level,
      component,
      msg,
      serializationError: 'Failed to serialize log metadata',
    });
  }
}

// Factory 
export function createLogger(component: string): Logger {
  return {
    debug(msg: string, meta?: Record<string, unknown>): void {
      if (LOG_LEVEL_RANK.debug < MIN_LEVEL) return;
      process.stdout.write(formatEntry('debug', component, msg, meta) + '\n');
    },

    info(msg: string, meta?: Record<string, unknown>): void {
      if (LOG_LEVEL_RANK.info < MIN_LEVEL) return;
      process.stdout.write(formatEntry('info', component, msg, meta) + '\n');
    },

    warn(msg: string, meta?: Record<string, unknown>): void {
      if (LOG_LEVEL_RANK.warn < MIN_LEVEL) return;
      process.stderr.write(formatEntry('warn', component, msg, meta) + '\n');
    },

    error(msg: string, meta?: Record<string, unknown>): void {
      if (LOG_LEVEL_RANK.error < MIN_LEVEL) return;
      process.stderr.write(formatEntry('error', component, msg, meta) + '\n');
    },
  };
}
