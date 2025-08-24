import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Получаем топ-10 выигрышей (кэшаутов с наибольшим profit)
    const records = await prisma.game.findMany({
      where: {
        status: 'cashed_out',
        profit: { gt: 0 } // только выигрыши
      },
      orderBy: {
        profit: 'desc'
      },
      take: 10,
      include: {
        user: {
          select: {
            username: true
          }
        },
        gameSession: {
          select: {
            crashPoint: true
          }
        }
      }
    });

    // Форматируем данные для фронта
    const topRecords = records.map(record => ({
      id: record.id,
      username: record.user.username,
      bet: record.bet,
      cashout: record.cashout,
      profit: record.profit,
      winnings: record.cashout ? record.bet * record.cashout : 0,
      crashPoint: record.gameSession?.crashPoint,
      createdAt: record.createdAt
    }));

    return NextResponse.json({ records: topRecords });
  } catch (error) {
    console.error('Error fetching top records:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 