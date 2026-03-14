'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { EnglishGameState, EnglishMode, EnglishProblem, EnglishStats, EnglishLeaderboardEntry, VocabularyWord } from '../../types/english';
import { generateEnglishProblem, playAudio } from '../../lib/english-logic';
import { DeskButton } from '../shared/DeskButton';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Trophy, Timer, RotateCcw, Play, CheckCircle2, XCircle, Home, ListOrdered, Save, Target, Frown, Star, Loader2, Volume2, ArrowRight, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

const LOCAL_STORAGE_KEY = 'english-leaderboard-local-v2';

export default function EnglishGameContainer() {
  const router = useRouter();
  const [gameState, setGameState] = useState<EnglishGameState>('HOME');
  const [gameMode, setGameMode] = useState<'training' | 'competition'>('training');
  const [selectedMode, setSelectedMode] = useState<EnglishMode>('en-cz');
  
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [currentProblem, setCurrentProblem] = useState<EnglishProblem | null>(null);
  const [stats, setStats] = useState<EnglishStats>({ correct: 0, total: 0, errors: 0, percentage: 0 });
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [clickedOptions, setClickedOptions] = useState<Set<string>>(new Set());
  const [hasErrorInCurrent, setHasErrorInCurrent] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [spellingInput, setSpellingInput] = useState('');
  const [leaderboard, setLeaderboard] = useState<EnglishLeaderboardEntry[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<EnglishMode | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [fromDate, setFromDate] = useState<string>(''); // Date string YYYY-MM-DD

  const spellingInputRef = useRef<HTMLInputElement>(null);

  // --- Data Fetching ---

  const fetchWords = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('vocabulary').select('*').order('created_at', { ascending: false });
      if (data) setWords(data as VocabularyWord[]);
    } else {
      // Mock data for local dev
      const mockWords = [
        { id: '1', en: 'cat', cz: 'kočka', created_at: '2024-01-01' },
        { id: '2', en: 'dog', cz: 'pes', created_at: '2024-01-01' },
        { id: '3', en: 'house', cz: 'dům', created_at: '2024-01-01' },
        { id: '4', en: 'tree', cz: 'strom', created_at: '2024-01-01' },
        { id: '5', en: 'apple', cz: 'jablko', created_at: '2024-01-01' },
      ];
      setWords(mockWords);
    }
  }, []);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      setLeaderboard(saved ? JSON.parse(saved) : []);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await supabase.from('english_leaderboard').select('*').order('score', { ascending: false }).limit(100);
      if (data) setLeaderboard(data as EnglishLeaderboardEntry[]);
    } catch (err) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      setLeaderboard(saved ? JSON.parse(saved) : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { if (gameState === 'LEADERBOARD') fetchLeaderboard(); }, [gameState, fetchLeaderboard]);

  // --- Logic ---

  const getFilteredWords = useCallback(() => {
    if (!fromDate) return words;
    const cutoff = new Date(fromDate);
    return words.filter(w => new Date(w.created_at) >= cutoff);
  }, [words, fromDate]);

  const filteredCount = getFilteredWords().length;

  const saveToLeaderboard = async () => {
    if (!playerName.trim()) return;
    setIsLoading(true);
    const accuracy = Math.round((stats.correct / (stats.total || 1)) * 100);
    const rawScore = (stats.correct * 10) - (stats.errors * 5);
    const finalScore = Math.max(0, Math.round(rawScore * (accuracy / 100)));

    const entry: EnglishLeaderboardEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name: playerName.trim().toUpperCase(),
      score: finalScore,
      errors: stats.errors,
      total: stats.total,
      accuracy,
      mode: selectedMode,
      date: new Date().toLocaleDateString('cs-CZ'),
    };

    const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localList = localSaved ? JSON.parse(localSaved) : [];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...localList, entry].sort((a, b) => b.score - a.score).slice(0, 100)));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('english_leaderboard').insert([{ ...entry }]);
    }
    
    setLeaderboardTab('all');
    setGameState('LEADERBOARD');
    setPlayerName('');
    setIsLoading(false);
  };

  const startNewGame = (mode: 'training' | 'competition') => {
    const filtered = getFilteredWords();
    if (filtered.length < 4) {
      alert(`Potřebuješ aspoň 4 slovíčka. Aktuálně máš vybráno: ${filtered.length}.`);
      return;
    }
    setGameMode(mode);
    setStats({ correct: 0, total: 0, errors: 0, percentage: 0 });
    setTimeLeft(60);
    setGameState('PLAYING');
    nextProblem(filtered);
  };

  const nextProblem = useCallback((currentWords: VocabularyWord[] = getFilteredWords()) => {
    setFeedback(null);
    setClickedOptions(new Set());
    setHasErrorInCurrent(false);
    setSpellingInput('');
    
    const problem = generateEnglishProblem(currentWords, [selectedMode]);
    setCurrentProblem(problem);

    if (problem?.audioText && (problem.type === 'listen' || problem.type === 'spelling')) {
      setTimeout(() => playAudio(problem.audioText!), 300);
    }
    if (problem?.type === 'spelling') {
      setTimeout(() => spellingInputRef.current?.focus(), 100);
    }
  }, [getFilteredWords, selectedMode]);

  const handleAnswer = (answer: string) => {
    if (!currentProblem || feedback === 'correct') return;
    const isCorrect = answer.toLowerCase().trim() === currentProblem.correctAnswer.toLowerCase().trim();

    if (gameMode === 'training') {
      if (isCorrect) {
        setFeedback('correct');
        if (!hasErrorInCurrent) setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        setStats(prev => ({ ...prev, total: prev.total + 1 }));
        setTimeout(() => nextProblem(), 800);
      } else {
        setFeedback('wrong');
        setHasErrorInCurrent(true);
        setClickedOptions(prev => new Set(prev).add(answer));
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      }
    } else {
      if (isCorrect) setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      else setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      setStats(prev => ({ ...prev, total: prev.total + 1 }));
      nextProblem();
    }
  };

  const handleSpellingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spellingInput.trim()) return;
    handleAnswer(spellingInput);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'PLAYING' && gameMode === 'competition' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'PLAYING') {
      setGameState('RESULTS');
    }
    return () => clearInterval(timer);
  }, [gameState, gameMode, timeLeft]);

  // --- Render ---

  if (gameState === 'HOME') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 font-sans text-board-black">
        <div className="absolute top-6 left-6"><DeskButton variant="outline" size="md" onClick={() => router.push('/')}><Home className="w-6 h-6" /></DeskButton></div>
        <h1 className="text-8xl font-black mb-2 italic drop-shadow-sm text-[#38BDF8]">Angličtina</h1>
        <div className="flex flex-col gap-4 w-full max-w-md">
          <DeskButton size="xl" onClick={() => { setGameMode('training'); setGameState('SETUP'); }} className="bg-[#38BDF8] text-white border-none shadow-[0_8px_0_0_rgba(56,189,248,0.3)]"><Play className="mr-4 w-12 h-12" fill="currentColor" strokeWidth={2.5} /> Trénink</DeskButton>
          <DeskButton size="xl" variant="secondary" onClick={() => { setGameMode('competition'); setGameState('SETUP'); }}><Trophy className="mr-4 w-12 h-12" fill="currentColor" strokeWidth={2.5} /> Soutěž</DeskButton>
          <DeskButton size="lg" variant="outline" className="border-slate-200" onClick={() => setGameState('LEADERBOARD')}><ListOrdered className="mr-4 w-8 h-8" /> Žebříček</DeskButton>
        </div>
      </div>
    );
  }

  if (gameState === 'LEADERBOARD') {
    const filteredLeaderboard = leaderboardTab === 'all' ? leaderboard : leaderboard.filter(e => e.mode === leaderboardTab);
    return (
      <div className="flex flex-col items-center h-full gap-4 p-4 relative bg-desk-white font-sans text-board-black">
        <div className="absolute top-6 left-6"><DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')}><Home className="w-6 h-6" /></DeskButton></div>
        <h2 className="text-5xl font-black mt-2 italic text-[#38BDF8]">Síň slávy</h2>
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] overflow-x-auto w-full max-w-5xl justify-center">
          <DeskButton size="md" variant={leaderboardTab === 'all' ? 'primary' : 'outline'} className={`border-none shadow-none py-2 px-4 whitespace-nowrap ${leaderboardTab === 'all' ? 'bg-[#38BDF8] text-white' : ''}`} onClick={() => setLeaderboardTab('all')}>Všechno</DeskButton>
          {(['en-cz', 'cz-en', 'listen', 'spelling'] as const).map(m => (
            <DeskButton key={m} size="md" variant={leaderboardTab === m ? 'primary' : 'outline'} className={`border-none shadow-none py-2 px-4 whitespace-nowrap ${leaderboardTab === m ? 'bg-[#38BDF8] text-white' : ''}`} onClick={() => setLeaderboardTab(m)}>{m}</DeskButton>
          ))}
        </div>
        <div className="w-full max-w-4xl bg-white rounded-[2.5rem] p-6 shadow-xl overflow-hidden flex-1 mb-2 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4"><Loader2 className="w-12 h-12 animate-spin text-slate-200" /><p className="text-xl text-slate-300 font-bold">Načítám...</p></div>
          ) : filteredLeaderboard.length === 0 ? (
            <p className="text-center text-2xl text-slate-300 py-16">Zatím žádné výsledky</p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto h-full pr-2">
              <div className="flex text-slate-400 font-bold px-4 mb-1 uppercase text-[10px] tracking-[0.2em]">
                 <span className="w-10 text-center">#</span><span className="flex-1">Jméno</span><span className="w-20 text-center">Úspěch</span><span className="w-16 text-center">Ano</span><span className="w-16 text-center">Ne</span><span className="w-24 text-center font-black">Body</span>
              </div>
              {filteredLeaderboard.map((entry, i) => (
                <div key={entry.id} className="flex items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-2xl font-black text-slate-300 w-10 italic text-center">#{i + 1}</span>
                  <div className="flex-1 ml-3"><p className="text-xl font-black leading-tight uppercase">{entry.name} <span className="text-[10px] text-slate-300 font-normal">({entry.mode})</span></p></div>
                  <div className="w-20 text-center text-xl font-black text-[#38BDF8] bg-[#38BDF8]/10 py-1 rounded-lg">{entry.accuracy}%</div>
                  <div className="w-16 text-center text-xl font-black text-success/70">{entry.score > 0 ? entry.total - entry.errors : '-'}</div>
                  <div className="w-16 text-center text-xl font-black text-error/40">{entry.errors}</div>
                  <div className="w-24 text-center text-2xl font-black">{entry.score}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'SETUP') {
    const isCompetition = gameMode === 'competition';
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 relative font-sans text-board-black">
        <div className="absolute top-6 left-6"><DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')}><Home className="w-6 h-6" /></DeskButton></div>
        <h2 className="text-6xl font-black italic text-[#38BDF8]">{isCompetition ? 'Soutěž' : 'Trénink'}</h2>
        
        <div className="flex flex-col gap-3 items-center w-full max-w-xl bg-white p-6 rounded-[2rem] border-4 border-slate-50">
          <div className="flex items-center gap-3 text-slate-400">
            <Calendar className="w-6 h-6" />
            <p className="text-xl font-black uppercase tracking-widest text-board-black">Která slovíčka?</p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <input 
              type="date" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-center text-2xl font-bold py-3 rounded-xl border-4 border-slate-100 focus:border-[#38BDF8] outline-none bg-slate-50"
            />
            <div className="flex justify-between items-center px-4 mt-1">
               <button onClick={() => setFromDate('')} className="text-sm font-bold text-[#38BDF8] underline">Zrušit datum (Všechna)</button>
               <span className="text-lg font-black text-slate-400">Celkem: <span className={filteredCount < 4 ? 'text-error' : 'text-[#38BDF8]'}>{filteredCount}</span></span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 items-center">
          <p className="text-xl font-black text-slate-300 uppercase tracking-widest">Vyber jeden režim</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {(['en-cz', 'cz-en', 'listen', 'spelling'] as EnglishMode[]).map(op => {
              const labels = { 'en-cz': 'Anglicky -> Česky', 'cz-en': 'Česky -> Anglicky', 'listen': 'Poslech', 'spelling': 'Psaní (Spelling)' };
              return (
                <DeskButton key={op} size="md" variant={selectedMode === op ? 'primary' : 'outline'} className={`py-4 ${selectedMode === op ? 'bg-[#38BDF8] shadow-[#38BDF8]/30 text-white' : ''}`} onClick={() => setSelectedMode(op)}>{labels[op]}</DeskButton>
              );
            })}
          </div>
        </div>
        <DeskButton size="xl" variant="secondary" className="mt-4 px-20 bg-[#38BDF8] shadow-[#38BDF8]/30" onClick={() => startNewGame(gameMode)}>START!</DeskButton>
      </div>
    );
  }

  if (gameState === 'PLAYING' && currentProblem) {
    const isSpelling = currentProblem.type === 'spelling';
    const isListen = currentProblem.type === 'listen';
    return (
      <div className="flex flex-col h-full relative p-4 font-sans text-board-black">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3 items-center">
             <DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')}><Home className="w-6 h-6" /></DeskButton>
             <div className="flex gap-2">
               <div className="bg-white rounded-xl px-5 py-2 shadow-sm border-2 border-slate-50 flex items-center gap-2"><CheckCircle2 className="text-success w-6 h-6" /><span className="text-3xl font-black text-success leading-none">{stats.correct}</span></div>
               {stats.errors > 0 && (<div className="bg-white rounded-xl px-5 py-2 shadow-sm border-2 border-slate-50 flex items-center gap-2"><XCircle className="text-error w-6 h-6" /><span className="text-3xl font-black text-error leading-none">{stats.errors}</span></div>)}
             </div>
          </div>
          {gameMode === 'competition' && (
            <div className="flex flex-col items-end gap-1 w-1/4">
              <div className="flex items-center gap-2"><Timer className="w-6 h-6" /><span className="text-3xl font-mono font-black">{timeLeft}s</span></div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-white shadow-inner"><div className="h-full bg-[#38BDF8] transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 60) * 100}%` }} /></div>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-6">
            {(isListen || isSpelling) && currentProblem.audioText && (
               <DeskButton variant="outline" size="lg" className="rounded-full w-48 h-48 border-8 border-[#38BDF8] text-[#38BDF8] shadow-xl hover:bg-[#38BDF8]/10 transition-all" onClick={() => playAudio(currentProblem.audioText!)}>
                 <Volume2 className="w-24 h-24" strokeWidth={3} />
               </DeskButton>
            )}
            <div className="text-6xl md:text-9xl font-black tracking-tight text-center text-board-black drop-shadow-sm px-4">
              {currentProblem.questionText}
            </div>
          </div>
          <div className="w-full max-w-4xl mt-8">
            {isSpelling ? (
              <form onSubmit={handleSpellingSubmit} className="flex flex-col items-center gap-6 w-full px-4 text-board-black">
                 <input ref={spellingInputRef} type="text" value={spellingInput} onChange={(e) => setSpellingInput(e.target.value)} className={`w-full max-w-2xl text-center text-6xl font-black py-8 rounded-[2rem] border-8 outline-none bg-white text-board-black transition-all ${feedback === 'correct' ? 'border-success text-success bg-success/10' : feedback === 'wrong' ? 'border-error text-error bg-error/10' : 'border-slate-200 focus:border-[#38BDF8]'}`} autoFocus autoCapitalize="none" autoComplete="off" disabled={feedback === 'correct'} />
                 <DeskButton size="xl" type="submit" variant="primary" className="bg-[#38BDF8] text-white shadow-[#38BDF8]/30 w-full max-w-2xl h-24" disabled={feedback === 'correct'}><ArrowRight className="w-12 h-12" /></DeskButton>
              </form>
            ) : (
              <div className="grid gap-6 w-full grid-cols-2 px-4">
                {currentProblem.options?.map((opt, i) => (
                  <DeskButton key={i} size="xl" variant={feedback === 'correct' && opt === currentProblem.correctAnswer ? 'success' : clickedOptions.has(opt) ? 'error' : 'primary'} className={`w-full h-32 text-4xl md:text-5xl font-black ${feedback !== 'correct' && !clickedOptions.has(opt) ? 'bg-white text-board-black border-4 border-slate-100 hover:border-[#38BDF8]' : ''}`} onClick={() => handleAnswer(opt)} disabled={feedback === 'correct' || clickedOptions.has(opt)}>{opt}</DeskButton>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'RESULTS') {
    const isSad = stats.errors > stats.correct;
    const accuracy = Math.round((stats.correct / (stats.total || 1)) * 100);
    const rawScore = (stats.correct * 10) - (stats.errors * 5);
    const finalScore = Math.max(0, Math.round(rawScore * (accuracy / 100)));
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4 font-sans overflow-y-auto text-board-black">
        <div className="flex flex-col items-center">
          {isSad ? (<Frown className="w-20 h-20 text-error mb-2 animate-bounce" />) : (<Trophy className="w-20 h-20 text-[#38BDF8] mb-2 animate-bounce" />)}
          <h2 className="text-5xl font-black italic">{isSad ? 'Zkus to znovu!' : 'Super výkon!'}</h2>
        </div>
        <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border-4 border-slate-50 flex flex-col gap-4 items-center w-full max-w-md text-board-black">
          <div className="grid grid-cols-2 w-full gap-3">
             <div className="bg-slate-50 p-4 rounded-2xl text-center flex flex-col"><span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Správně</span><span className="text-4xl font-black text-success">{stats.correct}</span></div>
             <div className="bg-slate-50 p-4 rounded-2xl text-center flex flex-col"><span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Úspěšnost</span><span className="text-4xl font-black text-[#38BDF8]">{accuracy}%</span></div>
          </div>
          <div className="flex flex-col items-center gap-1 bg-board-black text-white w-full p-4 rounded-2xl">
             <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Body</span>
             <div className="flex items-center gap-3"><Star className="w-6 h-6 text-[#38BDF8]" fill="currentColor" /><span className="text-5xl font-black">{finalScore}</span></div>
          </div>
          {gameMode === 'competition' && (
            <div className="flex flex-col gap-3 w-full mt-2 pt-4 border-t-2 border-slate-100">
               <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value.slice(0, 12))} placeholder="TVOJE JMÉNO" className="w-full text-center text-3xl font-black uppercase py-4 rounded-2xl border-4 border-slate-100 focus:border-[#38BDF8] outline-none bg-slate-50 text-board-black placeholder:text-slate-200 transition-all" autoFocus />
               <DeskButton size="lg" variant="secondary" onClick={saveToLeaderboard} disabled={!playerName.trim() || isLoading} className="py-4 bg-[#38BDF8] shadow-[#38BDF8]/30">
                  <div className="flex items-center justify-center gap-3 whitespace-nowrap text-white">
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                    <span className="text-xl font-bold uppercase">{isLoading ? 'Ukládám...' : 'Uložit výsledek'}</span>
                  </div>
               </DeskButton>
            </div>
          )}
        </div>
        <DeskButton size="md" variant="outline" className="border-slate-200 shadow-none py-3" onClick={() => setGameState('HOME')}><RotateCcw className="mr-2 w-5 h-5" /> Zkusit znovu</DeskButton>
      </div>
    );
  }
  return null;
}
