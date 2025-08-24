import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

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
    
    const users = await prisma.user.findMany({
      include: {
        games: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        withdrawRequests: {
          where: { status: 'pending' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ users });
    
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 