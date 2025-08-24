const WebSocket = require('ws');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

const config = require('./config');
const GameService = require('./services/gameService');
const WebSocketController = require('./controllers/websocketController');

// Инициализация зависимостей
const prisma = new PrismaClient();
const redis = new Redis(config.REDIS_URL);
const pub = new Redis(config.REDIS_URL);
const sub = new Redis(config.REDIS_URL);

// Создание сервисов
const gameService = new GameService(prisma, pub);
const wsController = new WebSocketController(prisma, pub, gameService);

// WebSocket сервер
const wss = new WebSocket.Server({ port: config.WS_PORT });

// Подписка на Redis pub/sub
sub.subscribe(config.LOBBY_CHANNEL, config.CHAT_CHANNEL);
sub.on('message', (channel, message) => {
  console.log(`Redis message on ${channel}:`, message);
  const data = JSON.parse(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ channel, ...data }));
    }
  });
});

// Обработка WebSocket соединений
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  ws.isAlive = true;

  // Отправляем синхронизацию новому клиенту
  wsController.sendSync(ws);

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
      console.log('Received message:', data);
    } catch (e) {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // Маршрутизация сообщений
    switch (data.type) {
      case 'auth':
        await wsController.handleAuth(ws, data);
        break;
        
      case 'chat-message':
        await wsController.handleChatMessage(ws, data);
        break;
        
      case 'bet':
        await wsController.handleBet(ws, data);
        break;
        
      case 'cashout':
        await wsController.handleCashout(ws, data);
        break;
        
      case 'game-event':
        // Убираем любые попытки смены фазы от клиента
        ws.send(JSON.stringify({ error: 'Phase control is server-only' }));
        break;
        
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed for user:', ws.user?.username);
  });
});

// Пинг для поддержания соединения
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Автоматический запуск игр
setInterval(() => {
  if (!gameService.getCurrentGame() && !gameService.gameTimer) {
    gameService.startNewGame();
  }
}, config.GAME_CHECK_INTERVAL);

// Запускаем первую игру
setTimeout(() => {
  gameService.startNewGame();
}, 2000);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

console.log('WebSocket server started on ws://0.0.0.0:' + config.WS_PORT);
console.log('Redis connected:', redis.status); 
console.log('Prisma connected');
console.log('BOT_TOKEN loaded:', config.BOT_TOKEN ? 'YES' : 'NO');
console.log('ADMIN_BOT_TOKEN loaded:', config.ADMIN_BOT_TOKEN ? 'YES' : 'NO'); 