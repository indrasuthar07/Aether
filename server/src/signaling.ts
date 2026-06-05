import { WebSocket } from 'ws';
import { rooms, createRoom, removeRoom } from './room';

// Inline Types
export type SignalingMessageType = 
  | 'register' 
  | 'join' 
  | 'offer' 
  | 'answer' 
  | 'ice' 
  | 'not-found' 
  | 'viewer-joined' 
  | 'ready' 
  | 'peer-disconnected';

export interface SignalingMessage {
  type: SignalingMessageType;
  payload?: {
    code?: string;
    [key: string]: any;
  };
}
// Look up which room a given socket belongs to, and in which role.

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

// Safely send a JSON message over a WebSocket.
function sendMessage(ws: WebSocket, message: SignalingMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Get the peer socket for a given socket within its room.
function getPeer(ws: WebSocket): WebSocket | null {
  const result = findRoomBySocket(ws);
  if (!result || !result.room) return null;

  if (result.role === 'agent') {
    return result.room.viewerSocket;
  }
  return result.room.agentSocket;
}

// Handle an incoming WebSocket connection.
// Sets up message parsing and routing for the signaling protocol.
export function handleConnection(ws: WebSocket): void {
  console.log('[Signaling] New WebSocket connection');

  ws.on('message', (data) => {
    let message: SignalingMessage;

    try {
      message = JSON.parse(data.toString()) as SignalingMessage;
    } catch {
      console.warn('[Signaling] Failed to parse message:', data.toString().slice(0, 200));
      return;
    }

    if (!message.type) {
      console.warn('[Signaling] Message missing "type" field');
      return;
    }

    switch (message.type) {
      case 'register': {
        const code = (message.payload?.['code'] as string) ?? '';
        if (!code) {
          console.warn('[Signaling] Register message missing code');
          return;
        }
        createRoom(code, ws);
        console.log(`[Signaling] Agent registered with code "${code}"`);
        break;
      }

      case 'join': {
        const code = (message.payload?.['code'] as string) ?? '';
        if (!code) {
          console.warn('[Signaling] Join message missing code');
          return;
        }

        const room = rooms.get(code);
        if (!room) {
          sendMessage(ws, { type: 'not-found' });
          console.log(`[Signaling] Viewer tried to join non-existent room "${code}"`);
          return;
        }

        room.viewerSocket = ws;
        console.log(`[Signaling] Viewer joined room "${code}"`);

        // Notify agent that a viewer has joined
        sendMessage(room.agentSocket, { type: 'viewer-joined' });

        // Notify viewer that the room is ready
        sendMessage(ws, { type: 'ready' });
        break;
      }

      case 'offer':
      case 'answer':
      case 'ice': {
        const peer = getPeer(ws);
        if (peer) {
          sendMessage(peer, message);
        } else {
          console.warn(`[Signaling] No peer found for ${message.type} relay`);
        }
        break;
      }

      default:
        console.warn(`[Signaling] Unknown message type: "${message.type}"`);
    }
  });

  ws.on('close', () => {
    console.log('[Signaling] WebSocket connection closed');

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

    // If the agent disconnects, tear down the whole room.
    // If only the viewer disconnects, clear the viewer slot so a new viewer can join.
    if (role === 'agent') {
      removeRoom(code);
      console.log(`[Signaling] Agent disconnected, room "${code}" removed`);
    } else {
      room.viewerSocket = null;
      console.log(`[Signaling] Viewer disconnected from room "${code}"`);
    }
  });

  ws.on('error', (err) => {
    console.error('[Signaling] WebSocket error:', err.message);
  });
}
