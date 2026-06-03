import WebSocket from 'ws';
import * as logger from './logger';

export interface SignalingMessage {
  type: string;
  payload: Record<string, unknown>;
}

type MessageHandler = (message: SignalingMessage) => void;

export interface SignalingClient {
  send: (type: string, payload?: Record<string, unknown>) => void;
  onMessage: (callback: MessageHandler) => void;
  close: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

export function connectSignaling(): Promise<SignalingClient> {
  const serverUrl = process.env['SERVER_URL'] || 'ws://localhost:3001';

  let ws: WebSocket;
  let messageHandlers: MessageHandler[] = [];
  let reconnectAttempts = 0;
  let intentionallyClosed = false;
  let pendingMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];

  function send(type: string, payload: Record<string, unknown> = {}): void {
    const message = JSON.stringify({ type, payload });
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    } else {
      pendingMessages.push({ type, payload });
    }
  }

  function onMessage(callback: MessageHandler): void {
    messageHandlers.push(callback);
  }

  function close(): void {
    intentionallyClosed = true;
    messageHandlers = [];
    pendingMessages = [];
    if (ws) {
      ws.close();
    }
  }

  function flushPending(): void {
    const queued = [...pendingMessages];
    pendingMessages = [];
    for (const msg of queued) {
      send(msg.type, msg.payload);
    }
  }

  function handleMessage(raw: WebSocket.Data): void {
    try {
      const data = JSON.parse(raw.toString()) as SignalingMessage;
      for (const handler of messageHandlers) {
        handler(data);
      }
    } catch {
      logger.warn('Received malformed message from signaling server');
    }
  }

  function attemptReconnect(): void {
    if (intentionallyClosed) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error(`Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
      process.exit(1);
      return;
    }

    const delay = BASE_DELAY_MS * Math.pow(2, reconnectAttempts);
    reconnectAttempts++;
    logger.warn(`Connection lost. Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    setTimeout(() => {
      if (intentionallyClosed) return;
      createSocket();
    }, delay);
  }

  function createSocket(): void {
    ws = new WebSocket(serverUrl);

    ws.on('open', () => {
      reconnectAttempts = 0;
      flushPending();
    });

    ws.on('message', handleMessage);

    ws.on('close', () => {
      if (!intentionallyClosed) {
        attemptReconnect();
      }
    });

    ws.on('error', (err: Error) => {
      logger.error(`Signaling connection error: ${err.message}`);
    });
  }

  return new Promise<SignalingClient>((resolve, reject) => {
    ws = new WebSocket(serverUrl);

    const connectionTimeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Connection to signaling server timed out: ${serverUrl}`));
    }, 10000);

    ws.on('open', () => {
      clearTimeout(connectionTimeout);
      reconnectAttempts = 0;
      flushPending();
      resolve({ send, onMessage, close });
    });

    ws.on('message', handleMessage);

    ws.on('close', () => {
      if (!intentionallyClosed) {
        attemptReconnect();
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(connectionTimeout);
      if (reconnectAttempts === 0 && !intentionallyClosed) {
        reject(new Error(`Failed to connect to signaling server at ${serverUrl}: ${err.message}`));
      }
    });
  });
}
