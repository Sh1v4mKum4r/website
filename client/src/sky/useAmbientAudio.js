import { useEffect, useRef, useState } from 'react';

// A soft, procedural space drone built with WebAudio — no asset files.
// Off by default; the toggle click is the user gesture that starts it.
export function useAmbientAudio() {
  const [on, setOn] = useState(false);
  const ref = useRef(null);

  useEffect(() => () => { if (ref.current) { try { ref.current.ctx.close(); } catch { /* noop */ } } }, []);

  const toggle = () => {
    if (!on) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 460; lp.Q.value = 0.6; lp.connect(master);
        const freqs = [55, 82.41, 110, 164.81];
        freqs.forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = i % 2 ? 'sine' : 'triangle';
          o.frequency.value = f;
          o.detune.value = (Math.random() - 0.5) * 9;
          const g = ctx.createGain();
          g.gain.value = 0.16 / (i + 1);
          o.connect(g); g.connect(lp); o.start();
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.05 + i * 0.035;
          const lg = ctx.createGain();
          lg.gain.value = 0.05;
          lfo.connect(lg); lg.connect(g.gain); lfo.start();
        });
        master.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 2);
        ref.current = { ctx, master };
        setOn(true);
      } catch { /* audio unavailable */ }
    } else {
      const r = ref.current;
      if (r) {
        try { r.master.gain.linearRampToValueAtTime(0, r.ctx.currentTime + 0.6); } catch { /* noop */ }
        setTimeout(() => { try { r.ctx.close(); } catch { /* noop */ } }, 700);
        ref.current = null;
      }
      setOn(false);
    }
  };

  return [on, toggle];
}
