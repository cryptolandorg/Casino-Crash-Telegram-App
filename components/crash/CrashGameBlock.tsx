import { useStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";

// Ассеты
const ROCKET_IMG = "/assets/rocket.png";
const CLOUD_IMG = "/assets/cloud.svg";
const EXPLOSION_IMG = "/assets/explosion.png";
const PLANET1_IMG = "/assets/planet1.png";
const PLANET2_IMG = "/assets/planet2.png";

// Звуки (заглушки, файлы положить в /public/sounds/)
const SOUND_LAUNCH = "/sounds/launch.mp3";
const SOUND_FLY = "/sounds/fly.mp3";
const SOUND_EXPLOSION = "/sounds/explosion.mp3";
const SOUND_CASHOUT = "/sounds/cashout.mp3";
const SOUND_CLICK = "/sounds/click.mp3";

// Фазы игры
const PHASES = {
  BETTING: "betting",
  FLYING: "flying",
  CRASHED: "crashed",
};

// Минимальная высота Canvas
const MIN_HEIGHT = 400;

export default function CrashGameBlock() {
  const { user, balance } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState("betting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [timer, setTimer] = useState(0); // ms до конца betting
  const [wsConnected, setWsConnected] = useState(false);
  const [profile, setProfile] = useState(user);
  const [currentBalance, setCurrentBalance] = useState(balance);

  // TODO: ws-подключение, обработка фаз, синхронизация
  // TODO: Canvas-рендер, анимации, эффекты, ассеты
  // TODO: UI ставок, кнопки, таймер, cashout
  // TODO: Звуки

  // Заглушка: canvas рендер
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Адаптивный размер
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = Math.max(
      Math.round(width * 0.56),
      MIN_HEIGHT
    );
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Фон
    ctx.clearRect(0, 0, width, height);
    if (phase === PHASES.BETTING) {
      // Градиент небо
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#7ecbff");
      grad.addColorStop(1, "#fff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      // TODO: облака, платформа, ракета, коэффициент
    } else {
      // Космос
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#0a1833");
      grad.addColorStop(1, "#1e1e1e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      // TODO: звёзды, планеты, ракета, взрыв, коэффициент
    }
    // TODO: коэффициент по центру
  }, [phase]);

  // TODO: ws-логика, обработка фаз, таймер, multiplier

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col bg-[#1E1E1E] rounded-xl shadow-lg overflow-hidden" style={{ minHeight: MIN_HEIGHT + 200 }}>
      {/* Шапка */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#23272F]">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">🚀 Crash</span>
          <span className={`w-3 h-3 rounded-full ml-2 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        </div>
        <div className="text-xl font-mono font-bold text-yellow-400">{currentBalance.toFixed(2)}</div>
        <div className="flex items-center gap-2">
          {profile?.avatarUrl && (
            <img src={profile.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full border border-gray-600" />
          )}
          <span className="text-white font-medium">{profile?.username || profile?.name}</span>
        </div>
      </div>
      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center bg-black">
        <canvas ref={canvasRef} className="w-full h-full block" style={{ minHeight: MIN_HEIGHT }} />
      </div>
      {/* Блок ставок и UI */}
      <div className="p-4 bg-[#23272F] border-t border-gray-800">
        {/* TODO: быстрые ставки, ввод, x2, MAX, cashout, таймер, состояния по фазам */}
        <div className="text-center text-white opacity-60">Блок ставок и UI — в разработке</div>
      </div>
    </div>
  );
} 