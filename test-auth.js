const WebSocket = require('ws');

// Тестовый initData (замени на реальный из Telegram WebApp)
const testInitData = 'user=%7B%22id%22%3A2012133536%2C%22first_name%22%3A%22%D0%94%D0%B0%D0%BD%D0%B8%D0%BB%D0%B0%22%2C%22last_name%22%3A%22%D0%91%D0%B0%D0%B3%D1%80%D0%BE%D0%B2%22%2C%22username%22%3A%22dbagrov2%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2F-1L1Z8-XfpQt0rBFLjoarYDhZJBgcOJ0yRDiWTY7NsQ.svg%22%7D&chat_instance=7357166062967719946&chat_type=sender&auth_date=1751223379&signature=WetGzE5ePCi3w4wbskAYNawHq40bC-k31nylxRNnazm_ubp5MWP3CMNV2YXBUZRuuTSGxqwIC5QXKNK40f0DBg&hash=78c4f784ef87659ad13671ab8719aa91d8c8da7c445cff3d7b7275f79c6fd4ae';

const ws = new WebSocket('ws://localhost:4001');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Отправляем авторизацию
  ws.send(JSON.stringify({
    type: 'auth',
    initData: testInitData
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
  
  if (message.type === 'auth-success') {
    console.log('✅ Auth successful! User:', message.user);
    
    // Пробуем сделать ставку
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'bet',
        bet: 10
      }));
    }, 1000);
  } else if (message.error) {
    console.log('❌ Error:', message.error);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
}); 