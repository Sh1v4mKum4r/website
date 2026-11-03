// The "switch worlds" flourish: a particle burst at the click point plus a
// circular-reveal wipe (View Transitions API) of the whole page. Degrades to an
// instant swap where the API or motion isn't available.

const COLORS = {
  space: ['#4cc2ff', '#8fd5ff', '#cfe6ff', '#a78bfa'],
  arcade: ['#ff5ca8', '#ff8a3d', '#18b7b7', '#ffd23f'],
};

export function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function burst(x, y, toWorld) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const cols = COLORS[toWorld] || COLORS.space;
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    const s = 6 + Math.random() * 9;
    Object.assign(p.style, {
      position: 'fixed', left: `${x}px`, top: `${y}px`,
      width: `${s}px`, height: `${s}px`,
      borderRadius: Math.random() > 0.5 ? '50%' : '3px',
      background: cols[i % cols.length],
      zIndex: 9999, pointerEvents: 'none', willChange: 'transform, opacity',
    });
    document.body.appendChild(p);
    const ang = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 190;
    p.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(0)`, opacity: 0 },
      ],
      { duration: 700 + Math.random() * 450, easing: 'cubic-bezier(.2,.6,.2,1)' },
    ).onfinish = () => p.remove();
  }
}

// apply() flips the app state (e.g. setTheme). We run it inside the view
// transition so the old frame is snapshotted and the new world wipes in.
export function runWorldTransition(x, y, toWorld, apply) {
  burst(x, y, toWorld);
  const reduce = prefersReducedMotion();
  if (typeof document === 'undefined' || !document.startViewTransition || reduce) {
    apply();
    return;
  }
  const vt = document.startViewTransition(() => apply());
  vt.ready.then(() => {
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`],
      },
      { duration: 680, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => { /* transition unsupported mid-flight */ });
}
