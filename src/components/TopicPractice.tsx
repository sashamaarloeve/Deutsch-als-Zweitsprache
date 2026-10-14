import { useMemo, useState, type ReactNode } from 'react';
import type { Item, LessonTraining, PerfektTraining } from '../content/types';
import type { Outcome } from '../logic/progress';
import { shuffle } from '../logic/check';
import { useLang } from '../i18n';
import { Runner } from './Runner';
import { Flashcards, WordMemory } from './WordGames';
import { CatSelect, Memory, Sprint, Writing, type Cat } from './Games';

interface Props {
  t: PerfektTraining;
  onBack: () => void;
  /** Text of the back button; default is the way back to the practice menu. */
  backLabel?: string;
  onResult: (item: Item, outcome: Outcome) => void;
  onFinish: (percent: number) => void;
  onPoints: (n: number) => void;
}

const EXERCISES = ['bau', 'hs', 'conv', 'puz', 'mem', 'sprint', 'wri'] as const;
type ExId = (typeof EXERCISES)[number];

// One round of a list-based exercise: a sample, then "Again" for a new one.
export function Session({ title, pool, count, p, shuffled = true, before }: { title: string; pool: Item[]; count: number; p: Pick<Props, 'onResult' | 'onFinish'>; shuffled?: boolean; before?: (item: Item) => ReactNode }) {
  const [round, setRound] = useState(0);
  const items = useMemo(() => (shuffled ? shuffle(pool) : pool).slice(0, count), [pool, count, round, shuffled]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Runner key={round} embedded title={title} items={items} onResult={p.onResult} onFinish={p.onFinish} onAgain={() => setRound(round + 1)} before={before} />;
}

// All exercises of one topic (the "Practice" side of a training).
export function TopicPractice({ t, onBack, onResult, onFinish, onPoints }: Props) {
  const { s } = useLang();
  const [ex, setEx] = useState<ExId>('bau');
  const [cat, setCat] = useState<Cat>('all');
  const p = { onResult, onFinish };

  const label: Record<ExId, string> = { bau: s.exBau, hs: s.exHs, conv: s.exConv, puz: s.exPuz, mem: s.exMem, sprint: s.exSprint, wri: s.exWri };
  const byType = (type: Item['type']) => t.items.filter((i) => i.type === type);
  const buildPool = useMemo(
    () => byType('build-from-pieces').filter((i) => i.type === 'build-from-pieces' && (cat === 'all' || i.verbType === cat)),
    [t, cat], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const pools = useMemo(() => ({ hs: byType('binary-choice'), conv: byType('multiple-choice'), puz: byType('sentence-order') }), [t]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <button className="btn ghost" onClick={onBack}>{s.backToPractice}</button>
      <h2 className="tt">{t.title}</h2>
      <div className="subtabs" role="group" aria-label={s.exercises}>
        {EXERCISES.map((id) => (
          <button key={id} className={'btn' + (ex === id ? ' on' : ' ghost')} aria-pressed={ex === id} onClick={() => setEx(id)}>
            {label[id]}
          </button>
        ))}
      </div>
      <div className="card">
        {ex === 'bau' && (
          <>
            <div className="exhead"><h3>{s.exBau}</h3><CatSelect t={t} value={cat} onChange={setCat} /></div>
            <Session key={cat} title={s.exBau} pool={buildPool} count={10} p={p} />
          </>
        )}
        {ex === 'hs' && <><div className="exhead"><h3>{s.exHs}</h3></div><Session title={s.exHs} pool={pools.hs} count={12} p={p} /></>}
        {ex === 'conv' && <><div className="exhead"><h3>{s.exConv}</h3></div><Session title={s.exConv} pool={pools.conv} count={10} p={p} /></>}
        {ex === 'puz' && <><div className="exhead"><h3>{s.exPuz}</h3></div><Session title={s.exPuz} pool={pools.puz} count={8} p={p} /></>}
        {ex === 'mem' && <Memory t={t} onPoints={onPoints} />}
        {ex === 'sprint' && <Sprint t={t} onPoints={onPoints} />}
        {ex === 'wri' && <Writing t={t} onPoints={onPoints} />}
      </div>
    </div>
  );
}

// The reading text above an exercise. It can be hidden, and stays open by default.
function ReadingText({ t, id }: { t: LessonTraining; id?: string }) {
  const { s } = useLang();
  const text = t.texts?.find((x) => x.id === id);
  if (!text) return null;
  return (
    <details className="readtext" open>
      <summary>{s.readText}: {text.heading}</summary>
      {text.paragraphs.map((p, i) => <p key={i} lang="de">{p}</p>)}
    </details>
  );
}

// Practice for lesson trainings: one tab per practice set written in the content file.
export function LessonPractice({ t, onBack, backLabel, onResult, onFinish }: Omit<Props, 't' | 'onPoints'> & { t: LessonTraining }) {
  const { s } = useLang();
  const [setId, setSetId] = useState(t.sets[0]?.id);
  const set = t.sets.find((x) => x.id === setId) ?? t.sets[0];
  const byId = useMemo(() => new Map(t.items.map((i) => [i.id, i])), [t]);
  const pool = useMemo(() => (set ? set.itemIds.map((id) => byId.get(id)).filter((i): i is Item => !!i) : []), [set, byId]);
  if (!set) return null;
  return (
    <div>
      <button className="btn ghost" onClick={onBack}>{backLabel ?? s.backToPractice}</button>
      <h2 className="tt">{t.title}</h2>
      <p className="tasklabel" id="tasklabel">{s.chooseTask}</p>
      <div className="subtabs tasks" role="group" aria-labelledby="tasklabel">
        {t.sets.map((x, n) => (
          <button key={x.id} className={'btn' + (set.id === x.id ? ' on' : ' ghost')} aria-pressed={set.id === x.id} onClick={() => setSetId(x.id)}>
            {n + 1}. {x.title}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="exhead"><h3>{set.title}</h3></div>
        {set.kind === 'cards' && <Flashcards key={set.id} t={t} />}
        {set.kind === 'memory' && <WordMemory key={set.id} t={t} />}
        {!set.kind && <Session key={set.id} title={set.title} pool={pool} count={set.count ?? pool.length} shuffled={set.shuffle} p={{ onResult, onFinish }} before={(item) => <ReadingText t={t} id={item.textId} />} />}
      </div>
    </div>
  );
}
