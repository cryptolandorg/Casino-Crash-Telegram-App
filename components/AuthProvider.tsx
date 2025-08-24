"use client"

import BlockedUserScreen from "@/components/BlockedUserScreen"
import { useIsMobile } from "@/components/ui/use-mobile"
import { useStore } from "@/lib/store"
import { init, retrieveRawInitData } from "@telegram-apps/sdk"
import { useEffect, useRef, useState } from "react"

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile?.() ?? false;
  const { user } = useStore()
  const [isBlocked, setIsBlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const authAttemptedRef = useRef(false)

  useEffect(() => {
    console.log("[AuthProvider] useEffect triggered")
    if (typeof window === "undefined") return
    if (authAttemptedRef.current) return // Предотвращаем множественные попытки

    authAttemptedRef.current = true

    init()
    const initDataRaw = retrieveRawInitData()
    console.log("[AuthProvider] initDataRaw:", initDataRaw)

    if (!initDataRaw) {
      console.warn("[AuthProvider] Нет initDataRaw — не в Telegram WebView?")
      setIsLoading(false)
      return
    }

    const { setUser, setBalance } = useStore.getState()
    fetch("/api/auth/telegram", {
      method: "POST",
      headers: {
        Authorization: `tma ${initDataRaw}`,
        "Content-Type": "application/json"
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Auth response:", data)
        if (data.success && data.user && data.user.telegramId) {
          setUser(data.user)
          setBalance(data.user.balance)
          
          // Проверяем блокировку пользователя
          if (data.user.blocked) {
            setIsBlocked(true)
          }
        } else {
          alert("Ошибка авторизации через Telegram. Проверь консоль и сервер.")
        }
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Auth error:", error)
        setIsLoading(false)
      })
  }, []) // Убираем isMobile из зависимостей

  // Если пользователь заблокирован, показываем экран блокировки
  if (isBlocked) {
    return <BlockedUserScreen />
  }

  // Если загрузка, показываем пустой экран
  if (isLoading) {
    return <div className="min-h-screen bg-gray-900" />
  }

  return <>{children}</>
} 