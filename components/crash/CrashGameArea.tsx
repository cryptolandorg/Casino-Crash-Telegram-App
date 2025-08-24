'use client';

import { useLobbySocket } from '@/hooks/useLobbySocket';
import { useStore } from '@/lib/store';
import { init, retrieveRawInitData } from '@telegram-apps/sdk';
import { useEffect, useRef, useState } from 'react';
import { BalanceModal } from '../game/BalanceModal';
import CrashBetControls from './CrashBetControls';
import GameHistory from './GameHistory';
import PhaserGame from './PhaserGame';
import SessionHistory from './SessionHistory';
import TopRecords from './TopRecords';

export default function CrashGameArea() {
  const [phase, setPhase] = useState<'betting' | 'flying' | 'crashed'>('betting');
  const [startTime, setStartTime] = useState<number>(0);
  const [crashPoint, setCrashPoint] = useState<number>(2);
  const [crashTime, setCrashTime] = useState<number>(20000); // Добавляем crashTime
  const [duration, setDuration] = useState<number>(10000);
  const [betEndTime, setBetEndTime] = useState<number>(0);
  const [seed, setSeed] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [userBet, setUserBet] = useState<number | null>(null);
  const [userCashout, setUserCashout] = useState<number | null>(null);
  const [userBetAmount, setUserBetAmount] = useState<number>(0); // Текущая ставка пользователя
  const [initData, setInitData] = useState<string>("");
  const [isProcessingBet, setIsProcessingBet] = useState(false);
  const betTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Состояние для модального окна баланса
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceModalTab, setBalanceModalTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');

  // Новый state для размеров игры
  const [gameSize, setGameSize] = useState({ width: 800, height: 450 });

  useEffect(() => {
    function updateSize() {
      const isMobile = window.innerWidth < 768;
      const maxWidth = isMobile ? window.innerWidth - 32 : 1200;
      const width = Math.max(320, Math.min(maxWidth, window.innerWidth - 32));
      const height = Math.round(width * 9 / 16); // 16:9
      setGameSize({ width, height });
    }
    if (typeof window !== 'undefined') {
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  const { user: storeUser, balance, setBalance } = useStore();

  // Получаем initData для WebSocket авторизации
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      init();
      const initDataRaw = retrieveRawInitData();
      console.log('[CrashGameArea] initDataRaw:', initDataRaw ? 'present' : 'missing');
      
      if (initDataRaw) {
        setInitData(initDataRaw);
      } else {
        console.warn('[CrashGameArea] Нет initDataRaw — не в Telegram WebView?');
      }
    } catch (error) {
      console.error('[CrashGameArea] Ошибка получения initData:', error);
    }
  }, []);

  const { connected, user: wsUser, lobbyEvents, chatMessages, sessionHistory: wsSessionHistory, sendChat, sendBet, sendCashout, sendGameEvent } = useLobbySocket({ initData });

  // Логируем состояние подключения и initData
  useEffect(() => {
    console.log('[CrashGameArea] WebSocket connected:', connected);
    console.log('[CrashGameArea] initData length:', initData.length);
    console.log('[CrashGameArea] User:', wsUser);
  }, [connected, initData, wsUser]);

  // Cleanup timeout при размонтировании
  useEffect(() => {
    return () => {
      if (betTimeoutRef.current) {
        clearTimeout(betTimeoutRef.current);
      }
    };
  }, []);

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      // Сбрасываем состояние игры при размонтировании
      setPhase('betting');
      setUserBet(null);
      setUserCashout(null);
      setUserBetAmount(0);
      setIsProcessingBet(false);
    };
  }, []);

  // Слушаем события от WebSocket
  useEffect(() => {
    // Обрабатываем только последние события, избегая дублирования
    const lastEvent = lobbyEvents[lobbyEvents.length - 1];
    if (!lastEvent) return;
    
    console.log('lobbyEvent', lastEvent);
    
    // Если sessionId изменился (новая игра) — всегда сбрасываем всё
    if (lastEvent.type === 'game-start' && lastEvent.sessionId && lastEvent.sessionId !== sessionId) {
      setPhase('betting');
      setCrashPoint(1.0);
      setCrashTime(20000); // Сброс crashTime
      setStartTime(lastEvent.startTime || 0);
      setDuration(lastEvent.duration || 20000);
      setBetEndTime(lastEvent.betEndTime || 0);
      setSeed(String(lastEvent.seed ?? ''));
      setSessionId(lastEvent.sessionId);
      setUserBet(null);
      setUserCashout(null);
      setUserBetAmount(0);
      return;
    }
    
    // Используем sessionId для предотвращения обработки старых событий
    if (lastEvent.sessionId && lastEvent.sessionId !== sessionId && sessionId !== '') {
      console.log('Skipping old event for session:', lastEvent.sessionId, 'current:', sessionId);
      return;
    }
    
    if (lastEvent.type === 'sync') {
      setPhase(lastEvent.phase);
      setCrashPoint(lastEvent.crashPoint);
      setCrashTime(lastEvent.crashTime || 20000);
      setStartTime(lastEvent.startTime);
      setDuration(lastEvent.duration);
      setBetEndTime(lastEvent.betEndTime);
      setSeed(String(lastEvent.seed ?? ''));
      setSessionId(lastEvent.sessionId || '');
      // Сбрасываем ставки при синхронизации
      setUserBet(null);
      setUserCashout(null);
    } else if (lastEvent.type === 'game-start') {
      setPhase('betting');
      setCrashPoint(lastEvent.crashPoint);
      setCrashTime(20000); // По умолчанию для betting
      setStartTime(lastEvent.startTime);
      setDuration(lastEvent.duration);
      setBetEndTime(lastEvent.betEndTime);
      setSeed(String(lastEvent.seed ?? ''));
      setSessionId(lastEvent.sessionId || '');
      // Сбрасываем ставки при новой игре
      setUserBet(null);
      setUserCashout(null);
      setUserBetAmount(0);
    } else if (lastEvent.type === 'game-flying') {
      setPhase('flying');
      setCrashPoint(lastEvent.crashPoint);
      setCrashTime(lastEvent.crashTime || 20000); // Получаем crashTime от сервера
      setStartTime(lastEvent.startTime);
      setDuration(lastEvent.duration);
      setSeed(String(lastEvent.seed ?? ''));
      setSessionId(lastEvent.sessionId || '');
    } else if (lastEvent.type === 'game-crash') {
      setPhase('crashed');
      setCrashPoint(lastEvent.crashPoint);
      setCrashTime(lastEvent.crashTime || 20000);
      setStartTime(lastEvent.startTime);
      setDuration(lastEvent.duration);
      setSeed(String(lastEvent.seed ?? ''));
      setSessionId(lastEvent.sessionId || '');
      // Сбрасываем ставки при краше
      setUserBet(null);
      setUserCashout(null);
      setUserBetAmount(0);
    } else if (lastEvent.type === 'balance-update') {
      setBalance(lastEvent.balance);
    } else if (lastEvent.type === 'bet' && lastEvent.userId === wsUser?.id) {
      // Подтверждение нашей ставки - устанавливаем сумму ставки (не накапливаем)
      setUserBetAmount(lastEvent.bet);
      // Сбрасываем состояние обработки
      setIsProcessingBet(false);
      if (betTimeoutRef.current) {
        clearTimeout(betTimeoutRef.current);
      }
    } else if (lastEvent.type === 'cashout' && lastEvent.userId === wsUser?.id) {
      // Подтверждение нашего вывода
      setUserCashout(lastEvent.multiplier);
      // Сбрасываем состояние обработки
      setIsProcessingBet(false);
      if (betTimeoutRef.current) {
        clearTimeout(betTimeoutRef.current);
      }
    }
  }, [lobbyEvents, setBalance, wsUser?.id, sessionId]);

  const handlePlaceBet = (amount: number) => {
    if (phase !== 'betting' || balance < amount || isProcessingBet || !connected) {
      console.log('Bet blocked:', { phase, balance, amount, isProcessingBet, connected });
      return;
    }
    console.log('Placing bet:', amount, 'connected:', connected);
    setIsProcessingBet(true);
    sendBet(amount);
    if (betTimeoutRef.current) {
      clearTimeout(betTimeoutRef.current);
    }
    betTimeoutRef.current = setTimeout(() => {
      setIsProcessingBet(false);
    }, 2000);
  };

  const handleCashout = (currentMultiplier: number) => {
    if (phase !== 'flying' || userBetAmount === 0 || userCashout || isProcessingBet || !connected) return;
    
    setIsProcessingBet(true);
    sendCashout(userBetAmount);
    
    // Сбрасываем состояние через 2 секунды
    if (betTimeoutRef.current) {
      clearTimeout(betTimeoutRef.current);
    }
    betTimeoutRef.current = setTimeout(() => {
      setIsProcessingBet(false);
    }, 2000);
  };

  // Вычисляем текущий множитель для CrashBetControls
  let currentMultiplier = 1.0;
  if (phase === 'flying') {
    const elapsed = Math.max(0, Date.now() - startTime);
    const timeProgress = elapsed / crashTime;
    
    if (timeProgress >= 1) {
      // Игра уже крашнулась
      currentMultiplier = crashPoint || 1.0;
    } else {
      // Экспоненциальный рост коэффициента
      currentMultiplier = Math.pow(Math.E, timeProgress * Math.log(crashTime / 1000));
    }
  } else if (phase === 'crashed') {
    // ВСЕГДА показываем crashPoint
    currentMultiplier = crashPoint;
  }

  // Функции для модального окна баланса
  const handleOpenBalanceModal = () => {
    setIsBalanceModalOpen(true);
  };

  const handleCloseBalanceModal = () => {
    setIsBalanceModalOpen(false);
  };

  const handleWithdraw = () => {
    // TODO: Реализовать вывод средств
    console.log('Withdraw:', { amount: withdrawAmount, address: withdrawAddress });
    handleCloseBalanceModal();
  };

  const handleWithdrawImba = () => {
    // TODO: Реализовать вывод через Stars
    console.log('Withdraw Imba:', { amount: withdrawAmount });
    handleCloseBalanceModal();
  };

  const handleBuyImbaCoin = (amount: number) => {
    // TODO: Реализовать покупку Imba Coin
    console.log('Buy Imba Coin:', amount);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Только теперь — return 'Загрузка...'
  if (!connected || !wsUser) {
    return <div className='w-full flex flex-col items-center justify-center min-h-[300px] text-gray-400'>Загрузка...</div>;
  }

  return (
    <div className="w-full flex flex-col items-center px-2 sm:px-0">
      <div className="w-full max-w-[1200px] mx-auto flex justify-center items-center" style={{ minHeight: gameSize.height }}>
        <div className="flex flex-col items-center w-full h-auto">
          <PhaserGame
            phase={phase}
            startTime={startTime}
            crashPoint={crashPoint}
            crashTime={crashTime}
            duration={duration}
            betEndTime={betEndTime}
            width={gameSize.width}
            height={gameSize.height}
            userBet={userBet}
            userCashout={userCashout}
            sessionId={sessionId}
          />

        </div>
      </div>
      <div className="max-w-[483px] w-full mx-auto mt-6">
        <CrashBetControls
          gameState={phase}
          currentMultiplier={currentMultiplier}
          onPlaceBet={handlePlaceBet}
          onCashout={() => handleCashout(currentMultiplier)}
          userBet={userBetAmount > 0 ? userBetAmount : null}
          userCashout={userCashout}
          balance={balance}
          connected={connected}
          onOpenBalanceModal={handleOpenBalanceModal}
        />
      </div>
      {/* История игр */}
      <div className="max-w-[483px] w-full mx-auto mt-6">
        <GameHistory userId={wsUser?.telegramId} />
      </div>
      
      {/* История коэффициентов */}
      <div className="max-w-[483px] w-full mx-auto mt-6">
        <SessionHistory />
      </div>
      
      {/* Топ выигрышей */}
      <div className="max-w-[483px] w-full mx-auto mt-6">
        <TopRecords />
      </div>
      
      {/* Seed в самом низу */}
      {seed && (
        <div className="max-w-[483px] w-full mx-auto mt-4 p-2 bg-gray-800/30 rounded-lg text-center">
          <p className="text-gray-400 text-xs">Seed: #{seed}</p>
          {phase === 'crashed' && crashPoint && (
            <p className="text-gray-400 text-xs">Crash: {crashPoint.toFixed(4)}x</p>
          )}
        </div>
      )}

      {/* Модальное окно баланса */}
      <BalanceModal
        isOpen={isBalanceModalOpen}
        onClose={handleCloseBalanceModal}
        activeTab={balanceModalTab}
        setActiveTab={setBalanceModalTab}
        withdrawAmount={withdrawAmount}
        setWithdrawAmount={setWithdrawAmount}
        withdrawAddress={withdrawAddress}
        setWithdrawAddress={setWithdrawAddress}
        onWithdraw={handleWithdraw}
        onWithdrawImba={handleWithdrawImba}
        balance={balance}
        copyToClipboard={copyToClipboard}
        onBuyImbaCoin={handleBuyImbaCoin}
      />
    </div>
  );
} 