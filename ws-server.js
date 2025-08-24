require('dotenv').config();
const WebSocket = require('ws');

const Redis = require('ioredis');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
// Отдельное подключение для обычных команд (не pub/sub)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
// Отдельное подключение для pub/sub
const pub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
// Отдельное подключение для subscriber
const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const wss = new WebSocket.Server({ port: 4001 });

// Каналы для pub/sub
const LOBBY_CHANNEL = 'lobby-events';
const CHAT_CHANNEL = 'chat-events';

// Состояние текущей игры
let currentGame = null;
let gameTimer = null;
let currentSession = null;

const DEFAULT_CRASH_CHANCES = [
  { range: [1.01, 1.2], chance: 0.25 },
  { range: [1.2, 2], chance: 0.35 },
  { range: [2, 5], chance: 0.30 },
  { range: [5, 20], chance: 0.09 },
  { range: [20, 50], chance: 0.01 },
];

let cachedChances = null;
let cachedAt = 0;
async function getCrashChances() {
  const now = Date.now();
  if (cachedChances && now - cachedAt < 20000) return cachedChances;
  try {
    const data = await redis.get('crashChances');
    if (data) {
      const parsed = JSON.parse(data).filter(c => Array.isArray(c.range) && c.range.length === 2);
      cachedChances = parsed;
      cachedAt = now;
      return parsed;
    }
  } catch (e) {
    console.error('Redis crashChances error:', e);
  }
  cachedChances = DEFAULT_CRASH_CHANCES;
  cachedAt = now;
  return DEFAULT_CRASH_CHANCES;
}

// ВНИМАНИЕ: generateCrashPoint теперь асинхронная!
async function generateCrashPoint(seed) {
  const rng = new (class {
    constructor(seed) { this.seed = seed; }
    random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  })(seed);
  const r = rng.random();
  const chances = await getCrashChances();
  let acc = 0;
  for (let i = 0; i < chances.length; i++) {
    acc += chances[i].chance;
    if (r < acc) {
      const [min, max] = chances[i].range;
      return min + rng.random() * (max - min);
    }
  }
  return 1.1 + rng.random() * 0.4;
}

// Расчет коэффициента в реальном времени (как в Aviator)
function calculateCurrentMultiplier(seed, elapsedTime) {
  const rng = new (class {
    constructor(seed) { this.seed = seed; }
    random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  })(seed);
  
  // Используем экспоненциальный рост с случайным моментом краша
  const maxTime = 20000; // 20 секунд максимум
  const timeProgress = elapsedTime / maxTime;
  
  // Генерируем случайный момент краша (1-20 секунд)
  const crashTime = 1 + rng.random() * 19; // от 1 до 20 секунд
  const crashProgress = crashTime / 20;
  
  // Если время прошло больше краша - игра закончена
  if (timeProgress >= crashProgress) {
    return null; // краш
  }
  
  // Экспоненциальный рост коэффициента
  const multiplier = Math.pow(Math.E, timeProgress * 2.5);
  return multiplier;
}

