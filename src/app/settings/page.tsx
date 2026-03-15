'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DeskButton } from '@/components/shared/DeskButton';
import { Home, Plus, Trash2, Loader2, Calendar, Volume2, RefreshCw, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { addVocabularyWord, adminRegenerateAll } from '../actions/vocabulary';
import { VocabularyWord } from '@/types/english';

export default function SettingsPage() {
  const router = useRouter();
  const [enWord, setEnWord] = useState('');
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminWorking, setIsAdminWorking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { fetchWords(); }, []);

  const fetchWords = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('vocabulary').select('*').order('created_at', { ascending: false });
      if (data) setWords(data as VocabularyWord[]);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enWord.trim() || !isSupabaseConfigured) return;

    setIsLoading(true);
    setErrorMsg(null);
    const result = await addVocabularyWord(enWord.trim());

    if (result.success) {
      setEnWord('');
      fetchWords();
    } else {
      setErrorMsg(result.error);
    }
    setIsLoading(false);
  };

  const handleRegenerate = async () => {
    if (!confirm('Tato akce dogeneruje chybějící audio a chytré varianty pro všechna slova. Pokračovat?')) return;
    setIsAdminWorking(true);
    const result = await adminRegenerateAll();
    setIsAdminWorking(false);
    if (result.success) {
      alert(`Hotovo! Aktualizováno ${result.count} slovíček.`);
      fetchWords();
    }
  };

  const handleDelete = async (id: string, audioUrl?: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    if (confirm('Opravdu chceš smazat toto slovíčko?')) {
      await supabase.from('vocabulary').delete().eq('id', id);
      if (audioUrl) {
        try {
          const fileName = audioUrl.split('/').pop();
          if (fileName) await supabase.storage.from('audio').remove([fileName]);
        } catch (e) {}
      }
      fetchWords();
    }
  };

  const playPreview = (url: string) => {
    const audio = new Audio(url);
    audio.play();
  };

  return (
    <main className="h-screen w-screen bg-slate-50 flex flex-col p-6 font-sans text-slate-900 overflow-hidden text-board-black">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <DeskButton variant="outline" size="md" onClick={() => router.push('/')} className="border-slate-400">
            <Home className="w-8 h-8 text-slate-600" />
          </DeskButton>
          <h1 className="text-6xl font-black italic text-slate-800">Slovníček (Admin)</h1>
        </div>
        <DeskButton variant="outline" size="md" onClick={handleRegenerate} disabled={isAdminWorking} className="border-slate-300 text-slate-400 py-3">
          {isAdminWorking ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <RefreshCw className="w-6 h-6 mr-3" />}
          Regenerovat vše
        </DeskButton>
      </div>

      <div className="flex gap-8 flex-1 min-h-0 text-board-black">
        <div className="w-[400px] bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-100 flex flex-col gap-6 shrink-0">
          <h2 className="text-3xl font-black mb-2">Nové slovíčko</h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-2">Anglicky</label>
              <input 
                type="text" 
                value={enWord} 
                onChange={(e) => setEnWord(e.target.value)} 
                className="w-full text-3xl font-black py-5 px-6 rounded-2xl border-4 border-slate-100 focus:border-[#38BDF8] outline-none bg-slate-50 text-slate-900"
                placeholder="apple"
                autoFocus
              />
            </div>
            {errorMsg && (
              <div className="bg-error/10 text-error p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <p className="text-sm font-bold leading-tight">{errorMsg}</p>
              </div>
            )}
            <DeskButton size="lg" variant="outline" className="w-full py-6 text-2xl border-slate-800 text-slate-800 bg-white" type="submit" disabled={!enWord.trim() || isLoading || !isSupabaseConfigured}>
              {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Plus className="w-8 h-8 mr-2" />} 
              {isLoading ? 'Ukládám...' : 'Přidat do slovníku'}
            </DeskButton>
          </form>
          <p className="text-[10px] text-slate-400 text-center mt-auto uppercase font-bold tracking-wider">Automaticky vytvoří zvuk a podobné varianty</p>
        </div>

        <div className="flex-1 bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-100 flex flex-col overflow-hidden">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black">Seznam slovíček</h2>
              <span className="bg-slate-100 px-4 py-1 rounded-full text-slate-400 font-bold text-sm">Počet: {words.length}</span>
           </div>
           <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-3">
              {words.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20"><p className="text-2xl font-black uppercase">Prázdno</p></div>
              ) : (
                words.map((w) => (
                  <div key={w.id} className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-8 text-3xl font-black">
                      <div className="text-slate-900 uppercase">{w.en}</div>
                      <div className="flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3 h-3" /><p className="text-[10px] font-bold uppercase tracking-wider">{new Date(w.created_at).toLocaleDateString('cs-CZ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {w.audio_url && (<button onClick={() => playPreview(w.audio_url!)} className="text-[#38BDF8] hover:bg-white p-3 rounded-xl transition-all"><Volume2 className="w-6 h-6" /></button>)}
                      <button onClick={() => handleDelete(w.id, w.audio_url)} className="text-slate-200 hover:text-error transition-colors p-3 rounded-xl"><Trash2 className="w-6 h-6" /></button>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </main>
  );
}
