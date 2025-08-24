import { prisma } from '@/lib/prisma';
import { extractUserData, validateInitData } from '@/lib/telegram-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('tma ')) {
      return NextResponse.json({ error: 'Invalid authorization header' }, { status: 401 });
    }

    const initData = authHeader.substring(4);
    const botToken = process.env.BOT_TOKEN;
    const adminBotToken = process.env.ADMIN_BOT_TOKEN;

    let isValid = false;
    let userData = null;

    if (botToken && validateInitData(initData, botToken)) {
      isValid = true;
      userData = extractUserData(initData);
    } else if (adminBotToken && validateInitData(initData, adminBotToken)) {
      isValid = true;
      userData = extractUserData(initData);
    }

    if (!isValid || !userData) {
      return NextResponse.json({ error: 'Invalid initData' }, { status: 401 });
    }

    // Находим или создаем пользователя в БД
    const user = await prisma.user.upsert({
      where: { telegramId: String(userData.id) },
      update: {
        username: userData.username || undefined,
        avatarUrl: userData.photo_url || undefined,
      },
      create: {
        telegramId: String(userData.id),
        username: userData.username || undefined,
        avatarUrl: userData.photo_url || undefined,
        balance: 1000, // Начальный баланс
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username || `User${user.telegramId}`,
        avatarUrl: user.avatarUrl,
        balance: user.balance,
        blocked: user.blocked
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 