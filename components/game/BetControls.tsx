import { Input } from "@/components/ui/input"
import { GameButton } from "../game-button"

interface BetControlsProps {
  betAmount: number
  setBetAmount: (n: number) => void
  isPlaying: boolean
  balance: number
  onPlay: () => void
  onCashOut: () => void
  gameStatus: "waiting" | "playing" | "crashed"
  cashedOut: boolean
  multiplier: number
  currency: 'imba' | 'demo'
}

export function BetControls({
  betAmount,
  setBetAmount,
  isPlaying,
  balance,
  onPlay,
  onCashOut,
  gameStatus,
  cashedOut,
  multiplier,
  currency,
}: BetControlsProps) {
  return (
    <div className="space-y-3 w-full">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Bet</label>
          <Input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            disabled={isPlaying}
            className="bg-gray-800 border-gray-600 text-white text-base"
            min="1"
            max={balance}
          />
        </div>
        <div className="flex flex-col gap-1 pt-4">
          <GameButton
            onClick={() => setBetAmount(Math.min(betAmount * 2, balance))}
            disabled={isPlaying}
            className="text-xs px-2 w-14"
          >
            2x
          </GameButton>
          <GameButton
            onClick={() => setBetAmount(Math.floor(balance))}
            disabled={isPlaying}
            className="text-xs px-2 w-14"
          >
            Max
          </GameButton>
        </div>
      </div>
      {/* Quick Bet Buttons */}
      <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
        {[5, 10, 25, 50].map((amount) => (
          <GameButton
            key={amount}
            onClick={() => setBetAmount(amount)}
            disabled={isPlaying || amount > balance}
            className="w-14 text-base flex items-center justify-center gap-1"
          >
            <span>{amount}</span>
            <span role="img" aria-label="diamond">💎</span>
          </GameButton>
        ))}
      </div>
      {/* Play/Cash Out Button */}
      <div className="pt-2">
        {gameStatus === "waiting" ? (
          <GameButton
            onClick={onPlay}
            disabled={betAmount > balance || betAmount <= 0}
            className="w-full h-12 text-base"
          >
            Bet {betAmount.toFixed(2)} {currency === 'imba' ? 'IC' : 'Demo'}
          </GameButton>
        ) : gameStatus === "playing" && !cashedOut ? (
          <GameButton onClick={onCashOut} className="w-full h-12 text-base">
            Cash Out {(betAmount * multiplier).toFixed(2)} {currency === 'imba' ? 'IC' : 'Demo'}
          </GameButton>
        ) : (
          <GameButton disabled className="w-full h-12 text-base">
            {gameStatus === "crashed" ? "Game Crashed!" : "Cashed Out!"}
          </GameButton>
        )}
      </div>
    </div>
  )
} 