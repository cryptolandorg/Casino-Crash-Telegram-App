"use client"

import { useStore } from "@/lib/store"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Game {
  id: string
  telegram_id: number
  bet: number
  crash_point: number
  cashout: number | null
  profit: number
  status: "crashed" | "cashed_out"
  time: number
}

export default function GamesPage() {
  const { user } = useStore()
  const [authorized, setAuthorized] = useState(false)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

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
          loadGames()
        } else {
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error("Games error:", error)
        setLoading(false)
      })
  }, [user])

  const loadGames = (pageNum = 1) => {
    fetch(`/api/admin/games?telegram_id=${user?.telegramId}&page=${pageNum}&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        if (pageNum === 1) {
          setGames(data.logs || [])
        } else {
          setGames(prev => [...prev, ...(data.logs || [])])
        }
        setHasMore((data.logs || []).length === 20)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Load games error:", error)
        setLoading(false)
      })
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadGames(nextPage)
  }

  const filteredGames = games.filter(g => 
    g.telegram_id.toString().includes(searchTerm)
  )

  if (loading && games.length === 0) {
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
          <h1 className="text-xl font-bold">🎮 История игр</h1>
        </div>
        <p className="text-gray-400 text-sm mt-1">Всего: {games.length}</p>
      </div>

      {/* Search */}
      <div className="p-4">
        <input
          type="text"
          placeholder="Поиск по Telegram ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Games List */}
      <div className="px-4 pb-4 space-y-3">
        {filteredGames.map((game) => (
          <div key={game.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">ID: {game.telegram_id}</div>
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
                <div className="font-semibold">{game.crash_point.toFixed(2)}x</div>
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
              {new Date(game.time).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="p-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {loading ? 'Загрузка...' : 'Загрузить ещё'}
          </button>
        </div>
      )}

      {filteredGames.length === 0 && (
        <div className="p-4 text-center text-gray-400">
          {searchTerm ? 'Игры не найдены' : 'Нет игр'}
        </div>
      )}
    </div>
  )
} 