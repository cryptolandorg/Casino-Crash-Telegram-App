import { useEffect, useState } from 'react'

interface GameTimerProps {
  timeUntilStart: number
  onTimeUp: () => void
}

export function GameTimer({ timeUntilStart, onTimeUp }: GameTimerProps) {
  const [timeLeft, setTimeLeft] = useState(timeUntilStart)

  useEffect(() => {
    setTimeLeft(timeUntilStart)
  }, [timeUntilStart])

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = Math.max(0, prev - 1000)
        if (newTime <= 0) {
          clearInterval(timer)
          onTimeUp()
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onTimeUp])

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    return seconds.toString().padStart(2, '0')
  }

  const progress = timeUntilStart > 0 ? ((timeUntilStart - timeLeft) / timeUntilStart) * 100 : 0

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-cyan-400 mb-2">
        {formatTime(timeLeft)}
      </div>
      
      <div className="text-sm text-gray-400 mb-3">
        До старта ракеты
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {timeLeft <= 5000 && timeLeft > 0 && (
        <div className="mt-2 text-xs text-yellow-400 animate-pulse">
          Готовьтесь к запуску! 🚀
        </div>
      )}
    </div>
  )
} 