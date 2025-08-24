"use client"

import { useStore } from "@/lib/store"
import Link from "next/link"
import { useEffect, useState } from "react"

interface User {
  telegram_id: number
  username: string
  balance: number
  created_at: string
  blocked: boolean
}

export default function UsersPage() {
  const { user } = useStore()
  const [authorized, setAuthorized] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

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
          return fetch(`/api/admin/users?telegram_id=${user.telegramId}`)
        }
        setLoading(false)
      })
      .then((usersRes) => usersRes?.json())
      .then((usersData) => {
        setUsers(usersData.users || [])
        setLoading(false)
      })
      .catch((error) => {
        console.error("Users error:", error)
        setLoading(false)
      })
  }, [user])

  const filteredUsers = users.filter(u => 
    u.telegram_id.toString().includes(searchTerm) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-white">
            ← Назад
          </Link>
          <h1 className="text-xl font-bold">👥 Пользователи</h1>
        </div>
        <p className="text-gray-400 text-sm mt-1">Всего: {users.length}</p>
      </div>

      {/* Search */}
      <div className="p-4">
        <input
          type="text"
          placeholder="Поиск по ID или username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Users List */}
      <div className="px-4 pb-4 space-y-3">
        {filteredUsers.map((user) => (
          <Link 
            key={user.telegram_id} 
            href={`/admin/users/${user.telegram_id}`}
            className="block bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">ID: {user.telegram_id}</div>
              <div className={`text-lg font-bold ${user.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${user.balance.toFixed(2)}
              </div>
            </div>
            <div className="text-gray-400 text-sm">
              @{user.username || 'Без username'}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              Регистрация: {new Date(user.created_at).toLocaleDateString()}
            </div>
            {user.blocked && (
              <div className="text-red-400 text-xs mt-1 font-semibold">🚫 Заблокирован</div>
            )}
          </Link>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="p-4 text-center text-gray-400">
          {searchTerm ? 'Пользователи не найдены' : 'Нет пользователей'}
        </div>
      )}
    </div>
  )
} 