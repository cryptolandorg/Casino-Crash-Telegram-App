const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:4001');

ws.on('open', () => {
  console.log('✅ WebSocket соединение установлено');
  
  // Тестируем авторизацию
  ws.send(JSON.stringify({
    type: 'auth',
    initData: '' // DEV режим
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Получено сообщение:', message.type);
  
  if (message.type === 'auth-success') {
    console.log('✅ Авторизация успешна, баланс:', message.user.balance);
    
    // Тестируем ставку
    setTimeout(() => {
      console.log('💰 Делаем ставку 10...');
      ws.send(JSON.stringify({
        type: 'bet',
        bet: 10
      }));
    }, 1000);
  }
  
  if (message.type === 'balance-update') {
    console.log('💰 Баланс обновлен:', message.balance);
  }
  
  if (message.type === 'game-start') {
    console.log('🎮 Игра началась, фаза ставок');
  }
  
  if (message.type === 'game-flying') {
    console.log('🚀 Фаза полета, можно делать cashout');
    
    // Тестируем cashout через 5 секунд
    setTimeout(() => {
      console.log('💸 Делаем cashout...');
      ws.send(JSON.stringify({
        type: 'cashout'
      }));
    }, 5000);
  }
  
  if (message.type === 'game-crash') {
    console.log('💥 Игра завершена');
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket ошибка:', error.message);
});

ws.on('close', () => {
  console.log('🔌 WebSocket соединение закрыто');
  process.exit(0);
});

// Таймаут на случай, если что-то пойдет не так
setTimeout(() => {
  console.log('⏰ Таймаут, закрываем соединение');
  ws.close();
  process.exit(1);
}, 30000); 