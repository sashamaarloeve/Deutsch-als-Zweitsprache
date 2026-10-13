import { useEffect, useMemo, useRef, useState } from 'react';
import type { PartType, PerfektTraining, Verb } from '../content/types';
import { AUXF } from '../content/expand';
import { shuffle } from '../logic/check';
import { AUXRE, isParticiple } from '../logic/german';
import { Colored } from './Colored';
import { useLang } from '../i18n';

export type Cat = 'all' | PartType;
const TYPES: PartType[] = ['reg', 'irr', 'trenn', 'ohne'];

export function CatSelect({ t, value, onChange }: { t: PerfektTraining; value: Cat; onChange: (c: Cat) => void }) {
  const { s } = useLang();
  return (
    <label>
      {s.verbs}:{' '}
      <select value={value} onChange={(e) => onChange(e.target.value as Cat)}>
        <option value="all">{s.allVerbs}</option>
        {TYPES.map((k) => (
          <option key={k} value={k}>{t.partTypes[k].name}</option>
        ))}
      </select>
    </label>
  );
}

const inCat = (t: PerfektTraining, cat: Cat) => t.verbs.filter((v) => cat === 'all' || v.type === cat);

/* ---- Memory: infinitive and Partizip II pairs ---- */
interface Card {
  k: number;
  id: string;
  text: string;
  kind: 'inf' | 'part';
  state: 0 | 1 | 2; // closed, open, found
}
const PAIRS = 6;
function deal(verbs: Verb[]): Card[] {
  const pairs = shuffle(verbs).slice(0, PAIRS);
  return shuffle(pairs.flatMap((v) => [
    { id: v.inf, text: v.inf, kind: 'inf' as const },
    { id: v.inf, text: v.part, kind: 'part' as const },
  ])).map((c, k) => ({ ...c, k, state: 0 as const }));
}

export function Memory({ t, onPoints }: { t: PerfektTraining; onPoints: (n: number) => void }) {
  const { s } = useLang();
  const [cat, setCat] = useState<Cat>('all');
  const [cards, setCards] = useState(() => deal(inCat(t, 'all')));
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const restart = (c: Cat) => {
    window.clearTimeout(timer.current);
    lock.current = false;
    setCat(c);
    setCards(deal(inCat(t, c)));
    setMoves(0);
  };
  const flip = (k: number) => {
    if (lock.current) return;
    const card = cards.find((c) => c.k === k)!;
    if (card.state !== 0) return;
    const next = cards.map((c) => (c.k === k ? { ...c, state: 1 as const } : c));
    setCards(next);
    const open = next.filter((c) => c.state === 1);
    if (open.length < 2) return;
    lock.current = true;
    setMoves(moves + 1);
    const [a, b] = open;
    const match = a.id === b.id && a.kind !== b.kind;
    timer.current = window.setTimeout(() => {
      setCards((cs) => cs.map((c) => (c.k === a.k || c.k === b.k ? { ...c, state: match ? (2 as const) : (0 as const) } : c)));
      if (match) onPoints(2);
      lock.current = false;
    }, match ? 350 : 900);
  };
  const found = cards.filter((c) => c.state === 2).length / 2;

  return (
    <div>
      <div className="exhead"><h3>{s.exMem}</h3><CatSelect t={t} value={cat} onChange={restart} /></div>
      <p className="prompt">{s.memPrompt(moves)}</p>
      <div className="mem">
        {cards.map((c) => (
          <button
            key={c.k}
            className={'mcard' + (c.state === 1 ? ' open' + (c.kind === 'part' ? ' isPart' : '') : '') + (c.state === 2 ? ' done' : '')}
            aria-label={c.state ? c.text : s.hiddenCard}
            onClick={() => flip(c.k)}
          >
            {c.state ? c.text : '?'}
          </button>
        ))}
      </div>
      <div className="fb" aria-live="polite" role="status">
        {found === PAIRS && (
          <span className="ok" style={{ display: 'block' }}>
            {s.memDone(moves)} <button className="btn" onClick={() => restart(cat)}>{s.again}</button>
          </span>
        )}
      </div>
    </div>
  );
}

