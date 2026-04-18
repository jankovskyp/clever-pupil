'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AvatarType =
    | 'avatar_lion'
    | 'avatar_elephant'
    | 'avatar_bear'
    | 'avatar_fox'
    | 'avatar_owl'
    | 'avatar_bunny'
    | 'avatar_monkey'
    | 'avatar_panda'
    | 'avatar_cat'
    | 'avatar_dog';

export interface Player {
    id: string;
    username: string;
    avatar: AvatarType;
}

interface PlayerContextType {
    player: Player | null;
    setPlayer: (player: Player | null) => void;
    isLoading: boolean;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [player, setPlayerState] = useState<Player | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedPlayer = localStorage.getItem('currentPlayer');
            if (storedPlayer) {
                setPlayerState(JSON.parse(storedPlayer));
            }
        } catch (e) {
            console.error('Failed to load player from localStorage', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const setPlayer = (newPlayer: Player | null) => {
        setPlayerState(newPlayer);
        if (newPlayer) {
            localStorage.setItem('currentPlayer', JSON.stringify(newPlayer));
        } else {
            localStorage.removeItem('currentPlayer');
        }
    };

    return (
        <PlayerContext.Provider value={{ player, setPlayer, isLoading }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
}
