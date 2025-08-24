import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  
  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 });
  }
  
  try {
    // Здесь должна быть логика проверки TON адреса
    const isValid = /^[0-9a-zA-Z_-]{48}$/.test(address);
    
    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error('TON check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 