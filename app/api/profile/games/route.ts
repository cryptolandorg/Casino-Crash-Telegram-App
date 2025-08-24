import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegram_id');

    if (!telegramId) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 });
    }

    // Находим пользователя по telegramId
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Получаем последние 10 завершенных игр пользователя
    const games = await prisma.game.findMany({
      where: {
        userId: user.id,
        status: { in: ['crashed', 'cashed_out'] } // только завершенные игры
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10, // только последние 10
      include: {
        gameSession: {
          select: {
            crashPoint: true
          }
        }
      }
    });

    // Форматируем данные для фронта
    const formattedGames = games.map(game => ({
      id: game.id,
      bet: game.bet,
      cashout: game.cashout,
      profit: game.profit,
      status: game.status,
      crashPoint: game.gameSession?.crashPoint,
      createdAt: game.createdAt
    }));

    return NextResponse.json({ games: formattedGames });
  } catch (error) {
    console.error('Error fetching user games:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 