#!/usr/bin/env node

// Скрипт для проверки Business Connections
// Запуск: node check-business-connections.js

// Загружаем переменные окружения из .env
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key.trim()] = value.trim()
      }
    })
  }
}

loadEnv()

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не найден в .env')
  process.exit(1)
}

async function checkBusinessConnections() {
  console.log('🔍 Проверяем Business Connections...')
  console.log(`🤖 Bot Token: ${BOT_TOKEN.substring(0, 10)}...`)
  
  try {
    // Проверяем информацию о боте
    console.log('\n📋 Информация о боте:')
    const botInfo = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
    const botData = await botInfo.json()
    
    if (botData.ok) {
      console.log(`✅ Бот: @${botData.result.username}`)
      console.log(`✅ ID: ${botData.result.id}`)
      console.log(`✅ Имя: ${botData.result.first_name}`)
    } else {
      console.log(`❌ Ошибка получения информации о боте: ${botData.description}`)
      return
    }

    // Проверяем Business Connections
    console.log('\n🔗 Проверяем Business Connections:')
    const connectionsResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getBusinessConnections`)
    const connectionsData = await connectionsResponse.json()
    
    if (connectionsData.ok) {
      if (connectionsData.result && connectionsData.result.length > 0) {
        console.log('✅ Найдены Business Connections:')
        connectionsData.result.forEach((connection, index) => {
          console.log(`\n${index + 1}. Business Connection:`)
          console.log(`   ID: ${connection.id}`)
          console.log(`   Пользователь: ${connection.user.first_name} (@${connection.user.username})`)
          console.log(`   Дата подключения: ${new Date(connection.date * 1000).toLocaleString()}`)
          console.log(`   Может отвечать: ${connection.can_reply}`)
          console.log(`   Активна: ${connection.is_enabled}`)
        })
        
        console.log('\n📝 Добавьте в .env:')
        console.log(`TELEGRAM_BUSINESS_CONNECTION_ID=${connectionsData.result[0].id}`)
      } else {
        console.log('❌ Business Connections не найдены')
        console.log('\n📋 Для настройки Business Connection:')
        console.log('1. Создайте Business Account в Telegram')
        console.log('2. Перейдите в Settings → Business → Bots')
        console.log('3. Нажмите "Add Bot" и найдите вашего бота')
        console.log('4. Подтвердите подключение')
        console.log('5. Запустите этот скрипт снова')
      }
    } else {
      console.log(`❌ Ошибка получения Business Connections: ${connectionsData.description}`)
      
      if (connectionsData.error_code === 404) {
        console.log('\n💡 Это означает, что:')
        console.log('- Бот не подключен к Business Account')
        console.log('- Или Business Account не создан')
        console.log('- Или у бота нет прав на получение Business Connections')
      }
    }

    // Проверяем права бота
    console.log('\n🔐 Проверяем права бота:')
    const botCommands = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMyCommands`)
    const commandsData = await botCommands.json()
    
    if (commandsData.ok) {
      console.log('✅ Команды бота получены')
    } else {
      console.log(`❌ Ошибка получения команд: ${commandsData.description}`)
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

checkBusinessConnections() 