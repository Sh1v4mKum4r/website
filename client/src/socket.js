import io from 'socket.io-client';
import { API_URL } from './config';

// F11: Enhanced reconnection config
export const socket = io(API_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
});
