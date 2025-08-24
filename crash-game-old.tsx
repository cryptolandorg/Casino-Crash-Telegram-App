"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Coins, TrendingUp, Zap } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { GameButton } from "./game-button"

interface ChartData {
  time: number
  multiplier: number
}

interface Star {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  layer: "back" | "front"
}

interface Planet {
  id: number
  x: number
  y: number
  size: number
  type: 1 | 2
  speed: number
  lastSpawnY: number // Добавить для отслеживания расстояний
}

interface Cloud {
  id: number
  x: number
  y: number
  size: number
  initialY: number
}

export default function CrashGame() {
  const [balance, setBalance] = useState(1250.5)
  const [betAmount, setBetAmount] = useState(10)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0)
  const [chartData, setChartData] = useState<ChartData[]>([{ time: 0, multiplier: 1.0 }])
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "crashed">("waiting")
  const [crashPoint, setCrashPoint] = useState<number | null>(null)
  const [cashedOut, setCashedOut] = useState(false)
  const [cashOutMultiplier, setCashOutMultiplier] = useState<number | null>(null)
  const [stars, setStars] = useState<Star[]>([])
  const [planets, setPlanets] = useState<Planet[]>([])
  const [clouds, setClouds] = useState<Cloud[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<number | null>(null)
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false)
  const [activeBalanceTab, setActiveBalanceTab] = useState<"deposit" | "withdraw">("deposit")

  // Initialize stars with layers
  useEffect(() => {
    const newStars: Star[] = []
    for (let i = 0; i < 120; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.8 + 0.2,
        opacity: Math.random() * 0.8 + 0.2,
        layer: Math.random() > 0.6 ? "front" : "back",
      })
    }
    setStars(newStars)

    // Initialize clouds
    const newClouds: Cloud[] = []
    for (let i = 0; i < 6; i++) {
      const initialY = Math.random() * 80 + 10
      newClouds.push({
        id: i,
        x: Math.random() * 80 + 10,
        y: initialY,
        initialY: initialY,
        size: Math.random() * 20 + 40,
      })
    }
    setClouds(newClouds)

    // Initialize planets (more frequent - 70% chance)
    const newPlanets: Planet[] = []
    if (Math.random() > 0.3) {
      let lastY = -50
      const planetCount = Math.floor(Math.random() * 3) + 1

      for (let i = 0; i < planetCount; i++) {
        const minDistance = Math.max(50, 80)
        const randomDistance = Math.random() * 60 + minDistance
        lastY -= randomDistance

        const planetType = Math.random() > 0.5 ? 1 : 2
        const finalType = i > 0 && newPlanets[i - 1].type === planetType ? (planetType === 1 ? 2 : 1) : planetType

        // Размер планеты влияет на скорость
        const size = Math.random() * 50 + 40 // от 40 до 90
        const speed = ((size - 40) / 50) * 0.8 + 0.4 // от 0.4 до 1.2 в зависимости от размера

        newPlanets.push({
          id: i,
          x: Math.random() * 60 + 20,
          y: lastY,
          size: size,
          type: finalType,
          speed: speed,
          lastSpawnY: lastY,
        })
      }
    }
    setPlanets(newPlanets)
  }, [])

  // Animate stars, planets, and clouds
  useEffect(() => {
    if (gameStatus === "playing") {
      const animate = () => {
        // Animate stars in space (faster) - звезды появляются с 3x
        if (currentMultiplier > 3) {
          setStars((prevStars) =>
            prevStars.map((star) => ({
              ...star,
              y: star.y + star.speed * 1.5 > 105 ? -5 : star.y + star.speed * 1.5,
              opacity: Math.sin(Date.now() * 0.002 + star.id) * 0.3 + 0.7,
            })),
          )
        }

        // Animate planets (faster) - планеты появляются с 9x
        if (currentMultiplier > 9) {
          setPlanets((prevPlanets) => {
            // Прогрессивная частота генерации планет
            const planetFrequency = Math.min((currentMultiplier - 9) / 11, 1) // от 0 до 1 (9x до 20x)
            const spawnChance = 0.3 + planetFrequency * 0.6 // от 30% до 90%

            // Если планет нет или они все ушли за экран, создать новые
            const visiblePlanets = prevPlanets.filter((planet) => planet.y < 120)

            if (visiblePlanets.length === 0 && Math.random() < spawnChance) {
              // Создать новые планеты сразу
              const newPlanets: Planet[] = []
              let lastY = -50
              const maxPlanets = Math.floor(1 + planetFrequency * 2) // от 1 до 3 планет
              const planetCount = Math.floor(Math.random() * maxPlanets) + 1

              for (let i = 0; i < planetCount; i++) {
                const minDistance = Math.max(50, 80 - planetFrequency * 30) // Уменьшаем расстояние с ростом частоты
                const randomDistance = Math.random() * (60 - planetFrequency * 20) + minDistance
                lastY -= randomDistance

                const planetType = Math.random() > 0.5 ? 1 : 2
                const finalType =
                  i > 0 && newPlanets[i - 1].type === planetType ? (planetType === 1 ? 2 : 1) : planetType

                // Размер планеты влияет на скорость
                const size = Math.random() * 50 + 40 // от 40 до 90
                const speed = ((size - 40) / 50) * 0.8 + 0.4 // от 0.4 до 1.2 в зависимости от размера

                newPlanets.push({
                  id: Date.now() + i,
                  x: Math.random() * 60 + 20,
                  y: lastY,
                  size: size,
                  type: finalType,
                  speed: speed,
                  lastSpawnY: lastY,
                })
              }
              return newPlanets
            }

            // Анимировать существующие планеты
            return prevPlanets
              .map((planet) => {
                const newY = planet.y + planet.speed * 1.2 // Используем индивидуальную скорость планеты
                if (newY > 120) {
                  return null
                }
                return { ...planet, y: newY }
              })
              .filter(Boolean) as Planet[]
          })
        }

        // Animate clouds (move down faster as rocket goes up)
        if (currentMultiplier <= 3.5) {
          setClouds((prevClouds) =>
            prevClouds.map((cloud) => ({
              ...cloud,
              y: cloud.initialY + (currentMultiplier - 1) * 20, // Faster movement (was 15)
            })),
          )
        }

        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      // Reset clouds position
      setClouds((prevClouds) =>
        prevClouds.map((cloud) => ({
          ...cloud,
          y: cloud.initialY,
        })),
      )
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameStatus, currentMultiplier])

  const startGame = () => {
    if (betAmount > balance) return

    setBalance((prev) => prev - betAmount)
    setIsPlaying(true)
    setGameStatus("playing")
    setCurrentMultiplier(1.0)
    setChartData([{ time: 0, multiplier: 1.0 }])
    setCrashPoint(Math.random() * 10 + 1.1)
    setCashedOut(false)
    setCashOutMultiplier(null)

    let time = 0
    intervalRef.current = setInterval(() => {
      time += 100
      const multiplier = 1 + (time / 1000) * 0.5 + Math.pow(time / 1000, 1.5) * 0.1

      setCurrentMultiplier(multiplier)
      setChartData((prev) => [...prev, { time: time / 1000, multiplier }])

      if (crashPoint && multiplier >= crashPoint) {
        endGame(true)
      }
    }, 100)
  }

  const cashOut = () => {
    if (gameStatus === "playing" && !cashedOut) {
      setCashedOut(true)
      setCashOutMultiplier(currentMultiplier)
      setBalance((prev) => prev + betAmount * currentMultiplier)
      endGame(false)
    }
  }

  const endGame = (crashed: boolean) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setIsPlaying(false)
    setGameStatus(crashed ? "crashed" : "waiting")

    setTimeout(() => {
      setGameStatus("waiting")
      setChartData([{ time: 0, multiplier: 1.0 }])
      setCurrentMultiplier(1.0)
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Determine background based on multiplier with smooth transition
  const isInSpace = currentMultiplier > 3 && gameStatus === "playing"
  const isPlanetZone = currentMultiplier > 9 && gameStatus === "playing"
  const transitionProgress = Math.min(Math.max((currentMultiplier - 2.5) / 2, 0), 1) // Smoother transition from 2.5x to 4.5x

  const skyOpacity = gameStatus === "playing" ? Math.max(0.8 - transitionProgress * 0.8, 0) : 0.3
  const spaceOpacity = gameStatus === "playing" ? Math.min(transitionProgress * 0.8, 0.8) : 0

  // Calculate rocket position
  const rocketY = Math.min((currentMultiplier - 1) * 12, 80)

  // Cloud component with three bumps
  const CloudComponent = ({ cloud }: { cloud: Cloud }) => (
    <div
      className="absolute opacity-30 transition-all duration-200"
      style={{
        left: `${cloud.x}%`,
        top: `${cloud.y}%`,
        animation: `float 4s ease-in-out infinite`,
        animationDelay: `${cloud.id * 0.5}s`,
      }}
    >
      <svg width={cloud.size} height={cloud.size * 0.6} viewBox="0 0 100 60" className="fill-white">
        <ellipse cx="25" cy="40" rx="20" ry="15" />
        <ellipse cx="50" cy="30" rx="25" ry="20" />
        <ellipse cx="75" cy="40" rx="20" ry="15" />
        <rect x="5" y="40" width="90" height="15" />
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 max-w-md mx-auto" style={{ fontFamily: "Coiny, cursive" }}>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Coiny&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-400" />
          <span className="text-xl font-bold">Crash</span>
        </div>
        <div
          className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-600 transition-colors"
          onClick={() => setIsBalanceModalOpen(true)}
        >
          <Coins className="h-4 w-4 text-yellow-400" />
          <span className="font-mono text-lg">${balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Rocket Animation Area */}
      <Card className="bg-gray-800 border-gray-700 p-4 mb-6 relative overflow-hidden">
        <div className="text-center mb-4 relative z-10">
          <div className="text-4xl font-bold mb-2">
            {gameStatus === "crashed" ? (
              <span className="text-red-400">{crashPoint?.toFixed(2)}x CRASHED!</span>
            ) : cashedOut ? (
              <span className="text-green-400">{cashOutMultiplier?.toFixed(2)}x CASHED OUT!</span>
            ) : (
              <span className={`${gameStatus === "playing" ? "text-green-400" : "text-gray-400"}`}>
                {currentMultiplier.toFixed(2)}x
              </span>
            )}
          </div>
        </div>

        {/* Potential Win - Bottom Right Corner */}
        {gameStatus === "playing" && (
          <div className="absolute bottom-4 right-4 z-20">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg px-3 py-2 border-2 border-purple-400 shadow-lg">
              <div className="text-xs text-purple-200 font-semibold">Potential Win</div>
              <div className="text-sm font-bold text-white">${(betAmount * currentMultiplier).toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Sky Background */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-blue-400 via-blue-300 to-blue-100 transition-all duration-2000 ease-in-out"
          style={{ opacity: skyOpacity }}
        />

        {/* Space Background */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-purple-900 via-blue-900 to-black transition-all duration-2000 ease-in-out"
          style={{ opacity: spaceOpacity }}
        />

        {/* Background Stars (behind planets) - появляются в космосе с 3x */}
        {isInSpace && (
          <div className="absolute inset-0">
            {stars
              .filter((star) => star.layer === "back")
              .map((star) => (
                <div key={`back-${star.id}`}>
                  <div
                    className="absolute rounded-full bg-white"
                    style={{
                      left: `${star.x}%`,
                      top: `${star.y}%`,
                      width: `${star.size}px`,
                      height: `${star.size}px`,
                      opacity: star.opacity * 0.8,
                      boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, ${star.opacity * 0.3})`,
                    }}
                  />
                  <div
                    className="absolute h-px bg-gradient-to-b from-white to-transparent"
                    style={{
                      left: `${star.x}%`,
                      top: `${star.y}%`,
                      height: `${star.speed * 15}px`,
                      width: "1px",
                      opacity: star.opacity * 0.4,
                    }}
                  />
                </div>
              ))}
          </div>
        )}

        {/* Planets (middle layer) - появляются только с 9x */}
        {isPlanetZone && (
          <div className="absolute inset-0">
            {planets.map((planet) => (
              <div
                key={planet.id}
                className="absolute transition-transform duration-100 ease-linear"
                style={{
                  left: `${planet.x}%`,
                  top: `${planet.y}%`,
                  width: `${planet.size}px`,
                  height: `${planet.size}px`,
                  filter: `drop-shadow(0 0 ${planet.size * 0.3}px rgba(100, 200, 255, 0.4))`,
                }}
              >
                <img
                  src={`/planet${planet.type}.png`}
                  alt={`Planet ${planet.type}`}
                  className="w-full h-full object-contain"
                  style={{
                    animation: `planetRotate ${10 + planet.id * 2}s linear infinite`,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Foreground Stars (in front of planets) - появляются в космосе с 3x */}
        {isInSpace && (
          <div className="absolute inset-0">
            {stars
              .filter((star) => star.layer === "front")
              .map((star) => (
                <div key={`front-${star.id}`}>
                  <div
                    className="absolute rounded-full bg-white"
                    style={{
                      left: `${star.x}%`,
                      top: `${star.y}%`,
                      width: `${star.size}px`,
                      height: `${star.size}px`,
                      opacity: star.opacity,
                      boxShadow: `0 0 ${star.size * 3}px rgba(255, 255, 255, ${star.opacity * 0.5})`,
                      zIndex: 10,
                    }}
                  />
                  <div
                    className="absolute h-px bg-gradient-to-b from-white to-transparent"
                    style={{
                      left: `${star.x}%`,
                      top: `${star.y}%`,
                      height: `${star.speed * 20}px`,
                      width: "1px",
                      opacity: star.opacity * 0.6,
                      zIndex: 10,
                    }}
                  />
                </div>
              ))}
          </div>
        )}

        {/* Sky clouds (only when in sky - disappear earlier) */}
        {currentMultiplier <= 3.5 && gameStatus === "playing" && transitionProgress < 0.5 && (
          <div className="absolute inset-0" style={{ opacity: 1 - transitionProgress }}>
            {clouds.map((cloud) => (
              <CloudComponent key={cloud.id} cloud={cloud} />
            ))}
          </div>
        )}

        {/* Rocket Animation */}
        <div className="relative h-48 w-full flex items-end justify-center">
          {gameStatus === "crashed" ? (
            <div className="relative">
              <img
                src="/explosion.png"
                alt="Explosion"
                className="w-24 h-24 object-contain"
                style={{
                  animation: "explosion 0.5s ease-out",
                }}
              />
              <div className="absolute inset-0 w-24 h-24 bg-orange-500 rounded-full opacity-50 animate-ping" />
            </div>
          ) : (
            <div className="relative">
              <img
                src="/rocket.png"
                alt="Rocket"
                className="w-16 h-20 object-contain transition-all duration-200 relative z-10"
                style={{
                  transform: `
                    translateY(${-rocketY}px)
                    scale(${Math.min(1 + (currentMultiplier - 1) * 0.08, 1.4)})
                    rotate(${Math.sin(Date.now() * 0.005) * 3}deg)
                  `,
                  filter: gameStatus === "playing" ? "brightness(1.1)" : "none",
                }}
              />

              {/* Rocket Fire Trail - follows rocket */}
              {gameStatus === "playing" && (
                <div
                  className="absolute left-1/2 transform -translate-x-1/2 transition-all duration-200"
                  style={{
                    bottom: "-8px",
                    transform: `
                      translateX(-50%) 
                      translateY(${-rocketY}px)
                    `,
                    zIndex: 5, // Огонь на среднем слое
                  }}
                >
                  <div
                    className="w-4 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full opacity-90"
                    style={{
                      animation: "flicker 0.1s infinite alternate",
                      height: `${Math.min(32 + (currentMultiplier - 1) * 4, 48)}px`,
                    }}
                  />
                  <div
                    className="absolute top-2 left-1/2 transform -translate-x-1/2 w-2 bg-gradient-to-t from-red-500 via-orange-400 to-transparent rounded-full"
                    style={{
                      animation: "flicker 0.15s infinite alternate",
                      height: `${Math.min(24 + (currentMultiplier - 1) * 3, 36)}px`,
                    }}
                  />
                  <div
                    className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-t from-white via-yellow-200 to-transparent rounded-full opacity-80"
                    style={{
                      animation: "flicker 0.08s infinite alternate",
                      height: `${Math.min(16 + (currentMultiplier - 1) * 2, 24)}px`,
                    }}
                  />
                </div>
              )}

              {/* Particle trail */}
              {gameStatus === "playing" &&
                currentMultiplier > 3 &&
                [...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-orange-400 rounded-full opacity-60"
                    style={{
                      left: `${48 + (Math.random() - 0.5) * 8}%`,
                      bottom: `${-15 - rocketY - i * 4}px`,
                      animation: `particle 0.8s ease-out infinite`,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
            </div>
          )}
        </div>
      </Card>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes flicker {
          0% { opacity: 0.8; transform: scaleY(1) scaleX(0.9); }
          100% { opacity: 1; transform: scaleY(1.1) scaleX(1.1); }
        }
        
        @keyframes particle {
          0% { opacity: 0.8; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.3) translateY(20px); }
        }
        
        @keyframes explosion {
          0% { transform: scale(0.5); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes planetRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Betting Controls */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-2">Bet Amount</label>
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              disabled={isPlaying}
              className="bg-gray-800 border-gray-600 text-white"
              min="1"
              max={balance}
            />
          </div>
          <div className="flex flex-col gap-1 pt-6">
            <GameButton
              variant="outline"
              size="sm"
              onClick={() => setBetAmount((prev) => Math.min(prev * 2, balance))}
              disabled={isPlaying}
              className="text-xs px-2"
            >
              2x
            </GameButton>
            <GameButton
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(Math.floor(balance))}
              disabled={isPlaying}
              className="text-xs px-2"
            >
              Max
            </GameButton>
          </div>
        </div>

        {/* Quick Bet Buttons */}
        <div className="flex gap-2">
          {[5, 10, 25, 50].map((amount) => (
            <GameButton
              key={amount}
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(amount)}
              disabled={isPlaying || amount > balance}
              className="flex-1"
            >
              ${amount}
            </GameButton>
          ))}
        </div>

        {/* Play/Cash Out Button */}
        <div className="pt-4">
          {gameStatus === "waiting" ? (
            <GameButton
              onClick={startGame}
              disabled={betAmount > balance || betAmount <= 0}
              variant="success"
              size="lg"
              className="w-full h-14 text-lg"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              Play ${betAmount.toFixed(2)}
            </GameButton>
          ) : gameStatus === "playing" && !cashedOut ? (
            <GameButton onClick={cashOut} variant="warning" size="lg" className="w-full h-14 text-lg">
              Cash Out ${(betAmount * currentMultiplier).toFixed(2)}
            </GameButton>
          ) : (
            <GameButton disabled variant="secondary" size="lg" className="w-full h-14 text-lg">
              {gameStatus === "crashed" ? "Game Crashed!" : "Cashed Out!"}
            </GameButton>
          )}
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-3 gap-2 pt-4 text-center">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Last Crash</div>
            <div className="text-sm font-bold text-red-400">2.45x</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Games Won</div>
            <div className="text-sm font-bold text-green-400">12</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Win Rate</div>
            <div className="text-sm font-bold text-blue-400">67%</div>
          </div>
        </div>
      </div>
      {/* Balance Modal */}
      {isBalanceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold">Balance Management</h2>
              <button
                onClick={() => setIsBalanceModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveBalanceTab("deposit")}
                className={`flex-1 py-3 px-4 text-center transition-colors ${
                  activeBalanceTab === "deposit"
                    ? "bg-green-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                Deposit
              </button>
              <button
                onClick={() => setActiveBalanceTab("withdraw")}
                className={`flex-1 py-3 px-4 text-center transition-colors ${
                  activeBalanceTab === "withdraw"
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                Withdraw
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {activeBalanceTab === "deposit" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Deposit Amount</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      className="bg-gray-700 border-gray-600 text-white"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Payment Method</label>
                    <div className="space-y-2">
                      <GameButton variant="outline" className="w-full justify-start">
                        💳 Credit Card
                      </GameButton>
                      <GameButton variant="outline" className="w-full justify-start">
                        🏦 Bank Transfer
                      </GameButton>
                      <GameButton variant="outline" className="w-full justify-start">
                        ₿ Cryptocurrency
                      </GameButton>
                      <GameButton variant="outline" className="w-full justify-start">
                        📱 Telegram Wallet
                      </GameButton>
                    </div>
                  </div>

                  <GameButton variant="success" className="w-full">
                    Deposit Funds
                  </GameButton>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-3 mb-4">
                    <div className="text-sm text-gray-400">Available Balance</div>
                    <div className="text-lg font-bold text-green-400">${balance.toFixed(2)}</div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Withdraw Amount</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      className="bg-gray-700 border-gray-600 text-white"
                      min="1"
                      max={balance}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Withdrawal Method</label>
                    <div className="space-y-2">
                      <GameButton variant="outline" className="w-full justify-start">
                        🏦 Bank Account
                      </GameButton>
                      <GameButton variant="outline" className="w-full justify-start">
                        ₿ Crypto Wallet
                      </GameButton>
                      <GameButton variant="outline" className="w-full justify-start">
                        📱 Telegram Wallet
                      </GameButton>
                      <GameButton variant="outline" className="w-full justify-start">
                        💳 Card Withdrawal
                      </GameButton>
                    </div>
                  </div>

                  <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-3">
                    <div className="text-xs text-yellow-200">⚠️ Withdrawals may take 1-3 business days to process</div>
                  </div>

                  <GameButton variant="warning" className="w-full">
                    Request Withdrawal
                  </GameButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
