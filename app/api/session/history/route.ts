import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Получаем последние 10 завершенных сессий с crashPoint
    const sessions = await prisma.gameSession.findMany({
      where: {
        crashPoint: { not: null } // только завершенные сессии
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        crashPoint: true,
        createdAt: true
      }
    });

    // Форматируем данные для фронта
    const history = sessions.map(session => ({
      id: session.id,
      crashPoint: session.crashPoint,
      createdAt: session.createdAt
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching session history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 