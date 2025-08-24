import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { telegramId, gameId, crashPoint } = await request.json();
    
    if (!telegramId || !gameId || !crashPoint) {
      return NextResponse.json({ error: 'telegramId, gameId and crashPoint required' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const game = await prisma.game.findFirst({
      where: { 
        id: gameId,
        userId: user.id,
        status: 'playing'
      }
    });
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found or already finished' }, { status: 404 });
    }
    
    // Вычисляем выигрыш
    const cashout = game.bet * crashPoint;
    const profit = cashout - game.bet;
    
    // Обновляем игру
    await prisma.game.update({
      where: { id: game.id },
      data: {
        crashPoint,
        cashout,
        profit,
        status: 'cashed_out'
      }
    });
    
    // Обновляем баланс пользователя
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: user.balance + cashout }
    });
    
    return NextResponse.json({ 
      success: true, 
      cashout,
      profit,
      newBalance: user.balance + cashout
    });
    
  } catch (error) {
    console.error('Cashout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 