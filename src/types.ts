import type WebSocket from "ws";

export interface AuthUser {
  id: string;
  telegramId: string;
  username: string;
  avatarUrl: string | null;
  balance: number;
}

export interface ClientBet {
  bet: number;
  clientBetId?: string;
  timestamp: number;
}

export interface UserBets {
  userId: string;
  username: string;
  totalBet: number;
  bets: ClientBet[];
  timestamp: number;
}

export interface CurrentGame {
  sessionId: string;
  seed: number;
  crashPoint: number | null;
  crashTime: number | null;
  startTime: number;
  betEndTime: number;
  duration: number;
  bets: Map<string, UserBets>;
  phase: "betting" | "flying" | "crashed";
}

export interface SessionHistoryEntry {
  multiplier: number;
  timestamp: number;
}

export interface AuthenticatedWebSocket extends WebSocket {
  isAlive?: boolean;
  user?: AuthUser;
}

export interface WsMessage {
  type: string;
  initData?: string;
  message?: string;
  bet?: number;
  clientBetId?: string;
}
