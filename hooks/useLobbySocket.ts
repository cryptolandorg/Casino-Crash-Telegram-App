import { useCallback, useEffect, useRef, useState } from 'react';

export interface LobbyEvent {
  type: string;
  [key: string]: any;
}

export interface ChatMessage {
  userId: string;
  username: string;
  avatarUrl?: string;
  message: string;
  createdAt: number;
}

export function useLobbySocket({ initData }: { initData: string }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [lobbyEvents, setLobbyEvents] = useState<LobbyEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sessionHistory, setSessionHistory] = useState<Array<{ multiplier: number; timestamp: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initData) return;
    // Закрываем старый ws если был
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || `ws://${window.location.hostname}:4001`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      ws.send(JSON.stringify({ type: 'auth', initData }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
      if (data.type === 'auth-success') {
          setUser(data.user);
          setConnected(true);
          setError(null);
        } else if (data.type === 'session-history') {
          setSessionHistory(data.history || []);
        } else if (data.type === 'balance-update') {
          setLobbyEvents((prev) => [...prev.slice(-99), data]);
        } else if (data.type === 'chat-message') {
          setChatMessages((prev) => [...prev.slice(-99), data]);
        } else if (data.error) {
          setError(data.error);
      } else {
          setLobbyEvents((prev) => [...prev.slice(-99), data]);
        }
      } catch (e) {
        setError('Ошибка парсинга сообщения');
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setUser(null);
    };

    ws.onerror = (e) => {
      setConnected(false);
      setError('WebSocket error');
    };

    return () => {
      ws.close();
    };
  }, [initData]);

  // Отправка сообщения в чат
  const sendChat = useCallback((message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'chat-message', message }));
  }, []);

  // Отправка ставки
  const sendBet = useCallback((bet: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'bet', bet }));
  }, []);

  // Отправка cashout
  const sendCashout = useCallback((betAmount: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'cashout', betAmount }));
  }, []);

  // Прочие события (старт, краш и т.д.)
  const sendGameEvent = useCallback((event: LobbyEvent) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify(event));
  }, []);

  return {
    connected,
    error,
    user,
    lobbyEvents,
    chatMessages,
    sessionHistory,
    sendChat,
    sendBet,
    sendCashout,
    sendGameEvent,
  };
} 