"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useStore } from "@/lib/store"
import { useEffect, useState } from "react"

interface WithdrawRequest {
  id: string
  userId: string
  user: {
    telegramId: string
    username: string
    avatarUrl: string
    currentBalance: number
    totalBalance: number
  }
  amount: number
  username: string
  status: string
  createdAt: string
  approvedAt?: string
  approvedBy?: string
  statistics: {
    totalGames: number
    totalBets: number
    totalProfit: number
    totalDeposits: number
    totalWithdrawals: number
    ownerProfit: number
    winRate: number
  }
}

export default function WithdrawRequestsPage() {
  const { user } = useStore()
  const [authorized, setAuthorized] = useState(false)
  const [requests, setRequests] = useState<WithdrawRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [processing, setProcessing] = useState<string | null>(null)

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
          loadRequests()
        } else {
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error("Access check error:", error)
        setLoading(false)
      })
  }, [user])

  const loadRequests = () => {
    fetch(`/api/admin/withdraw-requests?telegram_id=${user?.telegramId}&status=${statusFilter}`)
      .then((res) => res.json())
      .then((data) => {
        setRequests(data.requests || [])
        setLoading(false)
      })
      .catch((error) => {
        console.error("Load requests error:", error)
        setLoading(false)
      })
  }

  const handleAction = async (requestId: string, action: "approve" | "reject") => {
    if (!user?.telegramId) return

    setProcessing(requestId)
    try {
      const res = await fetch("/api/admin/withdraw-requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          admin_id: user.telegramId
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert(`✅ ${data.message}`)
        loadRequests() // Перезагружаем список
      } else {
        alert(`❌ Ошибка: ${data.error}`)
      }
    } catch (error) {
      console.error("Action error:", error)
      alert("❌ Ошибка при выполнении действия")
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-600">⏳ Ожидает</Badge>
      case "approved":
        return <Badge className="bg-green-600">✅ Одобрено</Badge>
      case "rejected":
        return <Badge className="bg-red-600">❌ Отклонено</Badge>
      default:
        return <Badge className="bg-gray-600">{status}</Badge>
    }
  }

  const getProfitBadge = (profit: number) => {
    if (profit > 0) {
      return <Badge className="bg-green-600">+{profit.toFixed(2)} IC</Badge>
    } else if (profit < 0) {
      return <Badge className="bg-red-600">{profit.toFixed(2)} IC</Badge>
    } else {
      return <Badge className="bg-gray-600">0 IC</Badge>
    }
  }

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

  const pendingRequests = requests.filter(r => r.status === "pending")
  const otherRequests = requests.filter(r => r.status !== "pending")

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">💸 Заявки на вывод Imba Coin</h1>
        </div>
        <p className="text-gray-400 text-sm mt-1">
          Ручной перевод звёзд через рабочий аккаунт (комиссия 10%)
        </p>
      </div>

      {/* Filters */}
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          {[
            { value: "all", label: "Все", count: requests.length },
            { value: "pending", label: "Ожидают", count: pendingRequests.length },
            { value: "approved", label: "Одобрены", count: requests.filter(r => r.status === "approved").length },
            { value: "rejected", label: "Отклонены", count: requests.filter(r => r.status === "rejected").length }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-yellow-400">⏳ Ожидающие заявки</h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={request.user.avatarUrl} />
                          <AvatarFallback className="bg-gray-600">
                            {request.user.username?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">
                            {request.user.username ? `@${request.user.username}` : `ID: ${request.user.telegramId}`}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {new Date(request.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-400">
                          ⚡{request.amount} IC
                        </div>
                        <div className="text-sm text-gray-400">
                          К переводу: {request.username}
                        </div>
                      </div>
                    </div>

                    {/* Статистика пользователя */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                      <div className="bg-gray-700 rounded p-2">
                        <div className="text-gray-400">Игр сыграно</div>
                        <div className="font-semibold">{request.statistics.totalGames}</div>
                      </div>
                      <div className="bg-gray-700 rounded p-2">
                        <div className="text-gray-400">Винрейт</div>
                        <div className="font-semibold">{request.statistics.winRate}%</div>
                      </div>
                      <div className="bg-gray-700 rounded p-2">
                        <div className="text-gray-400">Текущий баланс</div>
                        <div className="font-semibold">{request.user.currentBalance.toFixed(2)} IC</div>
                      </div>
                      <div className="bg-gray-700 rounded p-2">
                        <div className="text-gray-400">Прибыль/убыток</div>
                        <div className="font-semibold">{getProfitBadge(request.statistics.ownerProfit)}</div>
                      </div>
                    </div>

                    {/* Дополнительная информация */}
                    <div className="bg-blue-900 border border-blue-600 rounded p-3 mb-4">
                      <div className="text-xs text-blue-200">
                        <div>💰 Общий баланс: {request.user.totalBalance.toFixed(2)} IC</div>
                        <div>🎮 Всего ставок: {request.statistics.totalBets.toFixed(2)} IC</div>
                        <div>📈 Прибыль игрока: {request.statistics.totalProfit.toFixed(2)} IC</div>
                        <div>💳 Депозитов: {request.statistics.totalDeposits.toFixed(2)} IC</div>
                        <div>💸 Выводов: {request.statistics.totalWithdrawals.toFixed(2)} IC</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAction(request.id, "approve")}
                        disabled={processing === request.id}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        size="sm"
                      >
                        {processing === request.id ? "Обработка..." : "✅ Одобрить"}
                      </Button>
                      <Button
                        onClick={() => handleAction(request.id, "reject")}
                        disabled={processing === request.id}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        size="sm"
                      >
                        {processing === request.id ? "Обработка..." : "❌ Отклонить"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Other Requests */}
        {otherRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">📋 История заявок</h2>
            <div className="space-y-3">
              {otherRequests.map((request) => (
                <Card key={request.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={request.user.avatarUrl} />
                          <AvatarFallback className="bg-gray-600">
                            {request.user.username?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">
                            {request.user.username ? `@${request.user.username}` : `ID: ${request.user.telegramId}`}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {new Date(request.createdAt).toLocaleString()}
                          </div>
                          {request.approvedAt && (
                            <div className="text-gray-400 text-xs">
                              Обработано: {new Date(request.approvedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-400">
                          ⚡{request.amount} IC
                        </div>
                        <div className="text-sm text-gray-400">
                          {request.username}
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {requests.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            {statusFilter === "all" ? "Нет заявок на вывод" : `Нет заявок со статусом "${statusFilter}"`}
          </div>
        )}
      </div>
    </div>
  )
} 