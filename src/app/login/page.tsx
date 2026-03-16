'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePlayer, AvatarType } from '@/context/PlayerContext';
import { DeskButton } from '@/components/shared/DeskButton';
import { ChevronLeft, UserCircle2, UserPlus, X, LogIn } from 'lucide-react';
import Image from 'next/image';

interface PlayerRow {
    id: string;
    username: string;
    avatar: string;
    pin: string;
    recovery_question: string;
}

export default function LoginScreen() {
    const router = useRouter();
    const { setPlayer } = usePlayer();

    const [players, setPlayers] = useState<PlayerRow[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Login State
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    // Recovery State
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryAnswer, setRecoveryAnswer] = useState('');
    const [newPin, setNewPin] = useState('');

    const fetchPlayers = async () => {
        if (!supabase) return;
        setIsLoading(true);
        const { data } = await supabase
            .from('players')
            .select('id, username, avatar, pin, recovery_question')
            .order('created_at', { ascending: false });

        if (data) setPlayers(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    const handleSelectPlayer = (p: PlayerRow) => {
        setSelectedPlayer(p);
        setPin('');
        setError('');
        setIsRecovering(false);
    };

    const handleBackToSelection = () => {
        setSelectedPlayer(null);
        setPin('');
        setError('');
        setIsRecovering(false);
    };

    const appendPin = (num: string) => {
        if (pin.length < 4) {
            const updatedPin = pin + num;
            setPin(updatedPin);

            if (updatedPin.length === 4) {
                // Auto submit when 4 digits are entered
                if (updatedPin === selectedPlayer?.pin) {
                    setPlayer({
                        id: selectedPlayer.id,
                        username: selectedPlayer.username,
                        avatar: selectedPlayer.avatar as AvatarType,
                    });
                    router.push('/');
                } else {
                    setError('Špatný PIN! Zkus to znovu.');
                    setPin(''); // Reset on failure
                }
            }
        }
    };

    const deletePin = () => setPin(p => p.slice(0, -1));

    const handleRecoverySubmit = async () => {
        setError('');
        if (!selectedPlayer || !supabase) return;

        // We fetch the real answer to check since we only queried the question earlier
        const { data } = await supabase
            .from('players')
            .select('recovery_answer')
            .eq('id', selectedPlayer.id)
            .single();

        if (data?.recovery_answer === recoveryAnswer.trim().toLowerCase()) {
            if (newPin.length !== 4) {
                setError('Nový PIN musí mít přesně 4 čísla.');
                return;
            }

            // Update PIN
            const { error: updateError } = await supabase
                .from('players')
                .update({ pin: newPin })
                .eq('id', selectedPlayer.id);

            if (!updateError) {
                setPlayer({
                    id: selectedPlayer.id,
                    username: selectedPlayer.username,
                    avatar: selectedPlayer.avatar as AvatarType,
                });
                router.push('/');
            } else {
                setError('Nepodařilo se změnit PIN.');
            }
        } else {
            setError('Špatná odpověď na otázku.');
        }
    };

    if (isLoading) {
        return <div className="h-screen w-screen bg-desk-white flex items-center justify-center font-sans text-2xl font-bold text-slate-400">Načítám profily...</div>;
    }

    return (
        <div className="h-screen w-screen bg-desk-white font-sans text-board-black p-6 flex flex-col items-center justify-center relative overflow-hidden">

            {/* HEADER FOR BACK / EXIT */}
            <div className="absolute top-6 left-6 z-10 w-full flex justify-between pr-12">
                {selectedPlayer ? (
                    <DeskButton size="md" variant="outline" onClick={handleBackToSelection}>
                        <ChevronLeft className="w-6 h-6 mr-2" /> Zpět na výběr
                    </DeskButton>
                ) : (
                    <span /> // Placeholder for layout
                )}
            </div>

            <div className="w-full max-w-5xl items-center flex flex-col relative z-0">
                <div className="flex items-center gap-4 mb-10">
                    <Image src="/icon.png" alt="Orel" width={80} height={80} className="w-16 h-16 sm:w-20 sm:h-20 mix-blend-multiply" />
                    <h1 className="text-5xl sm:text-7xl font-black italic text-class-green">Kdo hraje?</h1>
                </div>

                {!selectedPlayer ? (
                    // --- PROFILE SELECTION ---
                    <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        {players.length === 0 ? (
                            <div className="text-center p-8 bg-white rounded-[2.5rem] shadow-sm mb-8 w-full max-w-md border-4 border-slate-100">
                                <p className="text-2xl font-bold text-slate-400 mb-4">Zatím tu nikdo nehraje.</p>
                                <p className="text-lg text-slate-300">Vytvoř si svůj první profil!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12 w-full max-h-[50vh] overflow-y-auto p-4">
                                {players.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleSelectPlayer(p)}
                                        className="flex flex-col items-center gap-4 p-6 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:scale-105 border-4 border-transparent hover:border-[#38BDF8] transition-all group"
                                    >
                                        <Image src={`/avatars/${p.avatar}.png`} alt={p.username} width={120} height={120} className="w-24 h-24 drop-shadow-sm group-hover:scale-110 transition-transform" />
                                        <span className="text-2xl font-black">{p.username}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <DeskButton size="xl" variant="primary" onClick={() => router.push('/register')} className="shadow-lg shadow-sky-200 w-full max-w-sm">
                            <UserPlus className="mr-4 w-8 h-8" /> Přidat hráče
                        </DeskButton>
                    </div>
                ) : (
                    // --- PIN ENTRY & RECOVERY ---
                    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl flex flex-col items-center animate-in slide-in-from-bottom-8 duration-300 relative border-4 border-slate-50">

                        <button onClick={handleBackToSelection} className="absolute top-6 right-6 p-2 text-slate-300 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-8 h-8" />
                        </button>

                        <Image src={`/avatars/${selectedPlayer.avatar}.png`} alt={selectedPlayer.username} width={120} height={120} className="w-24 h-24 mb-4 drop-shadow-sm" />
                        <h2 className="text-4xl font-black mb-8">{selectedPlayer.username}</h2>

                        {error && <div className="p-4 bg-red-100 text-red-600 rounded-2xl w-full text-center mb-6 font-bold">{error}</div>}

                        {!isRecovering ? (
                            // PIN PAD
                            <div className="w-full flex flex-col items-center">
                                <div className="flex gap-4 mb-8">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div key={i} className={`w-14 h-18 sm:w-16 sm:h-20 rounded-2xl border-4 flex items-center justify-center text-4xl font-black ${pin[i] ? 'border-[#38BDF8] bg-sky-50' : 'border-slate-200'}`}>
                                            {pin[i] ? '•' : ''}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-[280px]">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                        <button
                                            key={num}
                                            onClick={() => appendPin(num.toString())}
                                            className="bg-slate-100 hover:bg-slate-200 active:bg-[#38BDF8] active:text-white text-3xl font-black p-4 rounded-2xl transition-colors"
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <div />
                                    <button
                                        onClick={() => appendPin('0')}
                                        className="bg-slate-100 hover:bg-slate-200 active:bg-[#38BDF8] active:text-white text-3xl font-black p-4 rounded-2xl transition-colors"
                                    >
                                        0
                                    </button>
                                    <button
                                        onClick={deletePin}
                                        className="bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 font-bold p-4 rounded-2xl flex items-center justify-center transition-colors"
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </button>
                                </div>

                                <button
                                    onClick={() => { setIsRecovering(true); setError(''); setPin(''); }}
                                    className="text-slate-400 font-bold text-lg hover:text-[#38BDF8] underline underline-offset-4"
                                >
                                    Zapomněl(a) jsem PIN
                                </button>
                            </div>
                        ) : (
                            // RECOVERY FORM
                            <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
                                <p className="text-xl font-bold text-[#38BDF8] text-center mb-2">Záchranná otázka:</p>
                                <p className="text-xl font-bold text-slate-400 text-center uppercase tracking-widest">{selectedPlayer.recovery_question || 'Zadejte odpověď'}</p>

                                <input
                                    type="text"
                                    className="w-full text-center text-2xl p-4 rounded-2xl border-4 border-slate-200 outline-none focus:border-[#38BDF8] mb-6"
                                    value={recoveryAnswer}
                                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                                    placeholder="TVOJE ODPOVĚĎ"
                                />

                                <p className="text-lg font-bold text-slate-400 mb-2">Nastav si nový PIN:</p>
                                <input
                                    type="password"
                                    maxLength={4}
                                    className="w-32 text-center text-3xl p-4 rounded-2xl border-4 border-slate-200 outline-none focus:border-[#38BDF8] mb-8 font-black tracking-widest"
                                    value={newPin}
                                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="••••"
                                />

                                <DeskButton size="lg" variant="info" onClick={handleRecoverySubmit} className="w-full">
                                    Přihlásit se <LogIn className="ml-2 w-6 h-6" />
                                </DeskButton>

                                <button
                                    onClick={() => { setIsRecovering(false); setError(''); }}
                                    className="mt-6 text-slate-400 font-bold hover:text-slate-600 underline underline-offset-4"
                                >
                                    Zrušit
                                </button>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}
