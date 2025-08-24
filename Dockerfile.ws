FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Устанавливаем зависимости
RUN npm install -g pnpm
RUN pnpm install

# Копируем исходный код
COPY . .

# Генерируем Prisma клиент
RUN npx prisma generate

# Открываем порт для WebSocket сервера
EXPOSE 4001

# Запускаем WebSocket сервер
CMD ["node", "ws-server.js"] 