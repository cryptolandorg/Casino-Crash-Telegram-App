import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function POST(request: NextRequest) {
  try {
    const session = await prisma.gameSession.create({
      data: {
        status: 'waiting'
      }
    });
    
    // Публикуем событие в Redis
    await redis.publish('lobby-events', JSON.stringify({
      type: 'session-start',
      sessionId: session.id,
      status: 'waiting'
    }));
    
    return NextResponse.json({ 
      success: true, 
      sessionId: session.id 
    });
    
  } catch (error) {
    console.error('Start session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 