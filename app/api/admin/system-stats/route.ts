import Redis from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const telegramId = searchParams.get('telegram_id');
  
  if (!telegramId) {
    return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });
  }
  
  try {
    // Проверяем права админа
    const adminIds = process.env.ADMIN_IDS?.split(",").map(id => id.trim()) || [];
    const adminUsernames = process.env.ADMIN_USERNAMES?.split(",").map(username => username.trim()) || [];
    
    if (!adminIds.includes(telegramId) && !adminUsernames.includes(telegramId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const data = await redis.get('crashChances');
    const chances = data ? JSON.parse(data) : null;
    
    return NextResponse.json({ chances });
    
  } catch (error) {
    console.error('System stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const telegramId = searchParams.get('telegram_id');
  
  if (!telegramId) {
    return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });
  }
  
  try {
    // Проверяем права админа
    const adminIds = process.env.ADMIN_IDS?.split(",").map(id => id.trim()) || [];
    const adminUsernames = process.env.ADMIN_USERNAMES?.split(",").map(username => username.trim()) || [];
    
    if (!adminIds.includes(telegramId) && !adminUsernames.includes(telegramId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const { chances } = await request.json();
    
    if (!Array.isArray(chances)) {
      return NextResponse.json({ error: 'Invalid chances' }, { status: 400 });
    }
    
    await redis.set('crashChances', JSON.stringify(chances));
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('System stats update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 