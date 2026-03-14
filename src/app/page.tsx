'use client';

import { useRouter } from 'next/navigation';
import { DeskButton } from '@/components/shared/DeskButton';
import { Calculator, BookA, Settings, GraduationCap } from 'lucide-react';

export default function MainMenu() {
  const router = useRouter();

  return (
    <main className="h-screen w-screen bg-desk-white overflow-hidden flex flex-col items-center justify-center p-6 font-sans text-board-black">
      <div className="flex items-center gap-4 mb-10">
        <GraduationCap className="w-16 h-16 text-class-green" strokeWidth={2.5} />
        <h1 className="text-8xl font-black italic drop-shadow-sm">Škola hrou</h1>
      </div>
      
      <div className="flex flex-col gap-6 w-full max-w-md">
        <DeskButton size="xl" onClick={() => router.push('/math')} className="bg-class-green shadow-[0_8px_0_0_rgba(163,230,53,0.3)] py-8">
          <Calculator className="mr-6 w-12 h-12 shrink-0" strokeWidth={2.5} /> 
          <span>Matematika</span>
        </DeskButton>
        
        <DeskButton size="xl" onClick={() => router.push('/english')} className="bg-[#38BDF8] text-white border-none shadow-[0_8px_0_0_rgba(56,189,248,0.3)] py-8">
          <BookA className="mr-6 w-12 h-12 shrink-0" strokeWidth={2.5} /> 
          <span>Angličtina</span>
        </DeskButton>

        <DeskButton size="lg" variant="outline" className="mt-6 border-slate-200" onClick={() => router.push('/settings')}>
          <Settings className="mr-4 w-8 h-8 text-slate-400" /> 
          <span className="text-2xl">Slovníček (Admin)</span>
        </DeskButton>
      </div>
    </main>
  );
}
