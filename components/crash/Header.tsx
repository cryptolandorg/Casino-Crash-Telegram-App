import { useStore } from "@/lib/store"
import { ArrowRightLeft, User as UserIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface HeaderProps {
  onBalanceClick?: () => void
  onSupportClick?: () => void
  currency?: 'imba' | 'demo'
  setCurrency?: (c: 'imba' | 'demo') => void
  balance: number
  demoBalance: number
  connected?: boolean
}

export function Header({ onBalanceClick, onSupportClick, currency = 'imba', setCurrency, balance, demoBalance, connected }: HeaderProps) {
  const { user } = useStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  // Имя для отображения
  let displayName = 'Imba Player'
  if (user) {
    if (user.username && user.username.trim()) {
      displayName = user.username
    } else if ((user.firstName && user.firstName.trim()) || (user.name && user.name.trim())) {
      displayName = user.firstName || user.name || 'Imba Player'
    }
  }

  return (
    <header className="flex items-center justify-between h-14 bg-gray-800 rounded-b-xl px-2 py-2 gap-1 flex-nowrap shadow-md">
      {/* Логотип/название */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-base font-bold text-yellow-400 whitespace-nowrap">🚀 Crash</span>
        {connected !== undefined && (
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} title={connected ? 'Подключено' : 'Отключено'} />
        )}
      </div>
      {/* Баланс с переключателем валюты */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-700 rounded-xl px-3 py-1 shadow border border-yellow-400 hover:bg-yellow-500/10 transition-colors min-w-[120px] max-w-[200px] cursor-pointer"
        style={{ height: 36 }}
        onClick={onBalanceClick}
      >
        {currency === 'imba' ? (
          <>
            <span className="text-yellow-400 text-lg">⚡</span>
            <span className="font-mono text-base text-white truncate">{balance.toFixed(2)}</span>
            <span className="text-xs text-yellow-300">IC</span>
          </>
        ) : (
          <>
            <span className="text-blue-400 text-lg">💎</span>
            <span className="font-mono text-base text-white truncate">{demoBalance?.toFixed(2) ?? '0.00'}</span>
            <span className="text-xs text-blue-300">Demo</span>
          </>
        )}
        {setCurrency && (
        <button
          className="ml-2 p-1 rounded-full bg-gray-600 hover:bg-blue-600 transition-colors z-10"
          onClick={e => { e.stopPropagation(); setCurrency(currency === 'imba' ? 'demo' : 'imba') }}
          title="Сменить валюту"
        >
          <ArrowRightLeft className="w-5 h-5 text-blue-400" />
        </button>
        )}
      </div>
      {/* Аватар и меню справа */}
      <div className="relative flex items-center min-w-0">
        <button
          className="flex items-center gap-1 bg-gray-700 rounded-full px-2 py-1 cursor-pointer hover:bg-gray-600 transition-colors shadow min-w-0"
          onClick={() => setIsMenuOpen((v) => !v)}
          style={{ height: 36 }}
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover border border-gray-500" />
          ) : (
            <UserIcon className="w-9 h-9 text-gray-400" />
          )}
          <span className="text-xs font-medium text-white truncate max-w-[60px]">{displayName}</span>
        </button>
        {isMenuOpen && (
          <>
            {/* Overlay для закрытия меню по клику вне */}
            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
            <div
              className="absolute right-2 top-12 min-w-[120px] bg-white rounded-xl shadow-xl py-2 z-50 font-sans font-bold text-base"
            >
              <button
                className="w-full text-gray-800 px-4 py-2 hover:bg-gray-100 text-left"
                onClick={() => {
                  setIsMenuOpen(false)
                  router.push("/profile")
                }}
              >
                Profile
              </button>
              <button
                className="w-full text-gray-800 px-4 py-2 hover:bg-gray-100 text-left"
                onClick={() => {
                  setIsMenuOpen(false)
                  onSupportClick?.()
                }}
              >
                Support
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
} 