const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDB() {
  try {
    const userCount = await prisma.user.count()
    console.log(`Users in database: ${userCount}`)
    
    const users = await prisma.user.findMany({
      select: {
        telegramId: true,
        username: true,
        balance: true
      }
    })
    
    console.log('Users:', users)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDB() 