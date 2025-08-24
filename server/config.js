require('dotenv').config();

module.exports = {
  // WebSocket
  WS_PORT: 4001,
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Telegram
  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_BOT_TOKEN: process.env.ADMIN_BOT_TOKEN,
  
  // Game settings
  BET_DURATION: 15000, // 15 сек на ставки
  FLIGHT_DURATION: 20000, // 20 сек полета
  GAME_RESTART_DELAY: 3000, // 3 сек между играми
  GAME_CHECK_INTERVAL: 5000, // 5 сек проверка новых игр
  
  // Channels
  LOBBY_CHANNEL: 'lobby-events',
  CHAT_CHANNEL: 'chat-events',
  
  // Улучшенная система рандома крашпоинтов
  // Более реалистичное распределение с преобладанием низких коэффициентов
  DEFAULT_CRASH_CHANCES: [
    { range: [1.00, 1.10], chance: 0.15 }, // 15% - очень низкие
    { range: [1.10, 1.25], chance: 0.25 }, // 25% - низкие
    { range: [1.25, 1.50], chance: 0.20 }, // 20% - средние-низкие
    { range: [1.50, 2.00], chance: 0.15 }, // 15% - средние
    { range: [2.00, 3.00], chance: 0.10 }, // 10% - средние-высокие
    { range: [3.00, 5.00], chance: 0.08 }, // 8% - высокие
    { range: [5.00, 10.00], chance: 0.05 }, // 5% - очень высокие
    { range: [10.00, 50.00], chance: 0.015 }, // 1.5% - экстремальные
    { range: [50.00, 100.00], chance: 0.005 }, // 0.5% - мега-краши
  ],
  
  // Cache settings
  CHANCES_CACHE_DURATION: 20000, // 20 сек кэш шансов
}; 