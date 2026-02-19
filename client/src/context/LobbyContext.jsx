import React, { createContext, useContext, useState, useCallback } from 'react';

const LobbyContext = createContext();

export function LobbyProvider({ children, onOpenSidebar }) {
    const [lobbyCode, setLobbyCode] = useState(null);
    const [playerName, setPlayerName] = useState('');

    const isInLobby = !!lobbyCode;

    const openSidebar = useCallback(() => {
        if (onOpenSidebar) onOpenSidebar();
    }, [onOpenSidebar]);

    return (
        <LobbyContext.Provider value={{ lobbyCode, setLobbyCode, playerName, setPlayerName, isInLobby, openSidebar }}>
            {children}
        </LobbyContext.Provider>
    );
}

export function useLobby() {
    const ctx = useContext(LobbyContext);
    if (!ctx) throw new Error('useLobby must be used within LobbyProvider');
    return ctx;
}
