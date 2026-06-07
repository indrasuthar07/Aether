/**
 * Input validation utilities for the Aether signaling server.
 *
 * Centralizes all validation logic so that every handler applies
 * identical, tested rules — no ad-hoc string checks scattered
 * across the codebase.
 */

const SESSION_CODE_REGEX = /^\d{6}$/;

/**
 * Validates that a value is a well-formed 6-digit session code.
 *
 * Rules:
 *  - Must be a string (rejects numbers, nulls, objects)
 *  - Must be exactly 6 characters
 *  - Must contain only ASCII digits 0-9
 */
export function isValidSessionCode(code: unknown): code is string {
  return typeof code === 'string' && SESSION_CODE_REGEX.test(code);
}

// ── Payload sanitization ────────────────────────────────────────

export interface SanitizeOptions {
  /** Only these top-level keys will be forwarded. Everything else is stripped. */
  allowedKeys: string[];
  /** Maximum byte size of the JSON-serialized sanitized payload. */
  maxSizeBytes: number;
}

/**
 * Whitelist-filters a payload object and enforces a size cap.
 *
 * Returns the sanitized object, or `null` if:
 *  - The payload is missing / not an object
 *  - Serialization fails (circular refs, BigInt, etc.)
 *  - The serialized size exceeds `maxSizeBytes`
 */
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

// ── Relay schemas ───────────────────────────────────────────────
// Define the exact shape and maximum size of every relay message
// type. Anything not listed here is rejected.

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
