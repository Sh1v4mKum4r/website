import io from 'socket.io-client';

// Use VITE_API_URL if set (e.g. for localhost), otherwise default to production URL
const URL = import.meta.env.VITE_API_URL || 'https://multiplayergames-api.onrender.com';

// This file exports a single, shared socket instance for the entire application.
export const socket = io(URL);
