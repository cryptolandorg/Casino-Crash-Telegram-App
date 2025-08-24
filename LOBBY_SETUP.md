# Настройка лобби с WebSocket и Redis

## Архитектура

Система лобби состоит из:
- **WebSocket сервер** (ws-server.js) - real-time коммуникация
- **Redis** - pub/sub для синхронизации между серверами
- **Next.js API** - REST endpoints для управления сессиями
- **Frontend** - React компоненты с WebSocket подключением

## Запуск

### 1. Установка зависимостей
```bash
npm install
# или
pnpm install
```

### 2. Запуск через Docker Compose
```bash
docker-compose up -d
```

Это запустит:
- PostgreSQL (порт 5432)
- Redis (порт 6379)
- WebSocket сервер (порт 4000)
- Next.js приложение (порт 3000)

### 3. Запуск вручную

#### Redis
```bash
# Установка Redis (macOS)
brew install redis
redis-server

# Или через Docker
docker run -d -p 6379:6379 redis:7
```

#### WebSocket сервер
```bash
node ws-server.js
```

#### Next.js приложение
```bash
npm run dev
```

## Переменные окружения

Создайте `.env.local`:
```env
# База данных
DATABASE_URL="postgres://postgres:postgres@localhost:5432/crashgame"

# Redis
REDIS_URL="redis://localhost:6379"

# WebSocket
NEXT_PUBLIC_WS_URL="ws://localhost:4001"

# Telegram
TELEGRAM_BOT_TOKEN="your_bot_token"
TELEGRAM_ADMIN_BOT_TOKEN="your_admin_bot_token"
```

## API Endpoints

### Лобби
- `GET /api/lobby/status` - статус текущей сессии
- `POST /api/lobby/start-session` - запуск игровой сессии
- `POST /api/lobby/end-session` - завершение сессии

### Чат
- `GET /api/lobby/chat` - получение сообщений
- `POST /api/lobby/chat` - отправка сообщения

## WebSocket события

### Клиент → Сервер
```json
// Авторизация
{ "type": "auth", "initData": "..." }

// Ставка
{ "type": "bet", "bet": 10 }

// Сообщение в чат
{ "type": "chat-message", "message": "Hello!" }
```

### Сервер → Клиент
```json
// Старт игры
{ "type": "game-start", "crashPoint": 2.5, "duration": 8000 }

// Краш
{ "type": "game-crash", "crashPoint": 2.5 }

// Сообщение в чат
{ "type": "chat-message", "userId": "123", "username": "Player", "message": "Hello!" }
```

## Компоненты

### useLobbySocket
Хук для подключения к WebSocket лобби:
```typescript
const { connected, lobbyEvents, chatMessages, sendChat, sendBet } = useLobbySocket({ initData })
```

### PlayerList
Компонент для отображения списка игроков:
```typescript
<PlayerList players={players} currentMultiplier={multiplier} />
```

### GameTimer
Компонент таймера до старта:
```typescript
<GameTimer timeUntilStart={30000} onTimeUp={handleStart} />
```

## Масштабирование

Для production:
1. Используйте Redis Cluster
2. Запустите несколько WebSocket серверов
3. Настройте балансировщик нагрузки
4. Используйте sticky sessions для WebSocket

## Отладка

### Логи WebSocket сервера
```bash
node ws-server.js
```

### Redis мониторинг
```bash
redis-cli monitor
```

### Проверка подключений
```bash
# Подключения к Redis
redis-cli client list

# Подключения к WebSocket
# Смотрите логи ws-server.js
``` 