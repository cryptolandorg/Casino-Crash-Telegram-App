import React, { useEffect, useState } from "react"

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
  lastSpawnY: number
}
interface Cloud {
  id: number
  x: number
  y: number
  size: number
  initialY: number
}

export function GameArea({
  multiplier,
  gameStatus,
  crashPoint,
  cashedOut,
  cashOutMultiplier,
  stars,
  planets,
  clouds,
  transitionProgress,
  rocketY,
  CloudComponent,
}: {
  multiplier: number
  gameStatus: "waiting" | "playing" | "crashed"
  crashPoint: number | null
  cashedOut: boolean
  cashOutMultiplier: number | null
  stars: Star[]
  planets: Planet[]
  clouds: Cloud[]
  transitionProgress: number
  rocketY: number
  CloudComponent: React.FC<{ cloud: Cloud }>
}) {
  const isInSpace = multiplier > 3 && gameStatus === "playing"
  const isPlanetZone = multiplier > 9 && gameStatus === "playing"

  const skyOpacity = gameStatus === "playing" ? Math.max(0.8 - transitionProgress * 0.8, 0) : 0.3
  const spaceOpacity = gameStatus === "playing" ? Math.min(transitionProgress * 0.8, 0.8) : 0

  // Анимация rocketAngle только на клиенте и только при gameStatus === 'playing'
  const [rocketAngle, setRocketAngle] = useState(0)
  useEffect(() => {
    if (gameStatus !== "playing") {
      setRocketAngle(0)
      return
    }
    let raf: number
    const animate = () => {
      setRocketAngle(Math.sin(performance.now() * 0.005) * 3)
      raf = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(raf)
  }, [gameStatus])

  return (
    <div className="relative h-[68vw] min-h-[260px] max-h-[520px] w-full mx-auto bg-gray-800 border-gray-700 rounded-lg shadow-xl overflow-hidden">
      {/* Multiplier поверх */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-[clamp(2.2rem,7vw,2.8rem)] font-bold">
        {gameStatus === "crashed" ? (
          <span className="text-red-400">{crashPoint?.toFixed(2)}x CRASHED!</span>
        ) : cashedOut ? (
          <span className="text-green-400">{cashOutMultiplier?.toFixed(2)}x CASHED OUT!</span>
        ) : (
          <span className={`${gameStatus === "playing" ? "text-green-400" : "text-gray-400"}`}>{multiplier.toFixed(2)}x</span>
        )}
      </div>
      {/* Sky Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-400 via-blue-300 to-blue-100 transition-all duration-2000 ease-in-out" style={{ opacity: skyOpacity }} />
      {/* Space Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900 via-blue-900 to-black transition-all duration-2000 ease-in-out" style={{ opacity: spaceOpacity }} />
      {/* Background Stars (behind planets) */}
      {isInSpace && (
        <div className="absolute inset-0">
          {stars.filter((star) => star.layer === "back").map((star) => (
            <div key={`back-${star.id}`}>
              <div className="absolute rounded-full bg-white" style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px`, opacity: star.opacity * 0.8, boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,${star.opacity * 0.3})` }} />
              <div className="absolute h-px bg-gradient-to-b from-white to-transparent" style={{ left: `${star.x}%`, top: `${star.y}%`, height: `${star.speed * 15}px`, width: "1px", opacity: star.opacity * 0.4 }} />
            </div>
          ))}
        </div>
      )}
      {/* Planets */}
      {isPlanetZone && (
        <div className="absolute inset-0">
          {planets.map((planet) => (
            <div key={planet.id} className="absolute transition-transform duration-100 ease-linear" style={{ left: `${planet.x}%`, top: `${planet.y}%`, width: `${planet.size}px`, height: `${planet.size}px`, filter: `drop-shadow(0 0 ${planet.size * 0.3}px rgba(100,200,255,0.4))` }}>
              <img src={`/planet${planet.type}.png`} alt={`Planet ${planet.type}`} className="w-full h-full object-contain" style={{ animation: `planetRotate ${10 + planet.id * 2}s linear infinite` }} />
            </div>
          ))}
        </div>
      )}
      {/* Foreground Stars */}
      {isInSpace && (
        <div className="absolute inset-0">
          {stars.filter((star) => star.layer === "front").map((star) => (
            <div key={`front-${star.id}`}>
              <div className="absolute rounded-full bg-white" style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px`, opacity: star.opacity, boxShadow: `0 0 ${star.size * 3}px rgba(255,255,255,${star.opacity * 0.5})`, zIndex: 10 }} />
              <div className="absolute h-px bg-gradient-to-b from-white to-transparent" style={{ left: `${star.x}%`, top: `${star.y}%`, height: `${star.speed * 20}px`, width: "1px", opacity: star.opacity * 0.6, zIndex: 10 }} />
            </div>
          ))}
        </div>
      )}
      {/* Sky clouds */}
      {multiplier <= 3.5 && gameStatus === "playing" && transitionProgress < 0.5 && (
        <div className="absolute inset-0" style={{ opacity: 1 - transitionProgress }}>
          {clouds.map((cloud) => (
            <CloudComponent key={cloud.id} cloud={cloud} />
          ))}
        </div>
      )}
      {/* Rocket Animation */}
      <div className="flex items-end justify-center h-full pb-10">
        {gameStatus === "crashed" ? (
          <div className="relative">
            <img src="/explosion.png" alt="Explosion" className="w-24 h-24 object-contain" style={{ animation: "explosion 0.5s ease-out" }} />
            <div className="absolute inset-0 w-24 h-24 bg-orange-500 rounded-full opacity-50 animate-ping" />
          </div>
        ) : (
          <div className="relative">
            <img
              src="/rocket.png"
              alt="Rocket"
              className="w-16 h-20 object-contain transition-all duration-200 relative z-10"
              style={{
                transform: `translateY(${-rocketY}px) scale(${Math.min(1 + (multiplier - 1) * 0.08, 1.4)}) rotate(${rocketAngle}deg)`,
                filter: gameStatus === "playing" ? "brightness(1.1)" : "none",
              }}
            />
            {/* Rocket Fire Trail */}
            {gameStatus === "playing" && (
              <div className="absolute left-1/2 transform -translate-x-1/2 transition-all duration-200" style={{ bottom: "-8px", transform: `translateX(-50%) translateY(${-rocketY}px)`, zIndex: 5 }}>
                <div className="w-4 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full opacity-90" style={{ animation: "flicker 0.1s infinite alternate", height: `${Math.min(32 + (multiplier - 1) * 4, 48)}px` }} />
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-2 bg-gradient-to-t from-red-500 via-orange-400 to-transparent rounded-full" style={{ animation: "flicker 0.15s infinite alternate", height: `${Math.min(24 + (multiplier - 1) * 3, 36)}px` }} />
                <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-t from-white via-yellow-200 to-transparent rounded-full opacity-80" style={{ animation: "flicker 0.08s infinite alternate", height: `${Math.min(16 + (multiplier - 1) * 2, 24)}px` }} />
              </div>
            )}
            {/* Particle trail */}
            {gameStatus === "playing" && multiplier > 3 && [...Array(6)].map((_, i) => (
              <div key={i} className="absolute w-1 h-1 bg-orange-400 rounded-full opacity-60" style={{ left: `${48 + (Math.random() - 0.5) * 8}%`, bottom: `${-15 - rocketY - i * 4}px`, animation: `particle 0.8s ease-out infinite`, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 