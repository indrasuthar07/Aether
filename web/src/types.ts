// Signaling types 
export type MessageType =
  | 'register'
  | 'join'
  | 'viewer-joined'
  | 'ready'
  | 'not-found'
  | 'offer'
  | 'answer'
  | 'ice'
  | 'peer-disconnected'
  | 'error';

export interface SignalingMessage {
  type: MessageType;
  payload?: Record<string, unknown>;
}

export type SignalingSend = (type: MessageType, payload?: Record<string, unknown>) => void;
export type MessageHandler = (message: SignalingMessage) => void;

// WebRTC config 
const envIceServers = import.meta.env.VITE_ICE_SERVERS;

function parseIceServers(): RTCIceServer[] {
  if (envIceServers) {
    try {
      const parsed = JSON.parse(envIceServers) as RTCIceServer[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Fall through to defaults
    }
  }
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
}

export const ICE_SERVERS: RTCIceServer[] = parseIceServers();

export const WS_URL: string = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

// Validation 
const SESSION_CODE_REGEX = /^\d{6}$/;

export function isValidSessionCode(code: unknown): code is string {
  return typeof code === 'string' && SESSION_CODE_REGEX.test(code);
}
