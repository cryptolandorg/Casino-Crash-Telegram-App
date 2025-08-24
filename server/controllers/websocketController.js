const config = require('../config');
const { authenticateUser } = require('../utils/telegram');

class WebSocketController {
  constructor(prisma, pub, gameService) {
    this.prisma = prisma;
    this.pub = pub;
    this.gameService = gameService;
  }

  // Обработка авторизации
  async handleAuth(ws, data) {
    try {
      const user = await authenticateUser(data.initData, this.prisma);
      ws.user = user;
      
      console.log('[WS AUTH] userId:', ws.user.id, 'telegramId:', ws.user.telegramId, 'username:', ws.user.username);
      
      ws.send(JSON.stringify({ 
        type: 'auth-success', 
        user: ws.user 
      }));
      
      // Отправляем историю сессии
      const sessionHistory = await this.gameService.getSessionHistory();
      ws.send(JSON.stringify({ 
        type: 'session-history', 
        history: sessionHistory 
      }));
      
      console.log('User authenticated:', ws.user.username, 'Balance:', ws.user.balance);
    } catch (error) {
      console.error('Error during authentication:', error);
      ws.send(JSON.stringify({ error: error.message || 'Authentication failed' }));
    }
  }

  // Обработка сообщений чата
  async handleChatMessage(ws, data) {
    if (!ws.user) {
      ws.send(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    
    try {
      // Сохраняем сообщение в БД
      await this.prisma.chatMessage.create({
        data: {
          userId: ws.user.id,
          message: data.message,
          type: 'text',
          gameSessionId: this.gameService.getCurrentSession()?.id
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
      this.pub.publish(config.CHAT_CHANNEL, JSON.stringify({ type: 'chat-message', ...chatMsg }));
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  // Обработка ставки (теперь поддерживает суммирование)
  async handleBet(ws, data) {
    if (!ws.user) {
      ws.send(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }

    const currentGame = this.gameService.getCurrentGame();
    if (!currentGame || currentGame.phase !== 'betting') {
      ws.send(JSON.stringify({ error: 'Betting phase is over' }));
      return;
    }

    const bet = data.bet;
    const clientBetId = data.clientBetId;
    
    try {
      // Проверяем баланс и делаем ставку в транзакции
      const result = await this.prisma.$transaction(async (tx) => {
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
            gameSessionId: this.gameService.getCurrentSession().id,
            bet,
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
      
      // Добавляем ставку в игровой сервис (суммирование)
      const added = this.gameService.addBet(ws.user.id, ws.user.username, bet, clientBetId);
      
      if (added) {
        const userBets = currentGame.bets.get(ws.user.id);
        console.log('Bet added:', bet, 'from user:', ws.user.username, 'Total bet:', userBets.totalBet, 'New balance:', result.updatedUser.balance);
      
      this.pub.publish(config.LOBBY_CHANNEL, JSON.stringify({ 
        type: 'bet', 
        userId: ws.user.id,
        username: ws.user.username,
        bet, 
          totalBet: userBets.totalBet,
        createdAt: Date.now() 
      }));
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      ws.send(JSON.stringify({ 
        error: error.message || 'Bet failed',
        balance: ws.user.balance 
      }));
    }
  }

  // Обработка кэшаута
  async handleCashout(ws, data) {
    console.log('[CASHOUT] Начало обработки cashout для пользователя:', ws.user?.username);
    
    if (!ws.user) {
      ws.send(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }

    const currentGame = this.gameService.getCurrentGame();
    console.log('[CASHOUT] Текущая игра:', currentGame ? 'есть' : 'нет', 'фаза:', currentGame?.phase);
    
    if (!currentGame || currentGame.phase !== 'flying') {
      ws.send(JSON.stringify({ error: 'Not in flying phase' }));
      return;
    }

    // Вычисляем текущий множитель на сервере в реальном времени
    const multiplier = this.gameService.calculateCurrentMultiplier(currentGame.startTime, currentGame.crashTime);
    
    console.log('[CASHOUT] Server calculated multiplier:', multiplier?.toFixed(4) || 'CRASH');

    if (!multiplier) {
      ws.send(JSON.stringify({ error: 'Game already crashed' }));
      return;
    }

    try {
      // Обновляем игру в БД
      const result = await this.prisma.$transaction(async (tx) => {
        // Находим ВСЕ активные игры пользователя в текущей сессии
        const games = await tx.game.findMany({
          where: {
            userId: ws.user.id,
            gameSessionId: this.gameService.getCurrentSession().id,
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

      this.pub.publish(config.LOBBY_CHANNEL, JSON.stringify({
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
  }

  // Отправка синхронизации новому клиенту
  sendSync(ws) {
    const currentGame = this.gameService.getCurrentGame();
    if (currentGame) {
      ws.send(JSON.stringify({
        type: 'sync',
        phase: currentGame.phase,
        sessionId: this.gameService.getCurrentSession()?.id,
        seed: currentGame.seed,
        crashPoint: currentGame.crashPoint,
        crashTime: currentGame.crashTime,
        startTime: currentGame.phase === 'betting' ? currentGame.betEndTime : currentGame.startTime,
        duration: currentGame.duration,
        betEndTime: currentGame.betEndTime,
        now: Date.now(),
      }));
    }
  }
}

module.exports = WebSocketController; 