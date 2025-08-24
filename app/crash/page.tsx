import dynamic from 'next/dynamic';

const PhaserCrashGame = dynamic(() => import('../../components/crash/PhaserCrashGame'), { ssr: false });

export default function CrashPage() {
  return (
    <div className="w-full h-full min-h-screen bg-black flex items-center justify-center">
      <PhaserCrashGame />
    </div>
  );
} 