/* ---- Speed round ---- */
const ROUND = 60;
export function Sprint({ t, onPoints }: { t: PerfektTraining; onPoints: (n: number) => void }) {
  const { s } = useLang();
  const [phase, setPhase] = useState<'intro' | 'run' | 'end'>('intro');
  const [timed, setTimed] = useState(true);
  const [left, setLeft] = useState(ROUND);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [best, setBest] = useState(0);
  const [queue, setQueue] = useState<Verb[]>([]);
  const cur = queue[0];
  const options = useMemo(() => (cur ? shuffle([{ x: cur.part, r: true }, ...cur.fakes.map((x) => ({ x, r: false }))]) : []), [cur]);

  const start = () => {
    setQueue(shuffle(t.verbs));
    setLeft(ROUND); setRight(0); setWrong(0);
    setPhase('run');
  };
  const end = (r: number) => {
    setBest((b) => Math.max(b, r));
    setPhase('end');
  };
  useEffect(() => {
    if (phase !== 'run' || !timed) return;
    const id = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => window.clearInterval(id);
  }, [phase, timed]);
  useEffect(() => {
    if (phase === 'run' && timed && left <= 0) end(right);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const pick = (ok: boolean) => {
    if (ok) { setRight(right + 1); onPoints(1); } else setWrong(wrong + 1);
    setQueue((q) => (q.length > 1 ? q.slice(1) : shuffle(t.verbs)));
  };

  if (phase === 'intro')
    return (
      <div>
        <div className="exhead"><h3>{s.exSprint}</h3></div>
        <p className="prompt">{s.sprintIntro(best)}</p>
        <label className="check"><input type="checkbox" checked={!timed} onChange={(e) => setTimed(!e.target.checked)} /> {s.noTimer}</label>
        <p className="center"><button className="btn big" onClick={start}>{s.start}</button></p>
      </div>
    );
  if (phase === 'end')
    return (
      <div className="center">
        <div className="big-word">{timed ? s.timeUp : s.finished}</div>
        <p className="lead">{s.sprintResult(right, wrong, best)}</p>
        <button className="btn" onClick={start}>{s.again}</button>
      </div>
    );
  return (
    <div>
      <div className="exhead">
        <h3>{s.exSprint}</h3>
        <span>{s.rightLabel} <b>{right}</b> &nbsp; {s.wrongLabel} <b>{wrong}</b>{timed && <> &nbsp; <b>{Math.max(left, 0)}</b> s</>}</span>
      </div>
      {timed && <div className="timer" aria-hidden="true"><i style={{ width: `${(left / ROUND) * 100}%` }} /></div>}
      <div className="big-word">{cur.inf}</div>
      <div className="choices">
        {options.map((o) => (
          <button key={o.x} className="choice" onClick={() => pick(o.r)}>{o.x}</button>
        ))}
      </div>
      {!timed && <button className="btn ghost" onClick={() => end(right)}>{s.finish}</button>}
    </div>
  );
}

/* ---- Writing ---- */
export function Writing({ t, onPoints }: { t: PerfektTraining; onPoints: (n: number) => void }) {
  const { s } = useLang();
  const w = t.writing;
  const [words, setWords] = useState(() => shuffle(t.verbs).slice(0, 12));
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ good: number; items: { ok: boolean; msg: string }[] } | null>(null);
  const counted = useRef(new Set<string>());

  const check = () => {
    const txt = text.trim();
    if (!txt) return setResult({ good: -1, items: [] });
    const sents = txt.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
    let good = 0;
    const items = sents.map((sent) => {
      const toks = sent.replace(/[.,!?;:]/g, ' ').split(/\s+/).filter(Boolean).map((x) => x.toLowerCase());
      const ai = toks.findIndex((x) => AUXRE.test(x));
      let pi = -1;
      toks.forEach((x, i) => { if (i !== ai && isParticiple(x)) pi = i; });
      if (ai < 0 && pi < 0) return { ok: false, msg: sent + ' – ' + s.wNoPerfekt };
      if (ai < 0) return { ok: false, msg: sent + ' – ' + s.wNoAux };
      if (pi < 0) return { ok: false, msg: sent + ' – ' + s.wNoPart };
      const okEnd = pi === toks.length - 1 || (ai === toks.length - 1 && pi === toks.length - 2);
      if (!okEnd) return { ok: false, msg: sent + ' – ' + s.wBadEnd };
      good++;
      if (!counted.current.has(sent.toLowerCase())) { counted.current.add(sent.toLowerCase()); onPoints(1); }
      return { ok: true, msg: sent };
    });
    setResult({ good, items });
  };

  return (
    <div>
      <div className="exhead"><h3>{s.exWri}</h3></div>
      <p className="prompt">{w.prompt}</p>
      <div className="wordbank">
        {words.map((v) => <span key={v.inf} className="wb">{v.inf} → {AUXF[v.aux][0]} {v.part}</span>)}
      </div>
      <button className="btn ghost" onClick={() => setWords(shuffle(t.verbs).slice(0, 12))}>{s.otherWords}</button>
      <p>
        <label htmlFor="wri-text" className="sr-only">{s.yourText}</label>
        <textarea id="wri-text" value={text} placeholder={w.placeholder} onChange={(e) => setText(e.target.value)} />
      </p>
      <p><button className="btn" onClick={check}>{s.check}</button></p>
      {result && result.good < 0 && <div className="fb tip">{s.writeFirst}</div>}
      {result && result.good >= 0 && (
        <div aria-live="polite">
          <div className={'fb ' + (result.good >= w.minSentences ? 'ok' : 'tip')}>
            {result.good >= w.minSentences && s.veryGood}
            {s.sentencesFound(result.good)}
            {result.good < w.minSentences ? s.moreToGoal(w.minSentences - result.good) : '.'}
          </div>
          <ul className="res">
            {result.items.map((i, n) => (
              <li key={n} className={i.ok ? 'g' : 'b'}>{i.ok ? '✓ ' : '• '}{i.ok ? <Colored text={i.msg} /> : i.msg}</li>
            ))}
          </ul>
          <small className="en">{w.note}</small>
        </div>
      )}
    </div>
  );
}
