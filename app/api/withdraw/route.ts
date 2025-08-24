import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { telegramId, amount, username } = await request.json();
    
    if (!telegramId || !amount || !username) {
      return NextResponse.json({ error: 'telegramId, amount and username required' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (user.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    
    if (amount < 100) {
      return NextResponse.json({ error: 'Minimum withdrawal amount is 100' }, { status: 400 });
    }
    
    // Создаем запрос на вывод
    const withdrawRequest = await prisma.withdrawRequest.create({
      data: {
        userId: user.id,
        amount,
        username
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      requestId: withdrawRequest.id 
    });
    
  } catch (error) {
    console.error('Withdraw error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 