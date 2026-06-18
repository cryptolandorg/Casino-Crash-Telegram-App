import { config } from "../config.js";

export function crashChancesKey(): string {
  return "crashChances";
}

export function lobbyChannel(): string {
  return config.LOBBY_CHANNEL;
}

export function chatChannel(): string {
  return config.CHAT_CHANNEL;
}
