import { WebSocket } from 'ws';
import {
  rooms,
  createRoom,
  removeRoom,
  findRoomBySocket,
  setRoomViewer,
  clearRoomViewer,
  refreshRoomTTL,
} from './room';
import { isValidSessionCode, sanitizePayload, RELAY_SCHEMAS } from './validation';
import { RateLimiter } from './rate-limiter';
import { config } from './config';
import { createLogger } from './logger';

const log = createLogger('signaling');

// Types 
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

// Per-action rate limiters 
const registerLimiter = new RateLimiter(
  config.RATE_LIMIT_WINDOW_MS,
  config.RATE_LIMIT_MAX_REGISTERS,
);

const joinLimiter = new RateLimiter(
  config.RATE_LIMIT_WINDOW_MS,
  config.RATE_LIMIT_MAX_JOINS,
);

// Helpers 
function sendMessage(ws: WebSocket, message: SignalingMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, message: string): void {
  sendMessage(ws, { type: 'error', payload: { message } });
}

// Connection handler 
export function handleConnection(ws: WebSocket, ip: string): void {
  log.info('New connection', { ip });

  ws.on('message', (data) => {
    // Parse 
    let message: SignalingMessage;

    try {
      const raw = data.toString();

      // Defense-in-depth size check (maxPayload already limits at
      // the transport level, but this catches edge cases)
      if (raw.length > config.MAX_PAYLOAD_BYTES) {
        log.warn('Oversized message rejected', { ip, size: raw.length });
        sendError(ws, 'Message too large');
        return;
      }

      message = JSON.parse(raw) as SignalingMessage;
    } catch {
      log.warn('Malformed message', { ip });
      sendError(ws, 'Malformed message');
      return;
    }

    // Type guard 
    if (!message.type || typeof message.type !== 'string') {
      log.warn('Message missing type field', { ip });
      sendError(ws, 'Missing or invalid message type');
      return;
    }

    // Route 
    switch (message.type) {
      // REGISTER (agent creates a room) 
      case 'register': {
        const code = message.payload?.['code'];

        if (!isValidSessionCode(code)) {
          log.warn('Invalid session code on register', { ip, rawCode: String(message.payload?.['code']).slice(0, 20) });
          sendError(ws, 'Invalid session code: must be exactly 6 digits');
          return;
        }

        if (registerLimiter.isRateLimited(ip)) {
          log.warn('Rate limit exceeded for register', { ip });
          sendError(ws, 'Rate limit exceeded for room registration');
          return;
        }

        if (rooms.size >= config.MAX_ROOMS) {
          log.warn('Global room cap reached', { ip, activeRooms: rooms.size, maxRooms: config.MAX_ROOMS });
          sendError(ws, 'Server capacity reached. Try again later.');
          return;
        }

        createRoom(code, ws);
        log.info('Agent registered room', { code, ip });
        break;
      }

      // JOIN (viewer connects to a room) 
      case 'join': {
        const code = message.payload?.['code'];

        if (!isValidSessionCode(code)) {
          log.warn('Invalid session code on join', { ip, rawCode: String(message.payload?.['code']).slice(0, 20) });
          sendError(ws, 'Invalid session code: must be exactly 6 digits');
          return;
        }

        if (joinLimiter.isRateLimited(ip)) {
          log.warn('Rate limit exceeded for join', { ip });
          sendError(ws, 'Too many join attempts. Please wait and try again.');
          return;
        }

        const room = rooms.get(code);
        if (!room) {
          sendMessage(ws, { type: 'not-found' });
          log.info('Join attempt for non-existent room', { code, ip });
          return;
        }

        // Register viewer via room module (handles socket index + TTL refresh)
        setRoomViewer(code, ws);
        log.info('Viewer joined room', { code, ip });

        // Notify agent that a viewer has joined
        sendMessage(room.agentSocket, { type: 'viewer-joined' });

        // Notify viewer that the room is ready
        sendMessage(ws, { type: 'ready' });
        break;
      }

      // RELAY (offer / answer / ice) 
      case 'offer':
      case 'answer':
      case 'ice': {
        const schema = RELAY_SCHEMAS[message.type];
        if (!schema) {
          sendError(ws, 'Unknown relay type');
          return;
        }

        const sanitizedPayload = sanitizePayload(message.payload, schema);
        if (!sanitizedPayload) {
          log.warn('Rejected invalid relay payload', { ip, type: message.type });
          sendError(ws, `Invalid or oversized ${message.type} payload`);
          return;
        }

        // O(1) lookup via socket reverse index
        const result = findRoomBySocket(ws);
        if (!result) {
          log.warn('No room found for relay', { ip, type: message.type });
          return;
        }

        const peer = result.role === 'agent'
          ? result.room.viewerSocket
          : result.room.agentSocket;

        if (peer) {
          sendMessage(peer, { type: message.type, payload: sanitizedPayload });
          refreshRoomTTL(result.room.code);
          log.debug('Relayed message', { ip, type: message.type, code: result.room.code });
        } else {
          log.warn('No peer found for relay', { ip, type: message.type, code: result.room.code });
        }
        break;
      }

      // UNKNOWN 
      default:
        log.warn('Unknown message type', { ip, type: message.type });
        sendError(ws, `Unknown message type: ${message.type}`);
    }
  });

  // Socket lifecycle 

  ws.on('close', () => {
    log.debug('WebSocket closed', { ip });

    const result = findRoomBySocket(ws);
    if (!result) return;

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
      log.info('Agent disconnected, room removed', { code, ip });
    } else {
      clearRoomViewer(code);
      log.info('Viewer disconnected from room', { code, ip });
    }
  });

  ws.on('error', (err) => {
    log.error('WebSocket error', { ip, error: err });

    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1011, 'Internal error');
      }
    } catch {
      // Socket may already be destroyed — ignore
    }
  });
}
