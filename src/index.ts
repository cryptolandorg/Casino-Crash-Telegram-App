import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./config.js";
import { WebSocketController } from "./controllers/websocketController.js";
import { GameService } from "./services/gameService.js";
import type { AuthenticatedWebSocket, WsMessage } from "./types.js";

const prisma = new PrismaClient();
const redis = new Redis(config.REDIS_URL);
const pub = new Redis(config.REDIS_URL);
const sub = new Redis(config.REDIS_URL);

const gameService = new GameService(prisma, pub);
const wsController = new WebSocketController(prisma, pub, gameService);

const wss = new WebSocketServer({ port: config.WS_PORT });

sub.subscribe(config.LOBBY_CHANNEL, config.CHAT_CHANNEL);
sub.on("message", (channel: string, message: string) => {
  console.log(`Redis message on ${channel}:`, message);
  const data = JSON.parse(message) as Record<string, unknown>;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ channel, ...data }));
    }
  });
});

wss.on("connection", (ws) => {
  const socket = ws as AuthenticatedWebSocket;
  console.log("New WebSocket connection");
  socket.isAlive = true;

  wsController.sendSync(socket);

  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("message", async (msg) => {
    let data: WsMessage;
    try {
      data = JSON.parse(msg.toString()) as WsMessage;
    } catch {
      socket.send(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    switch (data.type) {
      case "auth":
        await wsController.handleAuth(socket, data);
        break;
      case "chat-message":
        await wsController.handleChatMessage(socket, data);
        break;
      case "bet":
        await wsController.handleBet(socket, data);
        break;
      case "cashout":
        await wsController.handleCashout(socket, data);
        break;
      case "game-event":
        socket.send(
          JSON.stringify({ error: "Phase control is server-only" })
        );
        break;
      default:
        socket.send(JSON.stringify({ error: "Unknown message type" }));
    }
  });

  socket.on("close", () => {
    console.log("WebSocket connection closed for user:", socket.user?.username);
  });
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    const socket = ws as AuthenticatedWebSocket;
    if (!socket.isAlive) return socket.terminate();
    socket.isAlive = false;
    socket.ping();
  });
}, 30_000);

setInterval(() => {
  if (!gameService.getCurrentGame() && !gameService.gameTimer) {
    void gameService.startNewGame();
  }
}, config.GAME_CHECK_INTERVAL);

setTimeout(() => {
  void gameService.startNewGame();
}, 2000);

async function shutdown(): Promise<void> {
  console.log("Shutting down...");
  await prisma.$disconnect();
  await redis.quit();
  await pub.quit();
  await sub.quit();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});

console.log(`WebSocket server started on ws://0.0.0.0:${config.WS_PORT}`);
console.log("Redis connected:", redis.status);
console.log("Prisma connected");
console.log("BOT_TOKEN loaded:", config.BOT_TOKEN ? "YES" : "NO");
console.log("ADMIN_BOT_TOKEN loaded:", config.ADMIN_BOT_TOKEN ? "YES" : "NO");
