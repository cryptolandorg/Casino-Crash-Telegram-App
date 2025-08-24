import { useEffect, useRef, useState } from 'react'

interface GameState {
  phase: 'betting' | 'flying' | 'crashed';
  sessionId?: string;
  betEndTime?: number;
  startTime?: number;
  crashPoint?: number;
  crashTime?: number;
}

const WS_URL = 'ws://localhost:4001';

export default function PhaserCrashGame() {
  const [gameState, setGameState] = useState<GameState>({ phase: 'betting' });
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rocketImgRef = useRef<HTMLImageElement | null>(null);
  const explosionImgRef = useRef<HTMLImageElement | null>(null);

  // Загрузка ассетов
  useEffect(() => {
    const rocket = new window.Image();
    rocket.src = '/assets/rocket.png';
    rocketImgRef.current = rocket;
    const explosion = new window.Image();
    explosion.src = '/assets/explosion.png';
    explosionImgRef.current = explosion;
  }, []);

  // Рисуем на canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Фон
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Платформа
    if (gameState.phase === 'betting') {
      ctx.fillStyle = '#444';
      ctx.fillRect(340, 520, 120, 20);
    }
    // Ракета
    if (gameState.phase === 'betting' || gameState.phase === 'flying') {
      if (rocketImgRef.current && rocketImgRef.current.complete) {
        ctx.drawImage(rocketImgRef.current, 384, 480, 32, 48);
      }
    }
    // Взрыв
    if (gameState.phase === 'crashed') {
      if (explosionImgRef.current && explosionImgRef.current.complete) {
        ctx.drawImage(explosionImgRef.current, 372, 470, 56, 56);
      }
    }
  }, [gameState]);

  // ws
  useEffect(() => {
    const ws = new window.WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      console.log('[PhaserCrashGame] WS connected');
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'game-start') {
          setGameState({ phase: 'betting', sessionId: data.sessionId, betEndTime: data.betEndTime });
        } else if (data.type === 'game-flying') {
          setGameState({ phase: 'flying', sessionId: data.sessionId, startTime: data.startTime, crashPoint: data.crashPoint, crashTime: data.crashTime });
        } else if (data.type === 'game-crash') {
          setGameState({ phase: 'crashed', sessionId: data.sessionId, crashPoint: data.crashPoint });
        }
      } catch (e) {}
    };
    ws.onclose = () => {
      console.log('[PhaserCrashGame] WS closed');
    };
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
      <canvas ref={canvasRef} width={800} height={600} style={{ background: '#111', borderRadius: 12 }} />
      <div className="mt-4 text-lg">Фаза: <b>{gameState.phase}</b></div>
      <div className="text-sm mt-2">Session: {gameState.sessionId}</div>
    </div>
  );
} 