import WebSocket from 'ws';
import * as logger from './logger';
import { config } from './config';

// Types
export interface SignalingMessage {
  type: string;
  payload: Record<string, unknown>;
}

type MessageHandler = (message: SignalingMessage) => void;

export interface SignalingClient {
  send: (type: string, payload?: Record<string, unknown>) => void;
  onMessage: (callback: MessageHandler) => void;
  onReconnected: (callback: () => void) => void;
  onPermanentlyDisconnected: (callback: () => void) => void;
  close: () => void;
}

// Factory 
export function connectSignaling(): Promise<SignalingClient> {
  let ws: WebSocket;
  const messageHandlers: MessageHandler[] = [];
  const reconnectHandlers: Array<() => void> = [];
  const disconnectHandlers: Array<() => void> = [];
  let reconnectAttempts = 0;
  let intentionallyClosed = false;
  let pendingMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];

  // Public methods 
  function send(type: string, payload: Record<string, unknown> = {}): void {
    const message = JSON.stringify({ type, payload });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    } else {
      pendingMessages.push({ type, payload });
    }
  }

  function onMessage(callback: MessageHandler): void {
    messageHandlers.push(callback);
  }

  function onReconnected(callback: () => void): void {
    reconnectHandlers.push(callback);
  }

  function onPermanentlyDisconnected(callback: () => void): void {
    disconnectHandlers.push(callback);
  }

  function close(): void {
    intentionallyClosed = true;
    messageHandlers.length = 0;
    reconnectHandlers.length = 0;
    disconnectHandlers.length = 0;
    pendingMessages = [];
    try {
      ws?.close();
    } catch {
      // ignore
    }
  }

  // Internal helpers 
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

  function setupSocket(isReconnect: boolean): void {
    ws = new WebSocket(config.SERVER_URL);

    ws.on('open', () => {
      reconnectAttempts = 0;
      flushPending();
      if (isReconnect) {
        logger.success('Reconnected to signaling server');
        for (const cb of reconnectHandlers) cb();
      }
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

  function attemptReconnect(): void {
    if (intentionallyClosed) return;

    if (reconnectAttempts >= config.MAX_RECONNECT_ATTEMPTS) {
      logger.error(
        `Failed to reconnect after ${config.MAX_RECONNECT_ATTEMPTS} attempts`,
      );
      // Notify session instead of calling process.exit
      for (const cb of disconnectHandlers) cb();
      return;
    }

    const delay = config.RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts);
    reconnectAttempts++;
    logger.warn(
      `Connection lost. Reconnecting in ${delay}ms ` +
      `(attempt ${reconnectAttempts}/${config.MAX_RECONNECT_ATTEMPTS})...`,
    );

    setTimeout(() => {
      if (intentionallyClosed) return;
      setupSocket(true);
    }, delay);
  }

  // Initial connection 
  return new Promise<SignalingClient>((resolve, reject) => {
    const connectionTimeout = setTimeout(() => {
      intentionallyClosed = true;
      try {
        ws?.close();
      } catch {
        // ignore
      }
      reject(new Error(
        `Connection to signaling server timed out: ${config.SERVER_URL}`,
      ));
    }, config.CONNECTION_TIMEOUT_MS);

    // Use the unified setup path (not a reconnect)
    setupSocket(false);

    // Layer initial-connection-specific handlers on top
    ws.once('open', () => {
      clearTimeout(connectionTimeout);
      resolve({ send, onMessage, onReconnected, onPermanentlyDisconnected, close });
    });

    ws.once('error', (err: Error) => {
      clearTimeout(connectionTimeout);
      intentionallyClosed = true; // Prevent reconnect on initial failure
      reject(new Error(
        `Failed to connect to signaling server at ${config.SERVER_URL}: ${err.message}`,
      ));
    });
  });
}
