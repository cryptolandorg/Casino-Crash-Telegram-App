import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const telegramId = searchParams.get('telegram_id');
  
  if (!telegramId) {
    return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Пока возвращаем пустой массив, так как таблица депозитов может не существовать
    return NextResponse.json({
      deposits: []
    });
    
  } catch (error) {
    console.error('Deposits error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 