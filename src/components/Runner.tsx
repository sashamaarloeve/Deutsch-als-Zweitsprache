import { useEffect, useState, type ReactNode } from 'react';
import type { Item } from '../content/types';
import type { Outcome } from '../logic/progress';
import { Exercise } from './Exercises';
import { useLang } from '../i18n';

interface Props {
  title: string;
  items: Item[];
  onResult: (item: Item, outcome: Outcome) => void;
  onFinish: (percent: number) => void;
  onExit?: () => void; // shows a Stop button and a "Back" button at the end
  onAgain?: () => void; // shows an "Again" button at the end
  embedded?: boolean; // inside a training page: no title row
  before?: (item: Item) => ReactNode; // shown above the exercise (for example the reading text)
}

// Plays a list of exercises one after another, then shows a friendly summary.
export function Runner({ title, items, onResult, onFinish, onExit, onAgain, embedded, before }: Props) {
  const { s } = useLang();
  const [i, setI] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const finished = i >= items.length;
  const percent = Math.round((firstTry / items.length) * 100);

  // Tell the parent once, when the last exercise is done.
  useEffect(() => {
    if (finished) onFinish(percent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (finished) {
    return (
      <div className="center">
        <div className="big-word">{s.wellDone}</div>
        <p className="lead">{s.firstTry(firstTry, items.length)}</p>
        <p>{s.everyTry}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {onAgain && <button className="btn" onClick={onAgain}>{s.again}</button>}
          {onExit && <button className={'btn' + (onAgain ? ' ghost' : '')} onClick={onExit}>{s.backHome}</button>}
        </div>
      </div>
    );
  }
  const item = items[i];
  const body = (
    <>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={i} aria-label={s.progress}>
        <i style={{ width: `${(i / items.length) * 100}%` }} />
      </div>
      {before?.(item)}
      <Exercise
        key={item.id + ':' + i}
        item={item}
        onDone={(o) => {
          onResult(item, o);
          if (o === 'first-try') setFirstTry(firstTry + 1);
          setI(i + 1);
        }}
      />
    </>
  );
  if (embedded) return <div>{body}</div>;
  return (
    <section aria-label={title}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{title}</h2>
        {onExit && <button className="btn ghost" onClick={onExit}>{s.stop}</button>}
      </div>
      <div className="card">{body}</div>
    </section>
  );
}
