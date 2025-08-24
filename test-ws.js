const WebSocket = require('ws');

// Тестовый WebSocket клиент
function testWebSocket() {
  console.log('🔌 Подключение к WebSocket серверу...');
  
  const ws = new WebSocket('ws://localhost:4001');
  
  ws.on('open', () => {
    console.log('✅ Подключение установлено');
    
    // Тестовая авторизация
    ws.send(JSON.stringify({
      type: 'auth',
      initData: 'test-data'
    }));
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Получено сообщение:', message.type);
      
      if (message.type === 'auth-success') {
        console.log('✅ Авторизация успешна');
        
        // Тестовая ставка через 2 секунды
        setTimeout(() => {
          console.log('💰 Отправляем тестовую ставку...');
          ws.send(JSON.stringify({
            type: 'bet',
            bet: 100
          }));
        }, 2000);
      }
      
      if (message.type === 'balance-update') {
        console.log('💰 Баланс обновлен:', message.balance);
      }
      
      if (message.type === 'game-start') {
        console.log('🎮 Игра началась, seed:', message.seed);
      }
      
      if (message.type === 'game-flying') {
        console.log('🚀 Фаза полета, crashPoint:', message.crashPoint);
      }
      
      if (message.type === 'game-crash') {
        console.log('💥 Игра завершена, результат:', message.crashPoint);
        
        // Закрываем соединение после теста
        setTimeout(() => {
          console.log('🔌 Закрываем соединение');
          ws.close();
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Ошибка парсинга сообщения:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Соединение закрыто');
    process.exit(0);
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket ошибка:', error);
    process.exit(1);
  });
  
  // Таймаут на случай, если сервер не отвечает
  setTimeout(() => {
    console.log('⏰ Таймаут подключения');
    process.exit(1);
  }, 10000);
}

// Запускаем тест
if (require.main === module) {
  testWebSocket();
}

module.exports = { testWebSocket }; 