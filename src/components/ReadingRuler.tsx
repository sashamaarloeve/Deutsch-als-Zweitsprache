import { useEffect, useState } from 'react';

// Reading aid: everything except one line (around the finger or mouse) is dimmed.
// It is only decoration on top of the page: clicks go through, screen readers ignore it.
export function ReadingRuler() {
  const [y, setY] = useState(() => Math.round(window.innerHeight * 0.4));
  useEffect(() => {
    const move = (e: PointerEvent | TouchEvent) => {
      const p = 'touches' in e ? e.touches[0] : e;
      if (p) setY(p.clientY);
    };
    const events = ['pointermove', 'pointerdown', 'touchstart', 'touchmove'] as const;
    events.forEach((ev) => window.addEventListener(ev, move as EventListener, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, move as EventListener));
  }, []);
  const half = 34; // the bright band is about two lines high
  return (
    <div className="ruler" aria-hidden="true">
      <div className="ruler-dim" style={{ top: 0, height: Math.max(0, y - half) }} />
      <div className="ruler-dim" style={{ top: y + half, bottom: 0 }} />
    </div>
  );
}
