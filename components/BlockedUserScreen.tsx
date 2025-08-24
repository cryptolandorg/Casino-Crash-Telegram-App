"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function BlockedUserScreen() {
  const handleSupportClick = () => {
    // Открываем бота с командой /support
    // Используем переменную окружения или fallback
    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || "your_bot_username"
    window.open(`https://t.me/${botUsername}?start=support`, "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <CardTitle className="text-white text-xl">Account Blocked</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            Your account has been blocked due to violation of our terms of service. 
            If you believe this is an error, please contact our support team.
          </p>
          <Button 
            onClick={handleSupportClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
          >
            📞 Support
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 