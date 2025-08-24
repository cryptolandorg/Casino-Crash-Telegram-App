"use client"

import { useStore } from "@/lib/store"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

interface UserDetails {
  id: string
  telegramId: string
  username: string
  avatarUrl: string
  balance: number
  phone: string
  phoneVerified: boolean
  tonWallet: string
  blocked: boolean
  createdAt: string
  updatedAt: string
}

interface UserGame {
  id: string
  bet: number
  crashPoint: number
  cashout: number | null
  profit: number
  status: string
  createdAt: string
}

interface UserDeposit {
  id: string
  amount: number
  hash: string
  from: string
  createdAt: string
}

interface UserWithdrawal {
  id: string
  amount: number
  method: string
  status: string
  createdAt: string
}

export default function UserDetailsPage() {
  const { user } = useStore()
  const params = useParams()
  const userId = params.id as string
  
  const [authorized, setAuthorized] = useState(false)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [games, setGames] = useState<UserGame[]>([])
  const [deposits, setDeposits] = useState<UserDeposit[]>([])
  const [withdrawals, setWithdrawals] = useState<UserWithdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'deposits' | 'withdrawals'>('overview')
  
  // Состояние для управления балансом
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [balanceAction, setBalanceAction] = useState<'set' | 'add' | 'subtract'>('add')
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceProcessing, setBalanceProcessing] = useState(false)

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
          loadUserData()
        } else {
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error("User details error:", error)
        setLoading(false)
      })
  }, [user, userId])

  const loadUserData = () => {
    Promise.all([
      fetch(`/api/admin/users/${userId}?telegram_id=${user?.telegramId}`).then(res => res.json()),
      fetch(`/api/admin/users/${userId}/games?telegram_id=${user?.telegramId}`).then(res => res.json()),
      fetch(`/api/admin/users/${userId}/deposits?telegram_id=${user?.telegramId}`).then(res => res.json()),
      fetch(`/api/admin/users/${userId}/withdrawals?telegram_id=${user?.telegramId}`).then(res => res.json())
    ])
    .then(([userData, gamesData, depositsData, withdrawalsData]) => {
      setUserDetails(userData.user)
      setGames(gamesData.games || [])
      setDeposits(depositsData.deposits || [])
      setWithdrawals(withdrawalsData.withdrawals || [])
      setLoading(false)
    })
    .catch((error) => {
      console.error("Load user data error:", error)
      setLoading(false)
    })
  }

  const handleBlockUser = async () => {
    if (!userDetails) return
    
    setProcessing('block')
    try {
      const res = await fetch("/api/admin/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: userDetails.id,
          blocked: !userDetails.blocked,
          admin_id: user?.telegramId 
        }),
      })

      const data = await res.json()
      if (data.success) {
        setUserDetails(prev => prev ? { ...prev, blocked: !prev.blocked } : null)
      } else {
        alert("❌ Ошибка: " + data.error)
      }
    } catch (error) {
      console.error("Block user error:", error)
      alert("❌ Ошибка при выполнении действия")
    } finally {
      setProcessing(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!userDetails) return
    
    if (!confirm(`Удалить пользователя ${userDetails.username || userDetails.telegramId}? Это действие нельзя отменить!`)) {
      return
    }
    
    setProcessing('delete')
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: userDetails.id,
          admin_id: user?.telegramId 
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert("✅ Пользователь удалён")
        window.location.href = "/admin/users"
      } else {
        alert("❌ Ошибка: " + data.error)
      }
    } catch (error) {
      console.error("Delete user error:", error)
      alert("❌ Ошибка при удалении")
    } finally {
      setProcessing(null)
    }
  }

  const handleBalanceAction = async () => {
    if (!userDetails || !user?.telegramId) return

    const amount = parseFloat(balanceAmount)
    if (isNaN(amount) || amount < 0 || amount > 999999999) {
      alert("❌ Сумма должна быть от 0 до 999,999,999")
      return
    }

    if (balanceAction === 'subtract' && amount > userDetails.balance) {
      alert("❌ Недостаточно средств для списания")
      return
    }

    if (!confirm(`Подтвердите операцию: ${balanceAction === 'set' ? 'Установить' : balanceAction === 'add' ? 'Добавить' : 'Списать'} ${amount} IC пользователю ${userDetails.username || userDetails.telegramId}?`)) {
      return
    }

    setBalanceProcessing(true)
    try {
      const res = await fetch("/api/admin/users/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userDetails.id,
          action: balanceAction,
          amount: amount,
          admin_id: user.telegramId
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert(`✅ ${data.message}`)
        setUserDetails(prev => prev ? { ...prev, balance: data.newBalance } : null)
        setShowBalanceModal(false)
        setBalanceAmount('')
      } else {
        alert("❌ Ошибка: " + data.error)
      }
    } catch (error) {
      console.error("Balance action error:", error)
      alert("❌ Ошибка при выполнении операции")
    } finally {
      setBalanceProcessing(false)
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

  if (!userDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl font-mono p-6 bg-gray-800 rounded-lg shadow-lg">
          Пользователь не найден
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/users" className="text-gray-400 hover:text-white">
            ← Назад к списку
          </Link>
          <h1 className="text-xl font-bold">👤 Детали пользователя</h1>
        </div>
        <p className="text-gray-400 text-sm mt-1">
          {userDetails.username ? `@${userDetails.username}` : `ID: ${userDetails.telegramId}`}
        </p>
      </div>

      {/* User Info */}
      <div className="p-4">
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-4 mb-4">
            {userDetails.avatarUrl && (
              <img 
                src={userDetails.avatarUrl} 
                alt="Avatar" 
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h2 className="text-xl font-bold">
                {userDetails.username ? `@${userDetails.username}` : `ID: ${userDetails.telegramId}`}
              </h2>
              <div className="text-gray-400 text-sm">
                Telegram ID: {userDetails.telegramId}
              </div>
              {userDetails.blocked && (
                <div className="text-red-400 text-sm font-semibold">🚫 Заблокирован</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Баланс</div>
              <div className="text-xl font-bold text-green-400">⚡{userDetails.balance.toFixed(2)} IC</div>
            </div>
            <div>
              <div className="text-gray-400">Телефон</div>
              <div className="font-mono text-xs">
                {userDetails.phoneVerified ? userDetails.phone : 'Не подтверждён'}
              </div>
            </div>
            <div>
              <div className="text-gray-400">TON Кошелек</div>
              <div className="font-mono text-xs">
                {userDetails.tonWallet || 'Не подключен'}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Регистрация</div>
              <div className="text-sm">
                {new Date(userDetails.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setShowBalanceModal(true)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors font-semibold"
          >
            💰 Управление балансом
          </button>
          
          <button
            onClick={handleBlockUser}
            disabled={processing === 'block'}
            className={`flex-1 py-3 rounded-lg transition-colors font-semibold ${
              userDetails.blocked
                ? 'bg-green-600 hover:bg-green-700 disabled:opacity-50'
                : 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
            }`}
          >
            {processing === 'block' ? 'Обработка...' : userDetails.blocked ? '✅ Разблокировать' : '🚫 Заблокировать'}
          </button>
          
          <button
            onClick={handleDeleteUser}
            disabled={processing === 'delete'}
            className="flex-1 py-3 bg-red-800 hover:bg-red-900 disabled:opacity-50 rounded-lg transition-colors font-semibold"
          >
            {processing === 'delete' ? 'Удаление...' : '🗑️ Удалить'}
          </button>
        </div>

        {/* Balance Modal */}
        {showBalanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">💰 Управление балансом</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Действие</label>
                  <select 
                    value={balanceAction}
                    onChange={(e) => setBalanceAction(e.target.value as any)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="add">Добавить</option>
                    <option value="subtract">Списать</option>
                    <option value="set">Установить</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Сумма (0-999,999,999)</label>
                  <input
                    type="number"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    min="0"
                    max="999999999"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Введите сумму"
                  />
                </div>
                
                <div className="text-sm text-gray-400">
                  Текущий баланс: {userDetails.balance.toFixed(2)} IC
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleBalanceAction}
                  disabled={balanceProcessing || !balanceAmount}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-semibold"
                >
                  {balanceProcessing ? 'Обработка...' : 'Подтвердить'}
                </button>
                <button
                  onClick={() => {
                    setShowBalanceModal(false)
                    setBalanceAmount('')
                  }}
                  className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded font-semibold"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
          {[
            { id: 'overview', label: '📊 Обзор', count: null },
            { id: 'games', label: '🎮 Игры', count: games.length },
            { id: 'deposits', label: '💰 Депозиты', count: deposits.length },
            { id: 'withdrawals', label: '💸 Выводы', count: withdrawals.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label} {tab.count !== null && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-3">
          {activeTab === 'overview' && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">📊 Статистика</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{games.length}</div>
                  <div className="text-gray-400 text-sm">Всего игр</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{deposits.length}</div>
                  <div className="text-gray-400 text-sm">Депозитов</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{withdrawals.length}</div>
                  <div className="text-gray-400 text-sm">Выводов</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    ${games.reduce((sum, g) => sum + g.profit, 0).toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-sm">Общая прибыль</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div>
              {games.map((game) => (
                <div key={game.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Игра #{game.id}</div>
                    <div className={`text-sm px-2 py-1 rounded ${
                      game.status === 'cashed_out' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {game.status === 'cashed_out' ? 'Выигрыш' : 'Проигрыш'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Ставка</div>
                      <div className="font-semibold">${game.bet.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Крэш</div>
                      <div className="font-semibold">{game.crashPoint.toFixed(2)}x</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Вывод</div>
                      <div className="font-semibold">
                        {game.cashout ? `${game.cashout.toFixed(2)}x` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Прибыль</div>
                      <div className={`font-semibold ${game.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${game.profit.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-gray-500 text-xs mt-2">
                    {new Date(game.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              
              {games.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  Нет игр
                </div>
              )}
            </div>
          )}

          {activeTab === 'deposits' && (
            <div>
              {deposits.map((deposit) => (
                <div key={deposit.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Депозит #{deposit.id}</div>
                    <div className="text-lg font-bold text-green-400">
                      ${deposit.amount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-gray-400">Хэш:</span>
                      <span className="font-mono text-xs ml-2">{deposit.hash}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">От:</span>
                      <span className="font-mono text-xs ml-2">{deposit.from}</span>
                    </div>
                  </div>
                  
                  <div className="text-gray-500 text-xs mt-2">
                    {new Date(deposit.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              
              {deposits.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  Нет депозитов
                </div>
              )}
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div>
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Вывод #{withdrawal.id}</div>
                    <div className="text-lg font-bold text-yellow-300">
                      ${withdrawal.amount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-400">
                      Метод: {withdrawal.method}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      withdrawal.status === 'approved' 
                        ? 'bg-green-600 text-white' 
                        : withdrawal.status === 'rejected'
                        ? 'bg-red-600 text-white'
                        : 'bg-yellow-600 text-white'
                    }`}>
                      {withdrawal.status === 'approved' ? 'Одобрен' : 
                       withdrawal.status === 'rejected' ? 'Отклонён' : 'Ожидает'}
                    </div>
                  </div>
                  
                  <div className="text-gray-500 text-xs mt-2">
                    {new Date(withdrawal.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              
              {withdrawals.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  Нет выводов
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 