import { WebSocket } from 'ws';

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
      console.log(`[Room] TTL expired for room "${this.code}", closing`);
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
    console.log(`[Room] Room "${this.code}" closed and removed`);
  }
}

// In-memory room store keyed by share code 
export const rooms = new Map<string, Room>();

// Create a new room with the given share code and agent WebSocket
// If a room with this code already exists, the old one is closed first.
 
export function createRoom(code: string, agentSocket: WebSocket): Room {
  const existing = rooms.get(code);
  if (existing) {
    console.log(`[Room] Replacing existing room for code "${code}"`);
    existing.close();
  }

  const room = new Room(code, agentSocket);
  rooms.set(code, room);
  console.log(`[Room] Created room "${code}" (active rooms: ${rooms.size})`);
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
