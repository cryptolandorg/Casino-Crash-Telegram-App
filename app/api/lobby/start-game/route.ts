import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    
    // Обновляем статус сессии
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'starting',
        startTime: new Date()
      }
    });
    
    // Публикуем событие в Redis
    await redis.publish('lobby-events', JSON.stringify({
      type: 'game-start',
      sessionId,
      status: 'starting'
    }));
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 