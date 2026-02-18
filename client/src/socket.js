import io from 'socket.io-client';

// This file exports a single, shared socket instance for the entire application.
export const socket = io('http://localhost:3001');