// Получение истории сессии из БД
async function getSessionHistory() {
  try {
    const sessions = await prisma.gameSession.findMany({
      where: {
        status: 'crashed'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      select: {
        crashPoint: true,
        createdAt: true
      }
    });
    
    return sessions.map(session => ({
      multiplier: session.crashPoint || 1,
      timestamp: session.createdAt.getTime()
    }));
  } catch (error) {
    console.error('Error fetching session history:', error);
    return [];
  }
}

// Запуск новой игры
async function startNewGame() {
  if (currentGame) {
    console.log('Game already in progress, skipping...');
    return;
  }

  try {
    // Создаем новую игровую сессию в БД
    currentSession = await prisma.gameSession.create({
      data: {
        status: 'waiting'
      }
    });

    const seed = Math.floor(Math.random() * 1000000); // 6-значный seed
    const betDuration = 15000; // 15 сек на ставки
    const flightDuration = 20000; // Фиксированная длительность полета 20 сек

    currentGame = {
      sessionId: currentSession.id,
      seed,
      crashPoint: null, // Будет рассчитан в реальном времени
      startTime: Date.now() + betDuration, // старт полёта
      betEndTime: Date.now() + betDuration,
      duration: flightDuration,
      bets: [],
      phase: 'betting',
    };

    console.log(`Starting new game - Session: ${currentSession.id}, Seed: ${seed}`);

    // 1. Фаза ставок
    pub.publish(LOBBY_CHANNEL, JSON.stringify({
      type: 'game-start',
      phase: 'betting',
      sessionId: currentSession.id,
      seed,
      betDuration,
      startTime: currentGame.startTime,
      betEndTime: currentGame.betEndTime,
      duration: flightDuration
    }));

    // 2. Через betDuration — фаза полёта
    setTimeout(async () => {
      if (!currentGame) return;
      await new Promise(res => setTimeout(res, 500)); // Увеличили задержку до 500мс для расчетов
      await prisma.gameSession.update({
        where: { id: currentSession.id },
        data: { 
          status: 'playing',
          startTime: new Date(),
          crashPoint: currentGame.crashPoint
        }
      });

      currentGame.phase = 'flying';
      currentGame.startTime = Date.now();

      pub.publish(LOBBY_CHANNEL, JSON.stringify({
        type: 'game-flying',
        phase: 'flying',
        sessionId: currentSession.id,
        seed,
        crashPoint: currentGame.crashPoint,
        startTime: currentGame.startTime,
        duration: currentGame.duration
      }));

      // 3. Через duration — crash
      gameTimer = setTimeout(() => {
        endGame();
      }, currentGame.duration);
    }, betDuration);
  } catch (error) {
    console.error('Error starting new game:', error);
  }
}

// Завершение игры
async function endGame() {
  if (!currentGame || !currentSession) return;
  
  try {
    currentGame.phase = 'crashed';
    
    console.log(`Game crashed - Session: ${currentSession.id}, Seed: ${currentGame.seed}, Crash Point: ${currentGame.crashPoint?.toFixed(4) || 'N/A'}`);
    
    // Обновляем сессию в БД
    await prisma.gameSession.update({
      where: { id: currentSession.id },
      data: {
        status: 'crashed',
        crashTime: new Date(),
        duration: Date.now() - currentGame.startTime
      }
    });

    // Обрабатываем все ставки в сессии
    const sessionGames = await prisma.game.findMany({
      where: { gameSessionId: currentSession.id },
      include: { user: true }
    });

    for (const game of sessionGames) {
      if (game.cashout && game.cashout <= currentGame.crashPoint) {
        // Игрок успел вывести деньги
        const profit = (game.bet * game.cashout) - game.bet;
        
        await prisma.$transaction([
          prisma.game.update({
            where: { id: game.id },
            data: {
              profit,
              status: 'cashed_out'
            }
          }),
          prisma.user.update({
            where: { id: game.user.id },
            data: { 
              balance: { increment: profit + game.bet } // возвращаем ставку + выигрыш
            }
          }),
          prisma.transaction.create({
            data: {
              userId: game.user.id,
              type: 'game',
              amount: profit,
              currency: 'XTR',
              payload: `Cashout at ${game.cashout.toFixed(2)}x`,
              status: 'success'
            }
          })
        ]);
      } else {
        // Игрок проиграл
        const profit = -game.bet;
        
        await prisma.$transaction([
          prisma.game.update({
            where: { id: game.id },
            data: {
              profit,
              status: 'crashed'
            }
          }),
          prisma.transaction.create({
            data: {
              userId: game.user.id,
              type: 'game',
              amount: profit,
              currency: 'XTR',
              payload: `Lost at ${currentGame.crashPoint?.toFixed(2) || 'N/A'}x`,
              status: 'success'
            }
          })
        ]);
      }
    }
    
    // Отправляем событие краша
    pub.publish(LOBBY_CHANNEL, JSON.stringify({
      type: 'game-crash',
      phase: 'crashed',
      sessionId: currentSession.id,
      seed: currentGame.seed,
      crashPoint: currentGame.crashPoint,
      endTime: Date.now(),
      startTime: currentGame.startTime,
      duration: currentGame.duration
    }));

    currentGame = null;
    currentSession = null;
    gameTimer = null;

    // Запускаем новую игру через 3 секунды
    setTimeout(() => {
      startNewGame();
    }, 3000);
  } catch (error) {
    console.error('Error ending game:', error);
  }
}

// Автоматический запуск игр
setInterval(() => {
  if (!currentGame && !gameTimer) {
    startNewGame();
  }
}, 5000);

// Запускаем первую игру
setTimeout(() => {
  startNewGame();
}, 2000);

// Валидация Telegram initData
function validateInitData(initData, botToken) {
  console.log('🔍 validateInitData called with:');
  console.log('  - initData:', initData ? 'present' : 'missing');
  console.log('  - botToken:', botToken ? 'present' : 'missing');
  
  if (!initData || !botToken) {
    console.log('❌ Missing initData or botToken');
    return false;
  }
  
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  console.log('  - hash from initData:', hash ? 'present' : 'missing');
  
  if (!hash) {
    console.log('❌ No hash in initData');
    return false;
  }
  
  urlParams.delete('hash');
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  console.log('  - dataCheckString:', dataCheckString);
  
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  console.log('  - calculatedHash:', calculatedHash);
  console.log('  - providedHash:', hash);
  console.log('  - hashes match:', calculatedHash === hash);
  
  return calculatedHash === hash;
}

// Извлечение данных пользователя из initData
function extractUserData(initData) {
  const urlParams = new URLSearchParams(initData);
  const userStr = urlParams.get('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

// Подписка на Redis pub/sub
sub.subscribe(LOBBY_CHANNEL, CHAT_CHANNEL);
sub.on('message', (channel, message) => {
  console.log(`Redis message on ${channel}:`, message);
  const data = JSON.parse(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ channel, ...data }));
    }
  });
});

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  ws.isAlive = true;

  // SYNC: отправляем актуальное состояние новому клиенту
  if (currentGame) {
    ws.send(JSON.stringify({
      type: 'sync',
      phase: currentGame.phase,
      sessionId: currentSession?.id,
      seed: currentGame.seed,
      crashPoint: currentGame.crashPoint,
      startTime: currentGame.phase === 'betting' ? currentGame.betEndTime : currentGame.startTime,
      duration: currentGame.duration,
      betEndTime: currentGame.betEndTime,
      now: Date.now(),
    }));
  }

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

    // Авторизация через Telegram initData
    if (data.type === 'auth') {
      console.log('Auth attempt with initData:', data.initData ? 'present' : 'missing');
      console.log('NODE_ENV:', process.env.NODE_ENV);
      
      // DEV режим для тестирования (принудительно)
      if (!data.initData) {
        console.log('[DEV MODE] Skipping Telegram auth, creating test user');
        try {
          const user = await prisma.user.upsert({
            where: { telegramId: 'dev-test-user' },
            update: {},
            create: {
              telegramId: 'dev-test-user',
              username: 'dev-test-user',
              balance: 10000, // Большой баланс для тестирования
            },
          });
          ws.user = {
            id: user.id,
            telegramId: user.telegramId,
            username: user.username || `User${user.telegramId}`,
            avatarUrl: user.avatarUrl,
            balance: user.balance
          };
          console.log('[WS AUTH DEV] userId:', ws.user.id, 'telegramId:', ws.user.telegramId, 'username:', ws.user.username);
          ws.send(JSON.stringify({ 
            type: 'auth-success', 
            user: ws.user 
          }));
          // Отправляем историю сессии
          const sessionHistory = await getSessionHistory();
          ws.send(JSON.stringify({ 
            type: 'session-history', 
            history: sessionHistory 
          }));
          console.log('User authenticated (DEV):', ws.user.username, 'Balance:', ws.user.balance);
          return;
        } catch (error) {
          console.error('Error during DEV authentication:', error);
          ws.send(JSON.stringify({ error: 'DEV Authentication failed' }));
          return;
        }
      }
      
      const botToken = process.env.BOT_TOKEN;
      const adminBotToken = process.env.ADMIN_BOT_TOKEN;
      let isValid = false;
      let userData = null;
      if (botToken && validateInitData(data.initData, botToken)) {
        isValid = true;
        userData = extractUserData(data.initData);
      } else if (adminBotToken && validateInitData(data.initData, adminBotToken)) {
        isValid = true;
        userData = extractUserData(data.initData);
      }
      if (isValid && userData) {
        try {
          // Находим или создаем пользователя в БД
          const user = await prisma.user.upsert({
            where: { telegramId: String(userData.id) },
            update: {
              username: userData.username || undefined,
              avatarUrl: userData.photo_url || undefined,
            },
            create: {
              telegramId: String(userData.id),
              username: userData.username || undefined,
              avatarUrl: userData.photo_url || undefined,
              balance: 1000, // Начальный баланс
            },
          });
          ws.user = {
            id: user.id,
            telegramId: user.telegramId,
            username: user.username || `User${user.telegramId}`,
            avatarUrl: user.avatarUrl,
            balance: user.balance
          };
          console.log('[WS AUTH] userId:', ws.user.id, 'telegramId:', ws.user.telegramId, 'username:', ws.user.username);
          ws.send(JSON.stringify({ 
            type: 'auth-success', 
            user: ws.user 
          }));
          // Отправляем историю сессии
          const sessionHistory = await getSessionHistory();
          ws.send(JSON.stringify({ 
            type: 'session-history', 
            history: sessionHistory 
          }));
          console.log('User authenticated:', ws.user.username, 'Balance:', ws.user.balance);
        } catch (error) {
          console.error('Error during authentication:', error);
          ws.send(JSON.stringify({ error: 'Authentication failed' }));
        }
      } else {
        ws.send(JSON.stringify({ error: 'Authentication failed: invalid initData' }));
        console.error('Auth failed: invalid initData');
      }
      return;
    }

    // Чат
    if (data.type === 'chat-message') {
      if (!ws.user) {
        ws.send(JSON.stringify({ error: 'Not authenticated' }));
        return;
      }
      
      try {
        // Сохраняем сообщение в БД
        await prisma.chatMessage.create({
          data: {
            userId: ws.user.id,
            message: data.message,
            type: 'text',
            gameSessionId: currentSession?.id
          }
        });

      const chatMsg = {
          userId: ws.user.id,
          username: ws.user.username,
          avatarUrl: ws.user.avatarUrl,
        message: data.message,
        createdAt: Date.now(),
      };
      console.log('Chat message:', chatMsg);
      pub.publish(CHAT_CHANNEL, JSON.stringify({ type: 'chat-message', ...chatMsg }));
      } catch (error) {
        console.error('Error saving chat message:', error);
      }
      return;
    }

    // Ставка
    if (data.type === 'bet') {
      if (!ws.user) {
        ws.send(JSON.stringify({ error: 'Not authenticated' }));
        return;
      }

      if (!currentGame || currentGame.phase !== 'betting') {
        ws.send(JSON.stringify({ error: 'Betting phase is over' }));
        return;
      }

      const bet = data.bet;
      
      try {
        // Проверяем баланс и делаем ставку в транзакции
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: ws.user.id },
            select: { balance: true, blocked: true }
          });
          if (!user) {
            console.error('[WS BET] User not found! userId:', ws.user.id, 'telegramId:', ws.user.telegramId);
            throw new Error('User not found');
          }
          if (user.blocked) {
            throw new Error('Account blocked');
          }
          if (user.balance < bet) {
            throw new Error('Insufficient balance');
          }
          // Списываем баланс
          const updatedUser = await tx.user.update({
            where: { id: ws.user.id },
            data: { balance: { decrement: bet } },
            select: { balance: true }
          });
          // Создаем запись о ставке
          const game = await tx.game.create({
            data: {
              userId: ws.user.id,
              gameSessionId: currentSession.id,
              bet,
              crashPoint: currentGame.crashPoint,
              profit: 0,
              status: 'waiting'
            }
          });
          return { updatedUser, game };
        });
        // Обновляем баланс в ws.user
        ws.user.balance = result.updatedUser.balance;
        ws.send(JSON.stringify({ 
          type: 'balance-update', 
          balance: result.updatedUser.balance 
        }));
        console.log('Bet received:', bet, 'from user:', ws.user.username, 'userId:', ws.user.id, 'New balance:', result.updatedUser.balance);
        // Добавляем в текущую игру
        if (currentGame) {
          currentGame.bets.push({
            userId: ws.user.id,
            username: ws.user.username,
            bet,
            timestamp: Date.now()
          });
        }
      pub.publish(LOBBY_CHANNEL, JSON.stringify({ 
        type: 'bet', 
          userId: ws.user.id,
          username: ws.user.username,
          bet, 
          createdAt: Date.now() 
        }));
      } catch (error) {
        console.error('Error placing bet:', error);
        ws.send(JSON.stringify({ 
          error: error.message || 'Bet failed',
          balance: ws.user.balance 
        }));
      }
      return;
    }

    // Кэшаут
    if (data.type === 'cashout') {
      if (!ws.user) {
        ws.send(JSON.stringify({ error: 'Not authenticated' }));
        return;
      }

      if (!currentGame || currentGame.phase !== 'flying') {
        ws.send(JSON.stringify({ error: 'Not in flying phase' }));
        return;
      }

      // Вычисляем текущий множитель на сервере в реальном времени
      const elapsed = Math.max(0, Date.now() - currentGame.startTime);
      const multiplier = calculateCurrentMultiplier(currentGame.seed, elapsed);
      
      console.log('[CASHOUT] Server calculated multiplier:', multiplier?.toFixed(4) || 'CRASH', 'elapsed:', elapsed);

      if (!multiplier) {
        ws.send(JSON.stringify({ error: 'Game already crashed' }));
        return;
      }

      try {
        // Обновляем игру в БД
        const result = await prisma.$transaction(async (tx) => {
          // Находим ВСЕ активные игры пользователя в текущей сессии
          const games = await tx.game.findMany({
            where: {
              userId: ws.user.id,
              gameSessionId: currentSession.id,
              status: 'waiting'
            }
          });

          if (games.length === 0) {
            throw new Error('No active bets found');
          }

          let totalBet = 0;
          let totalWinnings = 0;

          // Обновляем все игры пользователя
          for (const game of games) {
            const winnings = Math.floor(game.bet * multiplier);
            totalBet += game.bet;
            totalWinnings += winnings;

            await tx.game.update({
              where: { id: game.id },
              data: {
                cashout: multiplier,
                profit: winnings - game.bet,
                status: 'cashed_out'
              }
            });
          }

          // Начисляем общий выигрыш
          const updatedUser = await tx.user.update({
            where: { id: ws.user.id },
            data: { balance: { increment: totalWinnings } },
            select: { balance: true }
          });

          // Создаем транзакцию
          await tx.transaction.create({
            data: {
              userId: ws.user.id,
              type: 'game',
              amount: totalWinnings - totalBet,
              currency: 'XTR',
              payload: `Cashout at ${multiplier.toFixed(2)}x`,
              status: 'success'
            }
          });

          return { updatedUser, totalBet, totalWinnings };
        });

        // Обновляем баланс в ws.user
        ws.user.balance = result.updatedUser.balance;

        ws.send(JSON.stringify({ 
          type: 'balance-update', 
          balance: result.updatedUser.balance 
        }));

        pub.publish(LOBBY_CHANNEL, JSON.stringify({
          type: 'cashout',
          userId: ws.user.id,
          username: ws.user.username,
          bet: result.totalBet,
          multiplier,
          winnings: result.totalWinnings,
          createdAt: Date.now() 
        }));

        console.log('Cashout:', result.totalWinnings, 'for user:', ws.user.username, 'New balance:', result.updatedUser.balance);
      } catch (error) {
        console.error('Error processing cashout:', error);
        ws.send(JSON.stringify({ 
          error: error.message || 'Cashout failed',
          balance: ws.user.balance 
        }));
      }
      return;
    }

    // Прочие события
    if (data.type === 'game-event') {
      // Убираем любые попытки смены фазы от клиента
      ws.send(JSON.stringify({ error: 'Phase control is server-only' }));
      return;
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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

console.log('WebSocket server started on ws://0.0.0.0:4001');
console.log('Redis connected:', redis.status); 
console.log('Prisma connected');
console.log('BOT_TOKEN loaded:', process.env.BOT_TOKEN ? 'YES' : 'NO');
console.log('ADMIN_BOT_TOKEN loaded:', process.env.ADMIN_BOT_TOKEN ? 'YES' : 'NO'); 