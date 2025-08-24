import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Player {
  id: string
  username: string
  avatarUrl?: string
  bet?: number
  cashout?: number
  profit?: number
  status?: 'waiting' | 'playing' | 'cashed_out' | 'crashed'
}

interface PlayerListProps {
  players: Player[]
  currentMultiplier: number
}

export function PlayerList({ players, currentMultiplier }: PlayerListProps) {
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Игроки в лобби ({players.length})</h3>
      
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {players.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            Пока нет игроков
          </div>
        ) : (
          players.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={player.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {player.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-300 truncate max-w-20">
                  {player.username || 'Anonymous'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {player.bet && (
                  <span className="text-xs text-cyan-400">
                    {player.bet.toFixed(2)}
                  </span>
                )}
                
                {player.status === 'playing' && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400">
                      {currentMultiplier.toFixed(2)}x
                    </span>
                  </div>
                )}
                
                {player.status === 'cashed_out' && player.cashout && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-green-400">
                      {player.cashout.toFixed(2)}x
                    </span>
                  </div>
                )}
                
                {player.status === 'crashed' && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-xs text-red-400">CRASH</span>
                  </div>
                )}
                
                {player.profit && player.profit > 0 && (
                  <span className="text-xs text-green-400">
                    +{player.profit.toFixed(2)}
                  </span>
                )}
                
                {player.profit && player.profit < 0 && (
                  <span className="text-xs text-red-400">
                    {player.profit.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 