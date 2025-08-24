import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const telegramId = searchParams.get('telegram_id')
  
  if (!telegramId) {
    return NextResponse.json({ error: 'telegram_id required' }, { status: 400 })
  }
  
  try {
    const adminIds = process.env.ADMIN_IDS?.split(',').map(id => id.trim()) || []
    const adminUsernames = process.env.ADMIN_USERNAMES?.split(',').map(username => username.trim()) || []
    
    const hasAccess = adminIds.includes(telegramId) || adminUsernames.includes(telegramId)
    
    return NextResponse.json({ 
      hasAccess,
      isAdmin: hasAccess
    })
    
  } catch (error) {
    console.error('Admin access check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 