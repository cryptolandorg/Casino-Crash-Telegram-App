'use client';

import { useEffect, useState } from 'react';

interface Game {
  id: number;
  bet: number;
  cashout: number | null;
  profit: number;
  status: string;
  crashPoint: number | null;
  createdAt: string;
}

interface GameHistoryProps {
  userId?: string;
}

export default function GameHistory({ userId }: GameHistoryProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchGames = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/profile/games?telegram_id=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setGames(data.games || []);
        }
      } catch (error) {
        console.error('Error fetching games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">История игр</h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">История игр</h3>
        <p className="text-gray-400 text-center">Нет завершенных игр</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-2 sm:p-4 w-full max-w-[483px] mx-auto">
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-4">История игр</h3>
      <div className="space-y-2">
        {games.map((game) => (
          <div key={game.id} className="flex justify-between items-center p-2 bg-gray-700 rounded shadow gap-2">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${game.status === 'cashed_out' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <div className="text-white text-sm sm:text-base">
                  Ставка: {game.bet.toFixed(2)}
                </div>
                {game.cashout && (
                  <div className="text-green-400 text-xs sm:text-sm">
                    Выведено на {game.cashout.toFixed(2)}x
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm sm:text-base font-semibold ${game.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {game.profit >= 0 ? '+' : ''}{game.profit.toFixed(2)}
              </div>
              {game.crashPoint && (
                <div className="text-gray-400 text-xs sm:text-sm">
                  Краш: {game.crashPoint.toFixed(2)}x
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 