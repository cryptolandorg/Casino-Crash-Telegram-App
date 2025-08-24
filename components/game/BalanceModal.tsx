import { Input } from "@/components/ui/input"
import { useState } from "react"
import { GameButton } from "../game-button"

export function BalanceModal({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  withdrawAmount,
  setWithdrawAmount,
  withdrawAddress,
  setWithdrawAddress,
  onWithdraw,
  onWithdrawImba,
  balance,
  copyToClipboard,
  onBuyImbaCoin,
}: {
  isOpen: boolean
  onClose: () => void
  activeTab: "deposit" | "withdraw"
  setActiveTab: (tab: "deposit" | "withdraw") => void
  withdrawAmount: string
  setWithdrawAmount: (v: string) => void
  withdrawAddress: string
  setWithdrawAddress: (v: string) => void
  onWithdraw: () => void
  onWithdrawImba?: () => void
  balance: number
  copyToClipboard: (text: string) => void
  onBuyImbaCoin: (amount: number) => void
}) {
  const [starsAmount, setStarsAmount] = useState(50)
  const [withdrawMethod, setWithdrawMethod] = useState<'ton' | 'stars'>('stars')
  const [withdrawUsername, setWithdrawUsername] = useState('')
  
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Balance Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 py-3 px-4 text-center transition-colors ${activeTab === "deposit" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 py-3 px-4 text-center transition-colors ${activeTab === "withdraw" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
          >
            Withdraw
          </button>
        </div>
        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "deposit" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Пополнение через Stars</label>
                <Input
                  type="number"
                  min={50}
                  value={starsAmount}
                  onChange={e => setStarsAmount(Number(e.target.value))}
                  className="bg-gray-800 border-gray-600 text-white mb-2"
                  placeholder="Сумма в Stars (мин. 50)"
                />
                <GameButton
                  className="w-full mt-2"
                  onClick={() => onBuyImbaCoin(starsAmount)}
                  disabled={starsAmount < 50}
                >
                  Купить Imba Coin за {starsAmount} Stars
                </GameButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-3 mb-4">
                <div className="text-sm text-gray-400">Available Balance</div>
                <div className="text-lg font-bold text-green-400"><span className="text-yellow-400 mr-1">⚡</span>{balance.toFixed(2)} IC</div>
              </div>
              
              {/* Withdraw Method Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Метод вывода</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWithdrawMethod('stars')}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                      withdrawMethod === 'stars'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🌟 Telegram Stars
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('ton')}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                      withdrawMethod === 'ton'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    💎 TON Wallet
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Сумма вывода (IC) {withdrawMethod === 'stars' && '(50-10,000)'}
                </label>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Введите сумму"
                  className="bg-gray-700 border-gray-600 text-white"
                  min={withdrawMethod === 'stars' ? 50 : 1}
                  max={withdrawMethod === 'stars' ? 10000 : balance}
                />
              </div>

              {withdrawMethod === 'stars' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Ваш Telegram username</label>
                  <Input
                    type="text"
                    value={withdrawUsername}
                    onChange={(e) => setWithdrawUsername(e.target.value)}
                    placeholder="@your_username"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Укажите username для перевода звёзд
                  </div>
                </div>
              )}

              {withdrawMethod === 'ton' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">TON Кошелек</label>
                  <Input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder="Введите адрес TON кошелька"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              )}

              {withdrawMethod === 'stars' && (
                <div className="bg-blue-900 border border-blue-600 rounded-lg p-3">
                  <div className="text-xs text-blue-200">
                    🌟 Вывод через Telegram Stars<br/>
                    • Минимум: 50 IC<br/>
                    • Максимум: 10,000 IC<br/>
                    • Комиссия: 10%<br/>
                    • Требуется подтверждение телефона<br/>
                    • Ручная обработка администратором
                  </div>
                </div>
              )}

              {withdrawMethod === 'ton' && (
                <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-3">
                  <div className="text-xs text-yellow-200">⚠️ Вывод средств может занять до 24 часов</div>
                </div>
              )}

              <GameButton
                className="w-full"
                onClick={withdrawMethod === 'stars' ? onWithdrawImba : onWithdraw}
                disabled={!withdrawAmount || (withdrawMethod === 'ton' && !withdrawAddress) || (withdrawMethod === 'stars' && !withdrawUsername)}
              >
                {withdrawMethod === 'stars' ? 'Запросить вывод Stars' : 'Запросить вывод TON'}
              </GameButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 