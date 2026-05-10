import { useEffect, useRef, useState, useCallback } from 'react';

export interface WSMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = (url?: string) => {
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const ws = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = url || `${protocol}//${host}/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => setReadyState(WebSocket.OPEN);
    ws.current.onclose = () => {
      setReadyState(WebSocket.CLOSED);
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };
    ws.current.onerror = () => setReadyState(WebSocket.CLOSED);
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return { lastMessage, readyState };
};
