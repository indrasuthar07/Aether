import { WebSocket } from 'ws';
import { rooms, createRoom, removeRoom } from './room';
import { isValidSessionCode, sanitizePayload, RELAY_SCHEMAS } from './validation';
import { RateLimiter } from './rate-limiter';
import { config } from './config';

// ── Types ───────────────────────────────────────────────────────

export type SignalingMessageType =
  | 'register'
  | 'join'
  | 'offer'
  | 'answer'
  | 'ice'
  | 'not-found'
  | 'viewer-joined'
  | 'ready'
  | 'peer-disconnected'
  | 'error';

export interface SignalingMessage {
  type: SignalingMessageType;
  payload?: {
    code?: string;
    [key: string]: unknown;
  };
}

// ── Per-action rate limiters ────────────────────────────────────
// Separate limiters for register and join so they can't starve each other.

const registerLimiter = new RateLimiter(
  config.RATE_LIMIT_WINDOW_MS,
  config.RATE_LIMIT_MAX_REGISTERS,
);

const joinLimiter = new RateLimiter(
  config.RATE_LIMIT_WINDOW_MS,
  config.RATE_LIMIT_MAX_JOINS,
);

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Look up which room a given socket belongs to, and in which role.
 *
 * NOTE: This is an O(n) scan. It will be replaced with a reverse
 * index (socket → room) in the Performance batch (Batch 3).
 */
function findRoomBySocket(ws: WebSocket): { room: ReturnType<typeof rooms.get>; role: 'agent' | 'viewer' } | null {
  for (const room of rooms.values()) {
    if (room.agentSocket === ws) {
      return { room, role: 'agent' };
    }
    if (room.viewerSocket === ws) {
      return { room, role: 'viewer' };
    }
  }
  return null;
}

/** Send a typed JSON message to a WebSocket if it's still open. */
function sendMessage(ws: WebSocket, message: SignalingMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/** Convenience — send a structured error back to the client. */
function sendError(ws: WebSocket, message: string): void {
  sendMessage(ws, { type: 'error', payload: { message } });
}

/** Get the peer socket (agent ↔ viewer) within the same room. */
function getPeer(ws: WebSocket): WebSocket | null {
  const result = findRoomBySocket(ws);
  if (!result || !result.room) return null;

  if (result.role === 'agent') {
    return result.room.viewerSocket;
  }
  return result.room.agentSocket;
}

// ── Connection handler ──────────────────────────────────────────

/**
 * Handle an incoming WebSocket connection.
 *
 * @param ws  The connected WebSocket.
 * @param ip  The resolved client IP (passed from index.ts after
 *            connection-level security gates have been cleared).
 */
export function handleConnection(ws: WebSocket, ip: string): void {
  console.log(`[Signaling] New WebSocket connection from ${ip}`);

  ws.on('message', (data) => {
    // ── Parse ────────────────────────────────────────────────
    let message: SignalingMessage;

    try {
      const raw = data.toString();

      // Defense-in-depth size check (maxPayload already limits at
      // the transport level, but this catches edge cases)
      if (raw.length > config.MAX_PAYLOAD_BYTES) {
        sendError(ws, 'Message too large');
        return;
      }

      message = JSON.parse(raw) as SignalingMessage;
    } catch {
      console.warn(`[Signaling] Malformed message from ${ip}`);
      sendError(ws, 'Malformed message');
      return;
    }

    // ── Type guard ───────────────────────────────────────────
    if (!message.type || typeof message.type !== 'string') {
      sendError(ws, 'Missing or invalid message type');
      return;
    }

    // ── Route ────────────────────────────────────────────────
    switch (message.type) {
      // ─── REGISTER (agent creates a room) ───────────────────
      case 'register': {
        const code = message.payload?.['code'];

        if (!isValidSessionCode(code)) {
          sendError(ws, 'Invalid session code: must be exactly 6 digits');
          return;
        }

        if (registerLimiter.isRateLimited(ip)) {
          sendError(ws, 'Rate limit exceeded for room registration');
          return;
        }

        if (rooms.size >= config.MAX_ROOMS) {
          sendError(ws, 'Server capacity reached. Try again later.');
          return;
        }

        createRoom(code, ws);
        console.log(`[Signaling] Agent registered room "${code}" from ${ip}`);
        break;
      }

      // ─── JOIN (viewer connects to a room) ──────────────────
      case 'join': {
        const code = message.payload?.['code'];

        if (!isValidSessionCode(code)) {
          sendError(ws, 'Invalid session code: must be exactly 6 digits');
          return;
        }

        if (joinLimiter.isRateLimited(ip)) {
          sendError(ws, 'Too many join attempts. Please wait and try again.');
          return;
        }

        const room = rooms.get(code);
        if (!room) {
          sendMessage(ws, { type: 'not-found' });
          console.log(`[Signaling] Viewer from ${ip} tried non-existent room "${code}"`);
          return;
        }

        room.viewerSocket = ws;
        console.log(`[Signaling] Viewer from ${ip} joined room "${code}"`);

        // Notify agent that a viewer has joined
        sendMessage(room.agentSocket, { type: 'viewer-joined' });

        // Notify viewer that the room is ready
        sendMessage(ws, { type: 'ready' });
        break;
      }

      // ─── RELAY (offer / answer / ice) ──────────────────────
      case 'offer':
      case 'answer':
      case 'ice': {
        const schema = RELAY_SCHEMAS[message.type];
        if (!schema) {
          // This should never happen given the switch cases, but
          // guards against future schema omissions.
          sendError(ws, 'Unknown relay type');
          return;
        }

        const sanitizedPayload = sanitizePayload(message.payload, schema);
        if (!sanitizedPayload) {
          console.warn(`[Signaling] Rejected oversized/invalid ${message.type} from ${ip}`);
          sendError(ws, `Invalid or oversized ${message.type} payload`);
          return;
        }

        const peer = getPeer(ws);
        if (peer) {
          // Forward the sanitized (whitelist-filtered) payload only
          sendMessage(peer, { type: message.type, payload: sanitizedPayload });
        } else {
          console.warn(`[Signaling] No peer found for ${message.type} relay from ${ip}`);
        }
        break;
      }

      // ─── UNKNOWN ───────────────────────────────────────────
      default:
        console.warn(`[Signaling] Unknown message type "${message.type}" from ${ip}`);
        sendError(ws, `Unknown message type: ${message.type}`);
    }
  });

  // ── Socket lifecycle ───────────────────────────────────────────

  ws.on('close', () => {
    console.log(`[Signaling] WebSocket closed for ${ip}`);

    const result = findRoomBySocket(ws);
    if (!result || !result.room) return;

    const { room, role } = result;
    const code = room.code;

    // Notify the remaining peer
    if (role === 'agent') {
      if (room.viewerSocket) {
        sendMessage(room.viewerSocket, { type: 'peer-disconnected' });
      }
    } else {
      sendMessage(room.agentSocket, { type: 'peer-disconnected' });
    }

    // Agent disconnect → destroy the room entirely.
    // Viewer disconnect → clear the slot so a new viewer can join.
    if (role === 'agent') {
      removeRoom(code);
      console.log(`[Signaling] Agent disconnected, room "${code}" removed`);
    } else {
      room.viewerSocket = null;
      console.log(`[Signaling] Viewer disconnected from room "${code}"`);
    }
  });

  ws.on('error', (err) => {
    console.error(`[Signaling] WebSocket error from ${ip}: ${err.message}`);
  });
}
