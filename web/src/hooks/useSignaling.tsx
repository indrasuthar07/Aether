import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_URL } from '../types';
import type { MessageType, SignalingMessage, MessageHandler } from '../types';

interface UseSignalingReturn {
  send: (type: MessageType, payload?: Record<string, unknown>) => void;
  lastMessage: SignalingMessage | null;
  readyState: number;
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
  };
}
