# Telegram Crash Game — WebSocket Server

TypeScript WebSocket server for a fair crash game (Aviator-style) with Telegram auth, PostgreSQL persistence, and Redis pub/sub.

## Features

- Server-authoritative game loop (betting → flying → crash)
- Telegram Web App `initData` validation
- Prisma + PostgreSQL for users, bets, sessions, chat
- Redis pub/sub for real-time lobby and chat events
- Configurable crash-point distribution via Redis key `crashChances`

## Project layout

```
src/
  config.ts              # ports, timings, default crash chances
  index.ts               # WebSocket server entry
  types.ts               # shared TypeScript types
  controllers/           # WebSocket message handlers
  services/              # game engine
  utils/                 # Telegram auth helpers
prisma/                  # schema and migrations
```

## Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
```

## Run

```bash
npm run ws        # development (tsx)
npm run build && npm start
```

## Environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BOT_TOKEN` | Telegram bot token for initData validation |
| `ADMIN_BOT_TOKEN` | Optional second bot token |
| `REDIS_URL` | Redis URL (`redis://localhost:6379`) |
| `WS_PORT` | WebSocket port (default `4001`) |
| `ALLOW_DEV_AUTH` | Set `true` only for local testing without Telegram |

## WebSocket events

**Client → server:** `auth`, `bet`, `cashout`, `chat-message`

**Server → client:** `auth-success`, `session-history`, `balance-update`, `sync`, `game-start`, `game-flying`, `game-crash`

## Security notes

The previous Next.js frontend contained hardcoded ngrok tunnel URLs in TON Connect config — removed during cleanup. Dev auth bypass now requires `ALLOW_DEV_AUTH=true`.
