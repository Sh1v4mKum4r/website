import io from 'socket.io-client';

const URL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : 'http://localhost:3001';

// This file exports a single, shared socket instance for the entire application.
export const socket = io(URL);
