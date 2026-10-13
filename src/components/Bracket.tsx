import { useLayoutEffect, useRef } from 'react';

export type Tok = { t: string; c?: 'aux' | 'part' | 'conj'; b?: 1 | 2 }; // b marks the two ends of the bracket

// A sentence with a hand-drawn bracket between the two words marked b=1 and b=2.
export function BracketSentence({ lead, toks, end, labels, colors = ['var(--aux)', 'var(--part)'], small }: { lead?: string; toks: Tok[]; end: string; labels: [string, string]; colors?: [string, string]; small?: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const sentRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const l1 = useRef<SVGTextElement>(null);
  const l2 = useRef<SVGTextElement>(null);

  const draw = () => {
    const inner = innerRef.current, sent = sentRef.current, path = pathRef.current;
    const a = sent?.querySelector('[data-b="1"]'), z = sent?.querySelector('[data-b="2"]');
    if (!inner || !sent || !path || !a || !z || inner.offsetParent === null) return;
    // Shrink long sentences (never below 12 px) so the whole bracket fits on a phone.
    const lines = inner.querySelectorAll<HTMLElement>('.sent');
    lines.forEach((el) => (el.style.fontSize = ''));
    const avail = (inner.parentElement?.clientWidth ?? 0) - 16;
    const need = sent.scrollWidth;
    if (avail > 0 && need > avail) {
      const fs = parseFloat(getComputedStyle(sent).fontSize);
      lines.forEach((el) => (el.style.fontSize = `${Math.max(12, (fs * avail) / need)}px`));
    }
    const ib = inner.getBoundingClientRect(), ar = a.getBoundingClientRect(), zr = z.getBoundingClientRect();
    const x1 = ar.left + ar.width / 2 - ib.left, x2 = zr.left + zr.width / 2 - ib.left;
    const y0 = sent.offsetTop + sent.offsetHeight + 6, r = 22, yb = y0 + r + 8;
    path.setAttribute('d', `M${x1},${y0} Q${x1},${yb} ${x1 + r},${yb} H${x2 - r} Q${x2},${yb} ${x2},${y0}`);
    const len = path.getTotalLength();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    path.style.transition = 'none';
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = calm ? '0' : String(len);
    void path.getBoundingClientRect();
    if (!calm) {
      path.style.transition = 'stroke-dashoffset .6s ease';
      path.style.strokeDashoffset = '0';
    }
    // keep the labels inside the box, even when a word is at the very edge
    const keep = (x: number) => Math.min(Math.max(x, 48), ib.width - 48);
    for (const [el, x] of [[l1.current, keep(x1)], [l2.current, keep(x2)]] as const) {
      el?.setAttribute('x', String(x));
      el?.setAttribute('y', String(yb + 22));
    }
  };
  useLayoutEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  });

  return (
    <div className="stage">
      <div className="inner" ref={innerRef}>
        {lead && <div className={'sent lead-line' + (small ? ' small' : '')}>{lead}</div>}
        <div className={'sent' + (small ? ' small' : '')} ref={sentRef} aria-live="polite">
          {toks.map((x, i) => (
            <span key={i}>
              {i > 0 && ' '}
              <span className={x.c} data-b={x.b}>{x.t + (i === toks.length - 1 ? end : '')}</span>
            </span>
          ))}
        </div>
        <svg className="brk" aria-hidden="true">
          <path ref={pathRef} d="" />
          <text ref={l1} textAnchor="middle" fill={colors[0]}>{labels[0]}</text>
          <text ref={l2} textAnchor="middle" fill={colors[1]}>{labels[1]}</text>
        </svg>
      </div>
    </div>
  );
}

