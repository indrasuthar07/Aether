import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL: string = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
type MessageHandler = (message: SignalingMessage) => void;

interface UseSignalingReturn {
  send: (type: MessageType, payload?: Record<string, unknown>) => void;
  lastMessage: SignalingMessage | null;
  readyState: number;
  ws: WebSocket | null;
}
type MessageType =
  | 'register'
  | 'join'
  | 'viewer-joined'
  | 'ready'
  | 'not-found'
  | 'offer'
  | 'answer'
  | 'ice'
  | 'peer-disconnected';

interface SignalingMessage {
  type: MessageType;
  payload?: Record<string, unknown>;
}

export function useSignaling(onMessage?: MessageHandler): UseSignalingReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef<MessageHandler | undefined>(onMessage);
  const [lastMessage, setLastMessage] = useState<SignalingMessage | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);

  // Keep the callback ref up to date without triggering reconnect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      setReadyState(WebSocket.OPEN);
    });

    ws.addEventListener('close', () => {
      setReadyState(WebSocket.CLOSED);
    });

    ws.addEventListener('error', () => {
      setReadyState(WebSocket.CLOSED);
    });

    ws.addEventListener('message', (event: MessageEvent) => {
      try {
        const data = JSON.parse(String(event.data)) as SignalingMessage;
        setLastMessage(data);
        onMessageRef.current?.(data);
      } catch {
        // Ignore malformed messages
      }
    });

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  const send = useCallback((type: MessageType, payload?: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message: SignalingMessage = { type, payload };
      ws.send(JSON.stringify(message));
    }
  }, []);

  return {
    send,
    lastMessage,
    readyState,
    ws: wsRef.current
  };
}
