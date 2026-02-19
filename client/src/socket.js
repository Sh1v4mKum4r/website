import io from 'socket.io-client';

// Use VITE_API_URL if set (e.g. for localhost), otherwise default to production URL
const URL = import.meta.env.VITE_API_URL || 'https://multiplayergames-api.onrender.com';

// F11: Enhanced reconnection config
export const socket = io(URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
});
