'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import { DeskButton } from '@/components/shared/DeskButton';
import { Calculator, BookA, Settings, Info, LogOut } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

export default function MainMenu() {
  const router = useRouter();
  const { player, isLoading, setPlayer } = usePlayer();

  useEffect(() => {
    if (!isLoading && !player) {
      router.push('/login');
    }
  }, [player, isLoading, router]);

  if (isLoading || !player) {
    return <div className="h-screen w-screen bg-desk-white flex items-center justify-center font-sans">Načítám...</div>;
  }

  return (
    <main className="h-screen w-screen bg-desk-white overflow-hidden flex flex-col items-center justify-center p-6 font-sans text-board-black relative">

      {/* Profile Header */}
      <div className="absolute top-6 right-6 flex items-center gap-4 bg-white p-3 pr-6 rounded-full shadow-sm border-4 border-slate-100">
        <Image src={`/avatars/${player.avatar}.png`} alt={player.username} width={48} height={48} className="w-12 h-12" />
        <div className="flex flex-col mr-2">
          <span className="font-black text-xl leading-none">{player.username}</span>
        </div>
        <button
          onClick={() => setPlayer(null)}
          className="ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          title="Odhlásit se"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center gap-6 mb-10">
        <Image src="/icon.png" alt="Orel" width={120} height={120} className="w-28 h-28 mix-blend-multiply" priority />
        <h1 className="text-8xl font-black italic drop-shadow-sm">Chytrý Školák</h1>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-md text-board-black">
        <DeskButton size="xl" onClick={() => router.push('/math')} className="bg-class-green shadow-[0_8px_0_0_rgba(163,230,53,0.3)] py-8">
          <Calculator className="mr-6 w-12 h-12 shrink-0" strokeWidth={2.5} />
          <span>Matematika</span>
        </DeskButton>

        <DeskButton size="xl" onClick={() => router.push('/english')} className="bg-[#38BDF8] text-white border-none shadow-[0_8px_0_0_rgba(56,189,248,0.3)] py-8 text-white">
          <BookA className="mr-6 w-12 h-12 shrink-0 text-white" strokeWidth={2.5} />
          <span className="text-white">Angličtina</span>
        </DeskButton>

        <div className="flex gap-4 mt-4 w-full">
          <DeskButton size="md" variant="outline" className="flex-1 border-slate-200 py-4" onClick={() => router.push('/settings')}>
            <Settings className="mr-2 w-6 h-6 text-slate-400" />
            <span className="text-xl">Slovníček</span>
          </DeskButton>

          <DeskButton size="md" variant="outline" className="flex-1 border-slate-200 py-4" onClick={() => router.push('/about')}>
            <Info className="mr-2 w-6 h-6 text-slate-400" />
            <span className="text-xl">O aplikaci</span>
          </DeskButton>
        </div>
      </div>
    </main>
  );
}
