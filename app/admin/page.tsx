"use client"

import { useStore } from "@/lib/store"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Stats {
  totalUsers: number
  totalGames: number
  totalWithdrawals: number
  totalBalance: number
}

export default function AdminPage() {
  const { user } = useStore()
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !user.telegramId) {
      setLoading(false)
      return
    }

    // Проверяем доступ
    fetch(`/api/admin/check-access?telegramId=${user.telegramId}`)
      .then((res) => res.json())
      .then((accessData) => {
        if (accessData.authorized) {
          setAuthorized(true)
          // Загружаем статистику
          return fetch(`/api/admin/stats?telegram_id=${user.telegramId}`)
        }
        setLoading(false)
      })
      .then((statsRes) => statsRes?.json())
      .then((statsData) => {
        setStats(statsData)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Admin error:", error)
        setLoading(false)
      })
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl font-mono">Загрузка...</div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl font-mono p-6 bg-gray-800 rounded-lg shadow-lg">
          🚫 Доступ запрещён
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <h1 className="text-xl font-bold">👑 Админ панель</h1>
        <p className="text-gray-400 text-sm">Добро пожаловать, {user?.username}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="p-4 grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.totalUsers}</div>
            <div className="text-gray-400 text-sm">Пользователей</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{stats.totalGames}</div>
            <div className="text-gray-400 text-sm">Игр сыграно</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{stats.totalWithdrawals}</div>
            <div className="text-gray-400 text-sm">Выводов</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">${stats.totalBalance.toFixed(2)}</div>
            <div className="text-gray-400 text-sm">Общий баланс</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="p-4 space-y-3">
        <Link 
          href="/admin/users" 
          className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">👥 Пользователи</div>
              <div className="text-gray-400 text-sm">Управление аккаунтами</div>
            </div>
            <div className="text-gray-400">→</div>
          </div>
        </Link>

        <Link 
          href="/admin/withdraw-requests" 
          className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">💸 Заявки на вывод Imba Coin</div>
              <div className="text-gray-400 text-sm">Одобрение выводов через Telegram Stars</div>
            </div>
            <div className="text-gray-400">→</div>
      </div>
        </Link>

        <Link 
          href="/admin/games" 
          className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">🎮 История игр</div>
              <div className="text-gray-400 text-sm">Статистика и логи</div>
            </div>
            <div className="text-gray-400">→</div>
          </div>
        </Link>

        <Link 
          href="/admin/finance" 
          className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">💰 Финансы</div>
              <div className="text-gray-400 text-sm">Выводы и депозиты</div>
            </div>
            <div className="text-gray-400">→</div>
          </div>
        </Link>

        <Link 
          href="/admin/settings" 
          className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">⚙️ Настройки</div>
              <div className="text-gray-400 text-sm">Конфигурация системы</div>
            </div>
            <div className="text-gray-400">→</div>
                    </div>
        </Link>
      </div>
    </div>
  )
} 