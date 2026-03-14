'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DeskButton } from '@/components/shared/DeskButton';
import { Home, Plus, Trash2, Languages, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { translateWord } from '../actions/translate';
import { VocabularyWord } from '@/types/english';

export default function SettingsPage() {
  const router = useRouter();
  const [enWord, setEnWord] = useState('');
  const [czWord, setCzWord] = useState('');
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('vocabulary').select('*').order('created_at', { ascending: false });
      if (data) setWords(data as VocabularyWord[]);
    }
  };

  const handleTranslate = async () => {
    if (!enWord.trim()) return;
    setIsTranslating(true);
    const translation = await translateWord(enWord.trim());
    if (translation) setCzWord(translation);
    setIsTranslating(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enWord.trim() || !czWord.trim() || !isSupabaseConfigured || !supabase) return;

    setIsLoading(true);
    const { error } = await supabase.from('vocabulary').insert([
      { en: enWord.trim().toLowerCase(), cz: czWord.trim().toLowerCase() }
    ]);

    if (!error) {
      setEnWord('');
      setCzWord('');
      fetchWords();
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    if (confirm('Opravdu chceš smazat toto slovíčko?')) {
      await supabase.from('vocabulary').delete().eq('id', id);
      fetchWords();
    }
  };

  return (
    <main className="h-screen w-screen bg-desk-white flex flex-col p-6 font-sans text-board-black overflow-hidden text-board-black">
      <div className="flex items-center gap-6 mb-6">
        <DeskButton variant="outline" size="md" onClick={() => router.push('/')}>
          <Home className="w-8 h-8" />
        </DeskButton>
        <h1 className="text-6xl font-black italic">Slovníček (Admin)</h1>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Přidávací formulář - Levá strana */}
        <div className="w-[400px] bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-50 flex flex-col gap-6 shrink-0">
          <h2 className="text-3xl font-black mb-2">Nové slovíčko</h2>
          
          <div className="flex flex-col gap-2">
            <label className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-2">Anglicky</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={enWord} 
                onChange={(e) => setEnWord(e.target.value)} 
                className="w-full text-2xl font-black py-4 px-6 rounded-2xl border-4 border-slate-100 focus:border-[#38BDF8] outline-none bg-slate-50 text-board-black"
                placeholder="dog"
              />
              <button 
                onClick={handleTranslate} 
                disabled={isTranslating || !enWord}
                className="bg-[#38BDF8] text-white p-4 rounded-2xl shadow-lg hover:scale-95 active:scale-90 transition-all disabled:opacity-30 disabled:grayscale"
              >
                {isTranslating ? <Loader2 className="w-8 h-8 animate-spin" /> : <Languages className="w-8 h-8" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-2">Česky</label>
            <input 
              type="text" 
              value={czWord} 
              onChange={(e) => setCzWord(e.target.value)} 
              className="w-full text-2xl font-black py-4 px-6 rounded-2xl border-4 border-slate-100 focus:border-class-green outline-none bg-slate-50 text-board-black"
              placeholder="pes"
            />
          </div>

          <div className="mt-auto pt-6 border-t-2 border-slate-50">
            <DeskButton size="lg" className="w-full py-6 text-2xl" onClick={handleAdd} disabled={!enWord || !czWord || isLoading || !isSupabaseConfigured}>
              {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Plus className="w-8 h-8 mr-2" />} Přidat slovíčko
            </DeskButton>
            
            {!isSupabaseConfigured && (
              <p className="text-error text-[10px] font-bold text-center mt-4 uppercase tracking-tighter">Chybí připojení k databázi!</p>
            )}
          </div>
        </div>

        {/* Seznam slovíček - Pravá strana */}
        <div className="flex-1 bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-50 flex flex-col overflow-hidden">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black">Databáze slovíček</h2>
              <span className="bg-slate-100 px-4 py-1 rounded-full text-slate-400 font-bold text-sm">Celkem: {words.length}</span>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-3">
              {words.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                   <BookA className="w-32 h-32 mb-4" />
                   <p className="text-2xl font-black uppercase">Zatím prázdno</p>
                </div>
              ) : (
                words.map((w) => (
                  <div key={w.id} className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 hover:border-[#38BDF8]/30 transition-all">
                    <div className="flex items-center gap-8 text-2xl font-black">
                      <span className="w-40 text-[#38BDF8] truncate">{w.en}</span>
                      <span className="text-slate-300 text-sm">-&gt;</span>
                      <span className="text-board-black">{w.cz}</span>
                    </div>
                    <button onClick={() => handleDelete(w.id)} className="text-slate-200 hover:text-error transition-colors p-2">
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </main>
  );
}

import { BookA } from 'lucide-react';
