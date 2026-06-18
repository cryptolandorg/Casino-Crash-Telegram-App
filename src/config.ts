import "dotenv/config";

export interface CrashChance {
  range: [number, number];
  chance: number;
}

export const config = {
  WS_PORT: Number(process.env.WS_PORT) || 4001,

  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_BOT_TOKEN: process.env.ADMIN_BOT_TOKEN,

  BET_DURATION: 15_000,
  FLIGHT_DURATION: 20_000,
  GAME_RESTART_DELAY: 3_000,
  GAME_CHECK_INTERVAL: 5_000,

  LOBBY_CHANNEL: "lobby-events",
  CHAT_CHANNEL: "chat-events",

  DEFAULT_CRASH_CHANCES: [
    { range: [1.0, 1.1], chance: 0.15 },
    { range: [1.1, 1.25], chance: 0.25 },
    { range: [1.25, 1.5], chance: 0.2 },
    { range: [1.5, 2.0], chance: 0.15 },
    { range: [2.0, 3.0], chance: 0.1 },
    { range: [3.0, 5.0], chance: 0.08 },
    { range: [5.0, 10.0], chance: 0.05 },
    { range: [10.0, 50.0], chance: 0.015 },
    { range: [50.0, 100.0], chance: 0.005 },
  ] as CrashChance[],

  CHANCES_CACHE_DURATION: 20_000,
} as const;
