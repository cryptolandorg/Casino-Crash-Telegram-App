'use client';

import { useEffect, useRef, useState } from 'react'

interface PhaserGameProps {
  phase: 'betting' | 'flying' | 'crashed';
  startTime: number;
  crashPoint: number;
  crashTime: number; // Добавляем crashTime
  duration: number;
  betEndTime: number;
  width?: number;
  height?: number;
  userBet?: number | null;
  userCashout?: number | null;
  sessionId: string;
}

declare global {
  interface Window {
    __explosionImg?: HTMLImageElement;
  }
}

export default function PhaserGame({ phase, startTime, crashPoint, crashTime, duration, betEndTime, width = 800, height = 600, userBet, userCashout, sessionId }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const phaserObjects = useRef<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null>(null);
  const rocketImgRef = useRef<HTMLImageElement | null>(null);
  const cloudsRef = useRef<HTMLImageElement[]>([]);
  const starImgRef = useRef<HTMLImageElement | null>(null);
  const planet1ImgRef = useRef<HTMLImageElement | null>(null);
  const planet2ImgRef = useRef<HTMLImageElement | null>(null);
  
  // Состояние анимации взрыва
  const [explosionAnim, setExplosionAnim] = useState<{
    active: boolean;
    startTime: number;
    progress: number;
    hasPlayed: boolean; // Флаг что взрыв уже проигрался
  }>({ active: false, startTime: 0, progress: 0, hasPlayed: false });

  // === Новый стейт для позиции ракеты в момент взрыва ===
  const [lastRocketY, setLastRocketY] = useState<number | null>(null);

  // === Параметры движения ракеты ===
  const rocketFlyDuration = 1500; // мс, время полета до центра

  // Полифилл для roundRect
  if (typeof CanvasRenderingContext2D.prototype.roundRect === 'undefined') {
    CanvasRenderingContext2D.prototype.roundRect = function(x: number, y: number, width: number, height: number, radius: number) {
      this.beginPath();
      this.moveTo(x + radius, y);
      this.lineTo(x + width - radius, y);
      this.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.lineTo(x + width, y + height - radius);
      this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      this.lineTo(x + radius, y + height);
      this.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.lineTo(x, y + radius);
      this.quadraticCurveTo(x, y, x + radius, y);
      this.closePath();
    };
  }

  // Параметры для parallax эффектов
  const STAR_LAYERS = [
    { count: 25, speed: 0.2, size: 1.5, alpha: 0.8 },
    { count: 20, speed: 0.15, size: 2.5, alpha: 0.5 },
    { count: 15, speed: 0.1, size: 3, alpha: 0.3 },
  ];

  const CLOUD_LAYERS = [
    { count: 5, speed: 0.15, size: 70, alpha: 0.7 },
    { count: 4, speed: 0.12, size: 55, alpha: 0.5 },
    { count: 3, speed: 0.08, size: 40, alpha: 0.3 },
  ];

  // Инициализация canvas
  useEffect(() => {
    console.log('[PhaserGame] useEffect (canvas mount):', { width, height, gameRef: !!gameRef.current, sessionId });
    const dpr = window.devicePixelRatio || 1;
    const realWidth = width * dpr;
    const realHeight = height * dpr;
    const canvas = document.createElement('canvas');
    canvas.width = realWidth;
    canvas.height = realHeight;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    if (gameRef.current) {
      gameRef.current.innerHTML = '';
      gameRef.current.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    phaserObjects.current = { canvas, ctx };
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [width, height, sessionId]);

  // Загрузка ассетов
  useEffect(() => {
    console.log('[PhaserGame] useEffect (assets load)');
    
    // Ракета
    const rocket = new window.Image();
    rocket.src = '/assets/rocket.png'; // если rocket-vertical.png нет, используем rocket.png
    rocketImgRef.current = rocket;
    
    // Облака
    const clouds: HTMLImageElement[] = [];
    for (let i = 0; i < 8; i++) {
      const cloud = new window.Image();
      cloud.src = '/assets/cloud.svg';
      clouds.push(cloud);
    }
    cloudsRef.current = clouds;
    
    // Звезды
    const star = new window.Image();
    star.src = '/assets/cloud.svg'; // если star.svg нет, используем cloud.svg
    starImgRef.current = star;
    
    // Планеты
    const planet1 = new window.Image();
    planet1.src = '/assets/planet1.png';
    planet1ImgRef.current = planet1;
    
    const planet2 = new window.Image();
    planet2.src = '/assets/planet2.png';
    planet2ImgRef.current = planet2;
  }, []);

  // Сброс состояния анимации при смене сессии
  useEffect(() => {
    setExplosionAnim({ 
      active: false, 
      startTime: 0, 
      progress: 0,
      hasPlayed: false 
    });
  }, [sessionId]);

  // === В useEffect, который реагирует на phase ===
  useEffect(() => {
    if (phase === 'crashed') {
      // Сохраняем позицию ракеты на момент взрыва
      const rocketHeight = 48;
      const bottomMargin = 20;
      const rocketStartY = (height || 600) - rocketHeight/2 - bottomMargin;
      const rocketCenterY = (height || 600)/2;
      let rocketY = rocketStartY;
      // Считаем прогресс полета
      const elapsed = Math.max(0, Date.now() - startTime);
      const flyProgress = Math.min(elapsed / rocketFlyDuration, 1);
      rocketY = rocketStartY + (rocketCenterY - rocketStartY) * flyProgress;
      // Если ракета не долетела — взрыв там, где была, иначе — в центре
      const y = (flyProgress < 1) ? rocketY : rocketCenterY;
      setLastRocketY(y);
      // Всегда запускаем анимацию взрыва
      setExplosionAnim({ active: true, startTime: Date.now(), progress: 0, hasPlayed: false });
    } else if (phase === 'betting') {
      setLastRocketY(null);
    }
  }, [phase, startTime, height]);

  // Основной рендер-цикл
  useEffect(() => {
    console.log('[PhaserGame] useEffect (draw loop):', { phase, startTime, crashPoint, crashTime, duration, betEndTime, width, height, userBet, userCashout });
    if (!phaserObjects.current) return;

    // Генерация случайных позиций для parallax объектов
    const starField = STAR_LAYERS.map(layer =>
      Array.from({ length: layer.count }, (_, i) => ({
        x: Math.random() * (width || 800),
        y: Math.random() * (height || 600),
        offset: Math.random() * 1000,
        twinkle: Math.random() * Math.PI * 2,
      }))
    );

    const cloudField = CLOUD_LAYERS.map(layer =>
      Array.from({ length: layer.count }, (_, i) => ({
        x: Math.random() * (width || 800),
        y: Math.random() * (height || 600),
        offset: Math.random() * 1000,
        img: cloudsRef.current[Math.floor(Math.random() * cloudsRef.current.length)],
      }))
    );

    function draw() {
      const objects = phaserObjects.current;
      if (!objects) return;
      const { ctx, canvas } = objects;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = width || 800;
      const h = height || 600;

      // Вычисляем текущий коэффициент
      let currentMultiplier = 1.0;
      let flightProgress = 0;
      
      if (phase === 'flying') {
        const elapsed = Math.max(0, Date.now() - startTime);
        flightProgress = Math.min(elapsed / crashTime, 1);
        
        if (flightProgress >= 1) {
          currentMultiplier = crashPoint || 1.0;
        } else {
          currentMultiplier = Math.pow(Math.E, flightProgress * Math.log(crashTime / 1000));
        }
      }
      
      // Параметры движения
      const rocketHeight = 48;
      const bottomMargin = 20; // Отступ от низа
      const rocketStartY = h - rocketHeight/2 - bottomMargin;
      const rocketCenterY = h/2;
      // rocketY теперь вычисляется всегда, даже если phase === 'crashed'
      let rocketY = rocketStartY;
      let rocketInCenter = false;
      let rocketRotation = 0;
      if (phase === 'betting') {
        rocketY = rocketStartY;
        rocketRotation = 0;
      } else if (phase === 'flying') {
        const elapsed = Math.max(0, Date.now() - startTime);
        const flyProgress = Math.min(elapsed / rocketFlyDuration, 1);
        rocketY = rocketStartY + (rocketCenterY - rocketStartY) * flyProgress;
        rocketRotation = flyProgress * 0.05;
        rocketInCenter = flyProgress >= 1;
      } else if (phase === 'crashed') {
        rocketY = lastRocketY ?? rocketStartY;
        rocketRotation = 0.1;
      }

      // Плавный переход день/ночь на основе коэффициента
      let skyBlend = 0;
      let isDay = true;
      
      if (phase === 'flying') {
        // Более плавный переход в космос с коэффициента 1.1 до 1.3
        if (currentMultiplier >= 1.3) {
          skyBlend = 1; // Полностью космос
          isDay = false;
        } else if (currentMultiplier >= 1.1) {
          // Плавный переход с 1.1 до 1.3
          const transitionProgress = (currentMultiplier - 1.1) / 0.2;
          skyBlend = transitionProgress;
          isDay = false;
        } else {
          // До 1.1 - облака
          skyBlend = 0;
          isDay = true;
        }
      } else if (phase === 'crashed') {
        skyBlend = 1;
        isDay = false;
      }
      
      // Проверяем, достигла ли ракета крашпоинта
      const hasCrashed = phase === 'flying' && flightProgress >= 1;
      
      // Проверяем, достигла ли ракета крашпоинта по коэффициенту
      const hasReachedCrashPoint = phase === 'flying' && crashPoint && currentMultiplier >= crashPoint;

      // Фон с плавным переходом
      ctx.save();
      let grad = ctx.createLinearGradient(0, 0, 0, h);
      if (isDay) {
        // День
        grad.addColorStop(0, `rgba(126, 207, 255, ${1 - skyBlend})`);
        grad.addColorStop(1, `rgba(224, 246, 255, ${1 - skyBlend})`);
      } else {
        // Ночь
        grad.addColorStop(0, `rgba(10, 10, 42, ${skyBlend})`);
        grad.addColorStop(0.5, `rgba(26, 26, 74, ${skyBlend})`);
        grad.addColorStop(1, `rgba(0, 0, 51, ${skyBlend})`);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Облака (только днем)
      if (isDay && cloudsRef.current.length > 0) {
        ctx.save();
        for (let l = 0; l < CLOUD_LAYERS.length; l++) {
          const layer = CLOUD_LAYERS[l];
          for (let i = 0; i < layer.count; i++) {
            const cloud = cloudField[l][i];
            if (!cloud.img || !cloud.img.complete) continue;
            
            const x = (cloud.x + Date.now() * layer.speed * 0.01 + cloud.offset) % (w + layer.size);
            const y = cloud.y + Math.sin(Date.now() * 0.001 + cloud.offset) * 10;
            
            ctx.globalAlpha = layer.alpha * (1 - skyBlend);
            ctx.drawImage(cloud.img, x - layer.size/2, y, layer.size, layer.size);
          }
        }
        ctx.restore();
      }

      // Звезды (только ночью)
      if (!isDay && starImgRef.current) {
        ctx.save();
        for (let l = 0; l < STAR_LAYERS.length; l++) {
          const layer = STAR_LAYERS[l];
          for (let i = 0; i < layer.count; i++) {
            const star = starField[l][i];
            if (!starImgRef.current.complete) continue;
            
            const x = (star.x + Math.sin(Date.now() * 0.0005 + star.twinkle) * 3) % w;
            const y = (star.y + Date.now() * layer.speed * 0.005 + star.offset) % (h + layer.size);
            
            // Прозрачность по краям экрана
            const edgeDistance = Math.min(x, w - x) / (w / 2);
            const edgeAlpha = Math.max(0.3, Math.min(1, edgeDistance));
            
            ctx.globalAlpha = layer.alpha * skyBlend * edgeAlpha * (0.6 + 0.4 * Math.sin(Date.now() * 0.001 + star.twinkle));
            ctx.drawImage(starImgRef.current, x - layer.size/2, y - layer.size/2, layer.size, layer.size);
          }
        }
        ctx.restore();
      }
      
      // Звезды вокруг ракеты (эффект ускорения) - с коэффициента 1.4
      if (phase === 'flying' && !isDay && currentMultiplier >= 1.4) {
        ctx.save();
        
        // Плавное появление звезд
        const starAlpha = Math.min(1, (currentMultiplier - 1.4) / 0.2);
        ctx.globalAlpha = 0.6 * skyBlend * starAlpha;
        
        // Создаем звезды вокруг ракеты
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + Date.now() * 0.001;
          const distance = 40 + Math.sin(Date.now() * 0.002 + i) * 10;
          const x = w/2 + Math.cos(angle) * distance;
          const y = h/2 + Math.sin(angle) * distance;
          
          // Размер звезды зависит от расстояния от центра
          const size = 2 + Math.sin(Date.now() * 0.003 + i) * 1;
          
          // Цвет звезды
          const brightness = 0.7 + Math.sin(Date.now() * 0.004 + i) * 0.3;
          ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
          
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      
      // Трассирующие звезды (эффект полета) - только в космосе
      if (phase === 'flying' && !isDay && currentMultiplier >= 1.3) {
        ctx.save();
        ctx.globalAlpha = 0.3 * skyBlend;
        
        // Создаем трассирующие линии
        for (let i = 0; i < 8; i++) {
          const x = w/2 + (Math.random() - 0.5) * 400;
          const y = h/2 + Math.random() * h * 0.4;
          const length = 10 + Math.random() * 20;
          
          // Прозрачность по краям
          const edgeDistance = Math.min(x, w - x) / (w / 2);
          const edgeAlpha = Math.max(0.1, Math.min(1, edgeDistance));
          
          // Трассирующая линия
          ctx.strokeStyle = `rgba(255, 255, 255, ${(0.1 + Math.random() * 0.2) * edgeAlpha})`;
          ctx.lineWidth = 0.3 + Math.random() * 1;
          ctx.lineCap = 'round';
          
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + length);
          ctx.stroke();
          
          // Светящаяся точка в конце
          ctx.fillStyle = `rgba(255, 255, 255, ${(0.3 + Math.random() * 0.2) * edgeAlpha})`;
          ctx.beginPath();
          ctx.arc(x, y + length, 0.3 + Math.random() * 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Планеты (только в космосе) - движение сверху вниз
      if (!isDay && currentMultiplier >= 1.3) {
        ctx.save();
        ctx.globalAlpha = 0.4 * skyBlend;
        
        // Планета 1 - движение сверху вниз
        const planet1Speed = 0.5; // Скорость движения
        const planet1StartY = -50; // Начинает сверху экрана
        const planet1EndY = h + 50; // Заканчивает снизу экрана
        const planet1Progress = (currentMultiplier - 1.3) / (2.0 - 1.3); // Прогресс движения
        const planet1Y = planet1StartY + (planet1EndY - planet1StartY) * planet1Progress;
        const planet1X = (w * 0.2) + Math.sin(Date.now() * 0.0002) * 30;
        const planet1Size = 12 + Math.sin(Date.now() * 0.0003) * 3;
        
        // Градиент планеты
        const planet1Gradient = ctx.createRadialGradient(planet1X, planet1Y, 0, planet1X, planet1Y, planet1Size);
        planet1Gradient.addColorStop(0, 'rgba(100, 150, 255, 0.8)');
        planet1Gradient.addColorStop(0.7, 'rgba(80, 120, 200, 0.6)');
        planet1Gradient.addColorStop(1, 'rgba(60, 90, 150, 0.4)');
        
        ctx.fillStyle = planet1Gradient;
        ctx.beginPath();
        ctx.arc(planet1X, planet1Y, planet1Size, 0, Math.PI * 2);
        ctx.fill();
        
        // Планета 2 - движение сверху вниз с задержкой
        const planet2Speed = 0.4;
        const planet2StartY = -80;
        const planet2EndY = h + 80;
        const planet2Progress = Math.max(0, (currentMultiplier - 1.5) / (2.0 - 1.5));
        const planet2Y = planet2StartY + (planet2EndY - planet2StartY) * planet2Progress;
        const planet2X = (w * 0.8) + Math.sin(Date.now() * 0.0003 + 1) * 25;
        const planet2Size = 10 + Math.sin(Date.now() * 0.0004 + 1) * 2;
        
        // Градиент планеты 2
        const planet2Gradient = ctx.createRadialGradient(planet2X, planet2Y, 0, planet2X, planet2Y, planet2Size);
        planet2Gradient.addColorStop(0, 'rgba(255, 150, 100, 0.7)');
        planet2Gradient.addColorStop(0.7, 'rgba(200, 120, 80, 0.5)');
        planet2Gradient.addColorStop(1, 'rgba(150, 90, 60, 0.3)');
        
        ctx.fillStyle = planet2Gradient;
        ctx.beginPath();
        ctx.arc(planet2X, planet2Y, planet2Size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }

      // Ракета (в фазах flying и crashed) - всегда внизу canvas, но скрыта при взрыве
      if ((phase === 'betting' || phase === 'flying' || (phase === 'crashed' && !explosionAnim.hasPlayed)) && !explosionAnim.hasPlayed) {
        if (rocketImgRef.current && rocketImgRef.current.complete) {
          ctx.save();
          
          // Позиция ракеты - всегда внизу canvas
          const rocketWidth = 32;
          const rocketHeight = 48;
          const bottomMargin = 20; // Отступ от низа
          let rocketY = h - rocketHeight/2 - bottomMargin; // Фиксированная позиция внизу
          let rocketRotation = 0;
          
          if (phase === 'betting') {
            // На таймере ракета стоит внизу
            rocketY = rocketStartY;
            rocketRotation = 0;
          } else if (phase === 'flying') {
            // Считаем прогресс полета
            const elapsed = Math.max(0, Date.now() - startTime);
            const flyProgress = Math.min(elapsed / rocketFlyDuration, 1);
            rocketY = rocketStartY + (rocketCenterY - rocketStartY) * flyProgress;
            rocketRotation = flyProgress * 0.05;
            rocketInCenter = flyProgress >= 1;
          } else if (phase === 'crashed') {
            // Ракета остается внизу при краше
            rocketY = lastRocketY ?? rocketStartY;
            rocketRotation = 0.1;
          }
          
          ctx.translate(w / 2, rocketY);
          ctx.rotate(rocketRotation);
          
          ctx.drawImage(rocketImgRef.current, -rocketWidth/2, -rocketHeight/2, rocketWidth, rocketHeight);
          
          // Огонь двигателя (только в flying и не при краше)
          if (phase === 'flying' && !explosionAnim.active) {
            const fireSize = 15 + Math.sin(Date.now() * 0.015) * 6;
            
            // Дым при старте (если ракета еще поднимается)
            const elapsed = Math.max(0, Date.now() - startTime);
            const flightProgress = Math.min(elapsed / crashTime, 1);
            const isStarting = flightProgress < 0.3;
            
            if (isStarting) {
              // Дым при старте
              const smokeAlpha = (1 - flightProgress / 0.3) * 0.4;
              ctx.globalAlpha = smokeAlpha;
              
              for (let i = 0; i < 5; i++) {
                const smokeX = (Math.random() - 0.5) * 40;
                const smokeY = rocketHeight/2 + 20 + Math.random() * 30;
                const smokeSize = 8 + Math.random() * 12;
                
                const smokeGradient = ctx.createRadialGradient(
                  smokeX, smokeY, 0, 
                  smokeX, smokeY, smokeSize
                );
                smokeGradient.addColorStop(0, 'rgba(100, 100, 100, 0.3)');
                smokeGradient.addColorStop(0.7, 'rgba(80, 80, 80, 0.2)');
                smokeGradient.addColorStop(1, 'rgba(60, 60, 60, 0)');
                
                ctx.fillStyle = smokeGradient;
                ctx.beginPath();
                ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.globalAlpha = 1;
            }
            
            // Внешний огонь
            const outerFire = ctx.createRadialGradient(0, rocketHeight/2 + fireSize/2, 0, 0, rocketHeight/2 + fireSize/2, fireSize);
            outerFire.addColorStop(0, 'rgba(255, 120, 0, 0.7)');
            outerFire.addColorStop(0.7, 'rgba(255, 60, 0, 0.5)');
            outerFire.addColorStop(1, 'rgba(255, 60, 0, 0)');
            ctx.fillStyle = outerFire;
          ctx.beginPath();
          ctx.arc(0, rocketHeight/2 + fireSize/2, fireSize, 0, Math.PI * 2);
          ctx.fill();
          
            // Внутренний огонь
            const innerFireSize = fireSize * 0.7;
            const innerFire = ctx.createRadialGradient(0, rocketHeight/2 + fireSize/2, 0, 0, rocketHeight/2 + fireSize/2, innerFireSize);
            innerFire.addColorStop(0, 'rgba(255, 255, 0, 0.7)');
            innerFire.addColorStop(0.7, 'rgba(255, 180, 0, 0.5)');
            innerFire.addColorStop(1, 'rgba(255, 180, 0, 0)');
            ctx.fillStyle = innerFire;
          ctx.beginPath();
          ctx.arc(0, rocketHeight/2 + fireSize/2, innerFireSize, 0, Math.PI * 2);
          ctx.fill();
            
            // Центральный огонь
            const centerFireSize = fireSize * 0.4;
            const centerFire = ctx.createRadialGradient(0, rocketHeight/2 + fireSize/2, 0, 0, rocketHeight/2 + fireSize/2, centerFireSize);
            centerFire.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            centerFire.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = centerFire;
            ctx.beginPath();
            ctx.arc(0, rocketHeight/2 + fireSize/2, centerFireSize, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore();
        }
      }

      // Таймер (только в betting)
      if (phase === 'betting') {
        const now = Date.now();
        const timeLeft = Math.max(0, betEndTime - now);
        const secondsLeft = Math.ceil(timeLeft / 1000);
        const progress = 1 - (timeLeft / 15000); // 15 секунд на ставки
        
        const cx = w / 2;
        const cy = h * 0.45; // Перемещаем выше центра
        const r = Math.min(w, h) * 0.096; // Увеличиваем на 20% (было 0.08)
        
        ctx.save();
        
        // Фон таймера
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        const timerGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        timerGradient.addColorStop(0, '#2a2a4a');
        timerGradient.addColorStop(1, '#1a1a3a');
        ctx.fillStyle = timerGradient;
        ctx.fill();
        
        // Прогресс таймера
        ctx.lineWidth = Math.max(4, w * 0.01);
        ctx.strokeStyle = '#ffd700';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
        ctx.stroke();
        
        // Цифра таймера
        ctx.font = `bold ${Math.round(r * 0.9)}px Raleway, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(secondsLeft.toString(), cx, cy);
        
        ctx.restore();
      }

      // Коэффициент (в фазах flying и crashed) - скрыт при пустой сцене
      if ((phase === 'flying' || phase === 'crashed') && !explosionAnim.hasPlayed) {
        let multiplier = 1.0;
        
        if (phase === 'flying') {
          // Используем новую логику расчета коэффициента
          const elapsed = Math.max(0, Date.now() - startTime);
          const timeProgress = elapsed / rocketFlyDuration;
          
          if (timeProgress >= 1) {
            // Игра уже крашнулась
            multiplier = crashPoint || 1.0;
          } else {
            // Экспоненциальный рост коэффициента
            multiplier = Math.pow(Math.E, timeProgress * Math.log(rocketFlyDuration / 1000));
          }
        } else {
          multiplier = crashPoint || 1.0;
        }
        
        ctx.save();
        ctx.font = `bold ${Math.round(h * 0.13)}px Raleway, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = Math.max(4, w * 0.01);
        ctx.strokeText(multiplier.toFixed(2) + 'x', w / 2, h * 0.36);
        ctx.fillText(multiplier.toFixed(2) + 'x', w / 2, h * 0.36);
        ctx.restore();
      }

      // Игровые сообщения - скрыты при пустой сцене
      let gameMessage = '';
      let messageColor = '#ffffff';
      
      if (phase === 'betting') {
        gameMessage = 'Делайте ставки! 🚀';
        messageColor = '#00ff00';
      } else if (phase === 'flying' && userBet && userCashout && !explosionAnim.hasPlayed) {
        gameMessage = `Поздравляем с выигрышем ${(userBet * userCashout).toFixed(2)}! 🎉`;
        messageColor = '#00ff00';
      } else if (phase === 'crashed' && userBet && !userCashout && !explosionAnim.hasPlayed) {
        gameMessage = 'Ракета утеряна в бескрайнем космосе 💫';
        messageColor = '#ff4444';
      }
      
      if (gameMessage) {
        ctx.save();
        ctx.font = 'bold 24px Raleway, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText(gameMessage, w/2, h*0.75);
        ctx.fillStyle = messageColor;
        ctx.shadowColor = messageColor;
        ctx.shadowBlur = 10;
        ctx.fillText(gameMessage, w/2, h*0.75);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Анимация взрыва
      if (explosionAnim.active && lastRocketY !== null) {
        const elapsed = Date.now() - explosionAnim.startTime;
        const duration = 200; // 0.2 секунды
        const progress = Math.min(elapsed / duration, 1);
        
        // Загружаем explosion.png один раз
        if (!window.__explosionImg) {
          const img = new window.Image();
          img.src = '/assets/explosion.png';
          window.__explosionImg = img;
        }
        
        const explosionImg = window.__explosionImg;
        
        if (explosionImg && explosionImg.complete) {
          // Засветление экрана
          ctx.save();
          const screenFlashAlpha = 0.5 * (1 - progress); // Fade out за 0.2 сек
          ctx.globalAlpha = screenFlashAlpha;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
          
          // PNG взрыва с увеличением
          ctx.save();
          const explosionAlpha = 1 - progress; // Fade out
          const explosionScale = 1 + 0.5 * progress; // Увеличение на 50%
          const explosionSize = Math.min(w, h) * 0.3 * explosionScale; // 30% от размера экрана
          
          ctx.globalAlpha = explosionAlpha;
          ctx.translate(w/2, lastRocketY);
          ctx.scale(explosionScale, explosionScale);
          ctx.drawImage(explosionImg, -explosionSize/2, -explosionSize/2, explosionSize, explosionSize);
          ctx.restore();
        }
        
        // Завершение анимации взрыва
        if (progress >= 1) {
          setExplosionAnim({ 
            active: false, 
            startTime: Date.now(), // Начинаем отсчет пустой сцены
            progress: 0,
            hasPlayed: true // Взрыв проигрался
          });
        }
      }

      // Пустая сцена после взрыва (кинематографичный эффект)
      if (explosionAnim.hasPlayed && !explosionAnim.active) {
        const emptySceneElapsed = Date.now() - explosionAnim.startTime;
        const emptySceneDuration = 1000; // 1 секунда пустой сцены
        
        if (emptySceneElapsed >= emptySceneDuration) {
          // Завершаем пустую сцену и сбрасываем состояние
          setExplosionAnim({ 
            active: false, 
            startTime: 0, 
            progress: 0,
            hasPlayed: false 
          });
        }
      }

      requestRef.current = requestAnimationFrame(draw);
    }
    
    draw();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [phase, startTime, crashPoint, crashTime, duration, betEndTime, width, height, userBet, userCashout, sessionId, explosionAnim, lastRocketY]);

  return (
    <div className="w-full h-full flex justify-center items-center">
      <div 
        ref={gameRef} 
        className="w-full h-full border border-gray-600 rounded-lg overflow-hidden shadow-2xl"
        style={{ width: '100%', height: '100%' }}
      >
      </div>
    </div>
  );
} 