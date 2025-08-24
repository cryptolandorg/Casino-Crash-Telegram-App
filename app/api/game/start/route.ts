import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { telegramId, betAmount } = await request.json();
    
    if (!telegramId || !betAmount) {
      return NextResponse.json({ error: 'telegramId and betAmount required' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (user.balance < betAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    
    // Списываем ставку
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: user.balance - betAmount }
    });
    
    // Создаем сессию игры
    const gameSession = await prisma.gameSession.create({
      data: {
        status: 'starting',
        startTime: new Date()
      }
    });
    
    // Создаем запись о игре
    const game = await prisma.game.create({
      data: {
        userId: user.id,
        gameSessionId: gameSession.id,
        bet: betAmount,
        crashPoint: 0, // будет установлено позже
        profit: 0, // будет установлено позже
        status: 'playing'
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      gameId: game.id,
      sessionId: gameSession.id,
      newBalance: user.balance - betAmount
    });
    
  } catch (error) {
    console.error('Game start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 