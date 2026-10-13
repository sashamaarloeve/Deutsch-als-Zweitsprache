import { useMemo, useState } from 'react';
import type { LessonTraining, VocabWord } from '../content/types';
import { wordText } from '../content/expand';
import { shuffle } from '../logic/check';
import { useLang } from '../i18n';
import { Rich } from './Rich';

// The German word with its article in the gender colour.
function Face({ w }: { w: VocabWord }) {
  return (
    <span lang="de">
      {w.art && <span className={'t-' + (w.art === 'pl' ? 'pl' : w.art)}>{w.art === 'pl' ? 'die' : w.art} </span>}
      {w.word}
    </span>
  );
}

// Flashcards: turn the card, then say if you knew it. Cards you did not know come back at the end.
export function Flashcards({ t }: { t: LessonTraining }) {
  const { s } = useLang();
  const words = t.words ?? [];
  const [germanFirst, setGermanFirst] = useState(true);
  const [queue, setQueue] = useState(() => shuffle(words));
  const [flipped, setFlipped] = useState(false);
  const restart = () => { setQueue(shuffle(words)); setFlipped(false); };
  const w = queue[0];
  if (!w) {
    return (
      <div className="center">
        <div className="big-word">{s.cardsDone}</div>
        <button className="btn" onClick={restart}>{s.again}</button>
      </div>
    );
  }
  const front = germanFirst ? <div className="big"><Face w={w} /></div> : <div className="big">{w.meaning}</div>;
  const back = germanFirst
    ? <div className="big">{w.meaning}</div>
    : <div className="big"><Face w={w} /></div>;
  const next = (knew: boolean) => {
    setQueue(knew ? queue.slice(1) : [...queue.slice(1), w]);
    setFlipped(false);
  };
  return (
    <div>
      <div className="chips" role="group">
        <button className={'chip' + (germanFirst ? ' on' : '')} aria-pressed={germanFirst} onClick={() => { setGermanFirst(true); setFlipped(false); }}>{s.cardsGermanFirst}</button>
        <button className={'chip' + (!germanFirst ? ' on' : '')} aria-pressed={!germanFirst} onClick={() => { setGermanFirst(false); setFlipped(false); }}>{s.cardsMeaningFirst}</button>
      </div>
      <p className="how" aria-live="polite">{s.cardsLeft(queue.length, words.length)}</p>
      <button className="fcard" onClick={() => setFlipped(!flipped)} aria-live="polite">
        <span>
          {flipped ? back : front}
          {flipped && w.pl && <div className="tag" lang="de">{s.pluralShort}: {w.art === 'pl' ? '' : 'die '}{w.pl}</div>}
          {flipped && <div className="ex" lang="de"><Rich text={w.ex} /></div>}
          {!flipped && <div className="tag">{s.cardsFlipHint}</div>}
        </span>
      </button>
      {flipped && (
        <div className="fcbar">
          <button className="btn" onClick={() => next(true)}>{s.cardKnew}</button>
          <button className="btn ghost" onClick={() => next(false)}>{s.cardAgain}</button>
        </div>
      )}
    </div>
  );
}

interface MemCard { key: number; id: string; kind: 'de' | 'meaning'; text: string }

// Memory: find the German word and its meaning. Wrong cards stay open until the next tap (no timer).
export function WordMemory({ t }: { t: LessonTraining }) {
  const { s } = useLang();
  const [round, setRound] = useState(0);
  const cards = useMemo<MemCard[]>(() => {
    const six = shuffle(t.words ?? []).slice(0, 6);
    const all = six.flatMap((w) => [
      { id: w.id, kind: 'de' as const, text: wordText(w) },
      { id: w.id, kind: 'meaning' as const, text: w.meaning },
    ]);
    return shuffle(all).map((c, key) => ({ ...c, key }));
  }, [t, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const finished = matched.length === cards.length / 2;
  const restart = () => { setRound(round + 1); setOpen([]); setMatched([]); setMoves(0); };
  const tap = (k: number) => {
    let cur = open;
    if (cur.length === 2) cur = []; // turn the wrong pair back
    if (cur.includes(k)) return;
    const next = [...cur, k];
    setOpen(next);
    if (next.length === 2) {
      setMoves(moves + 1);
      const [a, b] = next.map((i) => cards[i]);
      if (a.id === b.id && a.kind !== b.kind) setMatched([...matched, a.id]);
    }
  };
  const wrongPair = open.length === 2 && cards[open[0]].id !== cards[open[1]].id;
  return (
    <div>
      <p className="how">{s.memoryHint}</p>
      <p className="how" aria-live="polite">{finished ? s.memoryDone(moves) : s.memoryMoves(moves)}{wrongPair ? ' · ' + s.memoryContinue : ''}</p>
      <div className="memgrid">
        {cards.map((c, i) => {
          const isDone = matched.includes(c.id);
          const isUp = open.includes(i) || isDone;
          return (
            <button
              key={c.key}
              className={'memcard' + (isDone ? ' done' : isUp ? ' up' : '')}
              disabled={isDone}
              lang={c.kind === 'de' ? 'de' : undefined}
              aria-label={isUp ? undefined : s.memoryClosed(i + 1)}
              onClick={() => tap(i)}
            >
              {isUp ? c.text : '?'}
            </button>
          );
        })}
      </div>
      {finished && <p><button className="btn" onClick={restart}>{s.again}</button></p>}
    </div>
  );
}
