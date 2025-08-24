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
      include: {
        games: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      avatarUrl: user.avatarUrl,
      balance: user.balance,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      tonWallet: user.tonWallet,
      blocked: user.blocked,
      recentGames: user.games
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { telegramId, ...updateData } = await request.json();
    
    if (!telegramId) {
      return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });
    }
    
    const user = await prisma.user.update({
      where: { telegramId: String(telegramId) },
      data: updateData
    });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        balance: user.balance,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        tonWallet: user.tonWallet,
        blocked: user.blocked
      }
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 