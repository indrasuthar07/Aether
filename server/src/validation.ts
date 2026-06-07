const SESSION_CODE_REGEX = /^\d{6}$/;

export function isValidSessionCode(code: unknown): code is string {
  return typeof code === 'string' && SESSION_CODE_REGEX.test(code);
}

// Payload sanitization 

export interface SanitizeOptions {
  allowedKeys: string[];
  maxSizeBytes: number;
}

export function sanitizePayload(
  payload: Record<string, unknown> | undefined,
  options: SanitizeOptions,
): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const sanitized: Record<string, unknown> = {};
  for (const key of options.allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      sanitized[key] = payload[key];
    }
  }

  // Size gate — prevents multi-megabyte SDP/ICE injection
  let serialized: string;
  try {
    serialized = JSON.stringify(sanitized);
  } catch {
    return null;
  }

  if (serialized.length > options.maxSizeBytes) {
    return null;
  }

  return sanitized;
}

// Relay schemas 

export const RELAY_SCHEMAS: Record<string, SanitizeOptions> = {
  offer: {
    allowedKeys: ['code', 'offer'],
    maxSizeBytes: 32_768, // 32 KB — generous for SDP
  },
  answer: {
    allowedKeys: ['code', 'answer'],
    maxSizeBytes: 32_768,
  },
  ice: {
    allowedKeys: ['code', 'candidate'],
    maxSizeBytes: 4_096, // 4 KB — a single ICE candidate is ~200 bytes
  },
};
