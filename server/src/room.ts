import { WebSocket } from 'ws';
import { createLogger } from './logger';
const log = createLogger('room');

export class Room {
  code: string;
  agentSocket: WebSocket;
  viewerSocket: WebSocket | null = null;
  createdAt: Date;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(code: string, agentSocket: WebSocket) {
    this.code = code;
    this.agentSocket = agentSocket;
    this.createdAt = new Date();

    this.cleanupTimer = setTimeout(() => {
      log.info('Room TTL expired, closing', { code: this.code });
      this.close();
    }, Room.TTL_MS);
  }

  close(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.agentSocket.readyState === WebSocket.OPEN) {
      this.agentSocket.close(1000, 'Room closed');
    }

    if (this.viewerSocket && this.viewerSocket.readyState === WebSocket.OPEN) {
      this.viewerSocket.close(1000, 'Room closed');
    }

    rooms.delete(this.code);
    log.info('Room closed and removed', { code: this.code, activeRooms: rooms.size });
  }
}

// In-memory room store keyed by share code
export const rooms = new Map<string, Room>();

export function createRoom(code: string, agentSocket: WebSocket): Room {
  const existing = rooms.get(code);
  if (existing) {
    log.warn('Replacing existing room', { code });
    existing.close();
  }

  const room = new Room(code, agentSocket);
  rooms.set(code, room);
  log.info('Room created', { code, activeRooms: rooms.size });
  return room;
}

// Find a room by share code. 
export function findRoom(code: string): Room | undefined {
  return rooms.get(code);
}

// Remove a room by share code, closing it if still open.
export function removeRoom(code: string): void {
  const room = rooms.get(code);
  if (room) {
    room.close();
  }
}
