import { WebSocket } from 'ws';
import { createLogger } from './logger';
import { config } from './config';

const log = createLogger('room');

//  Room class (decoupled from registries) 
export class Room {
  readonly code: string;
  readonly agentSocket: WebSocket;
  readonly createdAt: Date;

  viewerSocket: WebSocket | null = null;

  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly ttlMs: number;
  private onExpiredCallback: (() => void) | null = null;

  constructor(code: string, agentSocket: WebSocket, ttlMs: number) {
    this.code = code;
    this.agentSocket = agentSocket;
    this.createdAt = new Date();
    this.ttlMs = ttlMs;
    this.startTTL();
  }
  // TTL management 
  private startTTL(): void {
    this.clearTTL();
    this.cleanupTimer = setTimeout(() => {
      this.onExpiredCallback?.();
    }, this.ttlMs);
  }

  private clearTTL(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  refreshTTL(): void {
    this.startTTL();
  }

// Register a callback invoked when the TTL expires.
  onExpired(cb: () => void): void {
    this.onExpiredCallback = cb;
  }

  // Socket lifecycle 
  close(): void {
    this.clearTTL();

    if (this.agentSocket.readyState === WebSocket.OPEN) {
      this.agentSocket.close(1000, 'Room closed');
    }

    if (this.viewerSocket && this.viewerSocket.readyState === WebSocket.OPEN) {
      this.viewerSocket.close(1000, 'Room closed');
    }
  }
}

//  Registries 
export const rooms = new Map<string, Room>();

/** Reverse index: WebSocket → { code, role }.  O(1) lookups. */
interface SocketEntry {
  code: string;
  role: 'agent' | 'viewer';
}
const socketIndex = new Map<WebSocket, SocketEntry>();

// Registry management 
export function createRoom(code: string, agentSocket: WebSocket): Room {
  const existing = rooms.get(code);
  if (existing) {
    log.warn('Replacing existing room', { code });
    removeRoom(code);
  }

  const room = new Room(code, agentSocket, config.ROOM_TTL_MS);
  rooms.set(code, room);
  socketIndex.set(agentSocket, { code, role: 'agent' });

  // Wire TTL expiry to full cleanup
  room.onExpired(() => {
    log.info('Room TTL expired, closing', { code });
    removeRoom(code);
  });

  log.info('Room created', { code, activeRooms: rooms.size });
  return room;
}


// Fully tear down a room: unregister sockets, close connections,
export function removeRoom(code: string): void {
  const room = rooms.get(code);
  if (!room) return;

  // Unregister sockets from the reverse index
  socketIndex.delete(room.agentSocket);
  if (room.viewerSocket) {
    socketIndex.delete(room.viewerSocket);
  }

  // Close sockets and clear timer
  room.close();

  // Remove from primary registry
  rooms.delete(code);
  log.info('Room removed', { code, activeRooms: rooms.size });
}

/** Find a room by share code. */
export function findRoom(code: string): Room | undefined {
  return rooms.get(code);
}

// Viewer management 
export function setRoomViewer(code: string, ws: WebSocket): void {
  const room = rooms.get(code);
  if (!room) return;

  // Clean up previous viewer if present
  if (room.viewerSocket) {
    socketIndex.delete(room.viewerSocket);
  }

  room.viewerSocket = ws;
  socketIndex.set(ws, { code, role: 'viewer' });
  room.refreshTTL();
}

/** Remove the viewer from a room and unregister its socket. */
export function clearRoomViewer(code: string): void {
  const room = rooms.get(code);
  if (!room) return;

  if (room.viewerSocket) {
    socketIndex.delete(room.viewerSocket);
    room.viewerSocket = null;
  }
}

// Socket lookup (O(1)) 
export function findRoomBySocket(ws: WebSocket): { room: Room; role: 'agent' | 'viewer' } | null {
  const entry = socketIndex.get(ws);
  if (!entry) return null;

  const room = rooms.get(entry.code);
  if (!room) {
    // Stale index entry — clean it up
    socketIndex.delete(ws);
    return null;
  }

  return { room, role: entry.role };
}

// TTL refresh 
export function refreshRoomTTL(code: string): void {
  const room = rooms.get(code);
  if (room) {
    room.refreshTTL();
  }
}

// Shutdown 
export function closeAllRooms(): void {
  // Copy keys to avoid mutation during iteration
  const codes = [...rooms.keys()];
  for (const code of codes) {
    removeRoom(code);
  }
  log.info('All rooms closed');
}
