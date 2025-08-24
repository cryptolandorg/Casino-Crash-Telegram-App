export function Stats({
  userHistory = [],
  sessionHistory = [],
}: {
  userHistory?: Array<{ multiplier: number; won: boolean; timestamp: number }>
  sessionHistory?: Array<{ multiplier: number; timestamp: number }>
}) {
  // Последние 5 игр пользователя
  const recentUserGames = userHistory.slice(-5)
  
  // Последние 15 коэффициентов сессии
  const recentSessionMultipliers = sessionHistory.slice(-15)

  return (
    <div className="space-y-3 pt-2 w-full">
      {/* История игр пользователя */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2">Мои последние игры</div>
        <div className="flex gap-1 overflow-x-auto">
          {recentUserGames.length > 0 ? (
            recentUserGames.map((game, index) => (
              <div
                key={index}
                className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold ${
                  game.won 
                    ? 'bg-green-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}
              >
                {game.multiplier.toFixed(2)}x
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500">Нет игр</div>
          )}
      </div>
      </div>

      {/* История коэффициентов сессии */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2">История коэффициентов</div>
        <div className="flex gap-1 overflow-x-auto">
          {recentSessionMultipliers.length > 0 ? (
            recentSessionMultipliers.map((game, index) => (
              <div
                key={index}
                className="flex-shrink-0 px-2 py-1 rounded text-xs font-bold bg-gray-700 text-white"
              >
                {game.multiplier.toFixed(2)}x
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500">Нет данных</div>
          )}
        </div>
      </div>
    </div>
  )
} 