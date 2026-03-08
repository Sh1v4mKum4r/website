// F7: Sound Effects — Web Audio API synth sounds
// No external audio files needed

let audioContext = null;
let isMuted = false;

const getContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
};

const playTone = (frequency, duration, type = 'sine', volume = 0.3) => {
    if (isMuted) return;
    try {
        const ctx = getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch {
        // Silently fail if audio context not available
    }
};

export const playMove = () => {
    playTone(600, 0.1, 'sine', 0.2);
};

export const playWin = () => {
    const ctx = getContext();
    if (isMuted || !ctx) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.2, 'sine', 0.25), i * 100);
    });
};

export const playLose = () => {
    const ctx = getContext();
    if (isMuted || !ctx) return;
    [400, 350, 300, 200].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.25, 'sawtooth', 0.15), i * 120);
    });
};

export const playJoin = () => {
    playTone(800, 0.15, 'sine', 0.15);
    setTimeout(() => playTone(1000, 0.15, 'sine', 0.15), 80);
};

export const playNotification = () => {
    playTone(880, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(1100, 0.15, 'sine', 0.2), 100);
};

export const playTimeout = () => {
    playTone(300, 0.3, 'square', 0.2);
    setTimeout(() => playTone(200, 0.4, 'square', 0.2), 200);
};

export const playTick = () => {
    playTone(1000, 0.05, 'sine', 0.1);
};

export const toggleMute = () => {
    isMuted = !isMuted;
    return isMuted;
};

export const getMuted = () => isMuted;
