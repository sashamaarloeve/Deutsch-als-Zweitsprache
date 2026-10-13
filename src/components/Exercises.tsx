import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BoxesItem, BuildItem, ChoiceItem, ConvertItem, Item, OrderItem, PairsItem, PickItem, SentenceBuildItem, ShortAnswerItem, GapsItem, WritingItem } from '../content/types';
import { boxesSentence, buildSentenceText, checkBoxes, checkBuild, checkChoice, checkConvert, checkOrder, checkShortAnswer, glued, matchSentenceBuild, participleOf, sentenceText, shuffle } from '../logic/check';
import type { Outcome } from '../logic/progress';
import { Colored } from './Colored';
import { Rich } from './Rich';
import { useLang } from '../i18n';

interface Props<T> {
  item: T;
  onDone: (outcome: Outcome) => void;
}
interface Tile {
  k: number;
  x: string;
}
type Feedback = { kind: 'ok' | 'tip' | 'bad'; body: ReactNode } | null;

function FeedbackBox({ fb }: { fb: Feedback }) {
  // aria-live makes screen readers announce the feedback
  return (
    <div className={'fb' + (fb ? ' ' + fb.kind : '')} aria-live="polite" role="status">
      {fb?.body}
    </div>
  );
}

// Moves keyboard focus to the Next button once an exercise is finished.
function NextButton({ onClick }: { onClick: () => void }) {
  const { s } = useLang();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <button ref={ref} className="btn" onClick={onClick}>
      {s.next}
    </button>
  );
}

/* ---- Build the Partizip II from word parts ---- */
function BuildExercise({ item, onDone }: Props<BuildItem>) {
  const { s } = useLang();
  const tiles = useMemo<Tile[]>(() => {
    const extras = shuffle(item.extras).slice(0, 2);
    return shuffle([...item.pieces, ...extras]).map((x, k) => ({ x, k }));
  }, [item]);
  const [picked, setPicked] = useState<Tile[]>([]);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [fb, setFb] = useState<Feedback>(null);
  const [shake, setShake] = useState(false);
  const used = new Set(picked.map((t) => t.k));

  const check = () => {
    if (!picked.length) return;
    if (checkBuild(item, picked.map((t) => t.x))) {
      setDone(true);
      setFb({
        kind: 'ok',
        body: (
          <>
            {s.right} <b className="part">{participleOf(item)}</b> – {item.promptKind === 'form' ? item.example : <Colored text={item.example} />}
          </>
        ),
      });
    } else {
      setTries(tries + 1);
      setShake(true);
      setFb({ kind: 'bad', body: s.buildBad });
    }
  };
  // After the right answer the pieces show their roles (prefix, ge, stem, ending).
  const roleOf = (x: string) => {
    const i = item.pieces.indexOf(x);
    return i >= 0 ? item.roles[i] : null;
  };

  return (
    <div>
      <p className="prompt">{item.promptKind === 'form' ? s.buildFormPrompt : s.buildPrompt()}</p>
      <div className="big-word">{item.verb}</div>
      <div className={'area' + (done ? ' ok' : shake ? ' bad' : '')} onAnimationEnd={() => setShake(false)} role="group" aria-label={s.yourAnswer}>
        {picked.map((t, i) => (
          <button
            key={t.k}
            className={done && roleOf(t.x) ? 'blk ' + roleOf(t.x) : 'tile'}
            disabled={done}
            onClick={() => setPicked(picked.filter((_, j) => j !== i))}
          >
            {t.x}
          </button>
        ))}
      </div>
      <div className="bank" aria-label={s.wordParts}>
        {tiles.filter((t) => !used.has(t.k)).map((t) => (
          <button key={t.k} className="tile" disabled={done} onClick={() => setPicked([...picked, t])}>
            {t.x}
          </button>
        ))}
      </div>
      <div className="row">
        {!done && (
          <>
            <button className="btn" onClick={check}>{s.check}</button>
            <button className="btn ghost" onClick={() => setPicked([])}>{s.clear}</button>
            <button className="btn ghost" onClick={() => setFb({ kind: 'tip', body: item.hint })}>{s.hint}</button>
          </>
        )}
        {done && <NextButton onClick={() => onDone(tries === 0 ? 'first-try' : 'after-retry')} />}
      </div>
      <FeedbackBox fb={fb} />
    </div>
  );
}

/* ---- haben or sein ---- */
function ChoiceExercise({ item, onDone }: Props<ChoiceItem>) {
  const { s } = useLang();
  const [answered, setAnswered] = useState<string | null>(null);
  const [fb, setFb] = useState<Feedback>(null);
  const answer = (a: 'haben' | 'sein') => {
    if (answered) return;
    setAnswered(a);
    const right = checkChoice(item, a);
    setFb({
      kind: right ? 'ok' : 'bad',
      body: (
        <>
          {right ? s.right + ' ' : s.choiceWrong(item.answer) + ' '}
          <Colored text={item.example} />
          <br />
          {item.explanation}
        </>
      ),
    });
  };
  const right = answered ? checkChoice(item, answered) : false;
  return (
    <div>
      <p className="prompt">{s.choicePrompt}</p>
      <div className="big-word">{item.verb}</div>
      <div className="duo">
        {(['haben', 'sein'] as const).map((a) => (
          <button key={a} className={'btn' + (answered && a === item.answer ? ' right' : ' ghost')} disabled={!!answered} onClick={() => answer(a)}>
            {answered && a === item.answer ? '✓ ' : ''}{a}
          </button>
        ))}
      </div>
      <FeedbackBox fb={fb} />
      {answered && <NextButton onClick={() => onDone(right ? 'first-try' : 'wrong')} />}
    </div>
  );
}

/* ---- convert: which sentence is the Perfekt? ---- */
function ConvertExercise({ item, onDone }: Props<ConvertItem>) {
  const { s } = useLang();
  const options = useMemo(() => shuffle([item.right, ...item.wrong]), [item]);
  const [answered, setAnswered] = useState<string | null>(null);
  const [fb, setFb] = useState<Feedback>(null);
  const answer = (o: string) => {
    if (answered) return;
    setAnswered(o);
    const right = checkConvert(item, o);
    setFb({
      kind: right ? 'ok' : 'bad',
      body: (
        <>
          {right ? s.right + ' ' : s.convWrong}
          <Colored text={item.right} />
          <br />
          {item.explanation}
        </>
      ),
    });
  };
  return (
    <div>
      <p className="prompt">{s.convPrompt()}</p>
      <div className="card merke" style={{ margin: '8px 0' }}><b>Präsens:</b> {item.prompt}</div>
      <div className="choices">
        {options.map((o) => {
          const cls = answered ? (o === item.right ? ' right' : o === answered ? ' wrong' : '') : '';
          return (
            <button key={o} className={'choice' + cls} disabled={!!answered} onClick={() => answer(o)}>
              {answered && o === item.right ? '✓ ' : answered && o === answered ? '✗ ' : ''}{o}
            </button>
          );
        })}
      </div>
      <FeedbackBox fb={fb} />
      {answered && <NextButton onClick={() => onDone(checkConvert(item, answered) ? 'first-try' : 'wrong')} />}
    </div>
  );
}

/* ---- sentence puzzle ---- */
function OrderExercise({ item, onDone }: Props<OrderItem>) {
  const { s } = useLang();
  const tiles = useMemo<Tile[]>(() => {
    let t: Tile[];
    do t = shuffle(item.words.map((x, k) => ({ x, k })));
    while (item.words.length > 1 && checkOrder(item, t.map((y) => y.x)));
    return t;
  }, [item]);
  const [picked, setPicked] = useState<Tile[]>([]);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [fb, setFb] = useState<Feedback>(null);
  const [shake, setShake] = useState(false);
  const used = new Set(picked.map((t) => t.k));

  const check = () => {
    if (picked.length < tiles.length) return setFb({ kind: 'tip', body: s.useAll });
    const words = picked.map((t) => t.x);
    if (checkOrder(item, words)) {
      setDone(true);
      setFb({ kind: 'ok', body: <>{s.right} <Colored text={sentenceText(words, item.end)} /><br />{item.explanation}</> });
    } else {
      setTries(tries + 1);
      setShake(true);
      setFb({ kind: 'bad', body: s.orderBad });
    }
  };

  return (
    <div>
      <p className="prompt">{item.instruction ? <Rich text={item.instruction} /> : s.orderPrompt()}</p>
      <div className={'area' + (done ? ' ok' : shake ? ' bad' : '')} onAnimationEnd={() => setShake(false)} role="group" aria-label={s.yourSentence}>
        {picked.map((t, i) => (
          <button key={t.k} className="tile" disabled={done} onClick={() => setPicked(picked.filter((_, j) => j !== i))}>
            {t.x}
          </button>
        ))}
      </div>
      <div className="bank" aria-label={s.words}>
        {tiles.filter((t) => !used.has(t.k)).map((t) => (
          <button key={t.k} className="tile" disabled={done} onClick={() => setPicked([...picked, t])}>
            {t.x}
          </button>
        ))}
      </div>
      <div className="row">
        {!done && (
          <>
            <button className="btn" onClick={check}>{s.check}</button>
            <button className="btn ghost" onClick={() => setPicked([])}>{s.clear}</button>
          </>
        )}
        {done && <NextButton onClick={() => onDone(tries === 0 ? 'first-try' : 'after-retry')} />}
      </div>
      <FeedbackBox fb={fb} />
    </div>
  );
}

/* ---- pick one option (optionally inside a sentence) ---- */
function PickExercise({ item, onDone }: Props<PickItem>) {
  const { s } = useLang();
  const options = useMemo(() => shuffle(item.options), [item]);
  const [answered, setAnswered] = useState<string | null>(null);
  const [fb, setFb] = useState<Feedback>(null);
  // the answer is marked in the colour of the article's gender (der blue, die red, das green, plural orange)
  const tag = item.tone ?? 'v';
  const filled = (a: string) => (item.sentence ? item.sentence.replace('___', `<${tag}>${a}</${tag}>`) : '');
  const answer = (o: string) => {
    if (answered) return;
    setAnswered(o);
    const right = o === item.answer;
    setFb({
      kind: right ? 'ok' : 'bad',
      body: (
        <>
          {right ? s.right : s.choiceWrong(item.answer)}{' '}
          <Rich text={item.sentence ? filled(item.answer) : (item.example ?? '')} />
          {item.explanation && <><br />{item.explanation}</>}
        </>
      ),
    });
  };
  const [before, after] = item.sentence ? item.sentence.split('___') : ['', ''];
  return (
    <div>
      <p className="prompt"><Rich text={item.instruction} /></p>
      {item.sentence ? (
        <div className="big-word sentence">
          <Rich text={before} />
          <span className="gap" aria-label={s.missingWord}>{answered ? <Rich text={`<${tag}>${answered}</${tag}>`} /> : '＿＿＿'}</span>
          <Rich text={after} />
          {item.prompt && <small className="en"> <Rich text={item.prompt} /></small>}
        </div>
      ) : (
        item.prompt && <div className="big-word"><Rich text={item.prompt} /></div>
      )}
      <div className="choices">
        {options.map((o) => {
          const cls = answered ? (o === item.answer ? ' right' : o === answered ? ' wrong' : '') : '';
          return (
            <button key={o} className={'choice' + cls} disabled={!!answered} onClick={() => answer(o)}>
              {answered && o === item.answer ? '✓ ' : answered && o === answered ? '✗ ' : ''}{o}
            </button>
          );
        })}
      </div>
      <FeedbackBox fb={fb} />
      {answered && <NextButton onClick={() => onDone(answered === item.answer ? 'first-try' : 'wrong')} />}
    </div>
  );
}

/* ---- reading: write a short answer found in the text ---- */
function ShortAnswerExercise({ item, onDone }: Props<ShortAnswerItem>) {
  const { s } = useLang();
  const [text, setText] = useState('');
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState<Outcome | null>(null);
  const [fb, setFb] = useState<Feedback>(null);
  const model = item.accept.find((a) => !a.startsWith('~')) ?? item.accept.map((a) => a.slice(1)).join(', ');
  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (done || !text.trim()) return;
    if (checkShortAnswer(item.accept, text)) {
      setDone(tries === 0 ? 'first-try' : 'after-retry');
      setFb({ kind: 'ok', body: <>{s.right} {item.explanation}</> });
    } else if (tries === 0) {
      setTries(1);
      setFb({ kind: 'tip', body: s.shortTip });
    } else {
      setDone('wrong');
      setFb({ kind: 'bad', body: <>{s.shortModel(model)}{item.explanation && <><br />{item.explanation}</>}</> });
    }
  };
  return (
    <form onSubmit={check}>
      <p className="prompt"><Rich text={item.instruction} /></p>
      <div className="big-word">{item.prompt}</div>
      <p>
        <label htmlFor={'sa-' + item.id} className="sr-only">{s.yourAnswer}</label>
        <input id={'sa-' + item.id} className="shortinput" type="text" value={text} disabled={!!done} placeholder={s.yourAnswer} autoComplete="off" onChange={(e) => setText(e.target.value)} />
      </p>
      {!done && <button type="submit" className="btn">{s.check}</button>}
      <FeedbackBox fb={fb} />
      {done && <NextButton onClick={() => onDone(done)} />}
    </form>
  );
}

/* ---- one sentence with several gaps ---- */
function GapsExercise({ item, onDone }: Props<GapsItem>) {
  const { s } = useLang();
  const options = useMemo(() => item.gaps.map((g) => shuffle(g.options)), [item]);
  const [chosen, setChosen] = useState<string[]>(() => item.gaps.map(() => ''));
  const [marks, setMarks] = useState<(boolean | null)[]>(() => item.gaps.map(() => null));
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [fb, setFb] = useState<Feedback>(null);
  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (done || chosen.some((c) => !c)) return;
    const ok = item.gaps.map((g, k) => chosen[k] === g.answer);
    setMarks(ok);
    if (ok.every(Boolean)) {
      setDone(true);
      setFb({ kind: 'ok', body: <>{s.right} {item.explanation}</> });
      return;
    }
    setTries(tries + 1);
    setFb({ kind: 'tip', body: s.gapsTip });
  };
  const parts = item.sentence.split(/(\{\d+\})/);
  return (
    <form onSubmit={check}>
      <p className="prompt"><Rich text={item.instruction} /></p>
      <p className="big-word sentence" lang="de">
        {parts.map((p, i) => {
          const m = p.match(/^\{(\d+)\}$/);
          if (!m) return <Rich key={i} text={p} />;
          const k = Number(m[1]);
          return (
            <span key={i} className="gapsel">
              <label className="sr-only" htmlFor={`${item.id}-g${k}`}>{s.gapLabel(k + 1)}</label>
              <select id={`${item.id}-g${k}`} value={chosen[k]} disabled={done} className={marks[k] === null ? '' : marks[k] ? 'ok' : 'no'} onChange={(e) => { setChosen(chosen.map((c, j) => (j === k ? e.target.value : c))); setMarks(marks.map((x, j) => (j === k ? null : x))); }}>
                <option value="">?</option>
                {options[k].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {marks[k] !== null && <span aria-hidden="true">{marks[k] ? ' ✓' : ' ✗'}</span>}
            </span>
          );
        })}
      </p>
      {!done && <button type="submit" className="btn" disabled={chosen.some((c) => !c)}>{s.check}</button>}
      <FeedbackBox fb={fb} />
      {done && <NextButton onClick={() => onDone(tries === 0 ? 'first-try' : 'after-retry')} />}
    </form>
  );
}

/* ---- match pairs: tap left, then right ---- */
function PairsExercise({ item, onDone }: Props<PairsItem>) {
  const { s } = useLang();
  const right = useMemo(() => shuffle(item.pairs.map((p, k) => ({ k, x: p[1] }))), [item]);
  const left = useMemo(() => shuffle(item.pairs.map((p, k) => ({ k, x: p[0] }))), [item]);
  const [sel, setSel] = useState<number | null>(null); // index into item.pairs (left side)
  const [doneL, setDoneL] = useState<Set<number>>(new Set());
  const [doneR, setDoneR] = useState<Set<number>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [fb, setFb] = useState<Feedback>(null);
  const finished = doneL.size === item.pairs.length;

  const pickRight = (j: number, text: string) => {
    if (sel === null || doneR.has(j)) return;
    if (item.pairs[sel][1] === text) {
      const l = new Set(doneL).add(sel);
      setDoneL(l);
      setDoneR(new Set(doneR).add(j));
      setSel(null);
      setFb(l.size === item.pairs.length ? { kind: 'ok', body: <>{s.pairsDone} {item.explanation}</> } : null);
    } else {
      setMistakes(mistakes + 1);
      setSel(null);
      setFb({ kind: 'bad', body: s.pairsMistake });
    }
  };
  return (
    <div>
      <p className="prompt"><Rich text={item.instruction} /></p>
      <div className="match">
        <div className="col" role="group" aria-label={s.leftWords}>
          {left.map((l) => (
            <button key={l.k} className={'mbtn' + (sel === l.k ? ' sel' : '') + (doneL.has(l.k) ? ' done' : '')} aria-pressed={sel === l.k} disabled={doneL.has(l.k)} onClick={() => setSel(l.k)}>
              {doneL.has(l.k) ? '✓ ' : ''}{l.x}
            </button>
          ))}
        </div>
        <div className="col" role="group" aria-label={s.rightWords}>
          {right.map((r, j) => (
            <button key={j} className={'mbtn' + (doneR.has(j) ? ' done' : '')} disabled={doneR.has(j) || sel === null} onClick={() => pickRight(j, r.x)}>
              {doneR.has(j) ? '✓ ' : ''}{r.x}
            </button>
          ))}
        </div>
      </div>
      <FeedbackBox fb={fb} />
      {finished && <NextButton onClick={() => onDone(mistakes === 0 ? 'first-try' : 'after-retry')} />}
    </div>
  );
}

/* ---- boxes: put words into Position 1 / Verb / Subject / Rest ---- */
function BoxesExercise({ item, onDone }: Props<BoxesItem>) {
  const { s } = useLang();
  const bank = useMemo(() => shuffle(item.chunks.map((x, k) => ({ x, k }))), [item]);
  const [placed, setPlaced] = useState<number[][]>(() => item.boxes.map(() => []));
  const [sel, setSel] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [fb, setFb] = useState<Feedback>(null);
  const used = new Set(placed.flat());
  const text = (k: number) => item.chunks[k];

  const place = (box: number) => {
    if (sel === null || done) return;
    setPlaced(placed.map((list, b) => (b === box ? [...list, sel] : list)));
    setSel(null);
  };
  const take = (box: number, idx: number) => {
    if (done) return;
    setPlaced(placed.map((list, b) => (b === box ? list.filter((_, i) => i !== idx) : list)));
  };
  const check = () => {
    const mine = placed.map((l) => l.map(text));
    if (mine.flat().length < item.chunks.length) return setFb({ kind: 'tip', body: s.useAll });
    if (checkBoxes(item, mine)) {
      setDone(true);
      setFb({ kind: 'ok', body: <>{s.right} <Rich text={boxesSentence(item, mine)} /><br />{item.explanation}</> });
    } else {
      setTries(tries + 1);
      setFb({ kind: 'bad', body: s.boxesBad });
    }
  };
  // the first word of the sentence is shown with a capital letter
  const firstFilled = placed.findIndex((l) => l.length > 0);
  const shown = (k: number, box: number, idx: number) => (box === firstFilled && idx === 0 ? sentenceText([text(k)], '').trim() : text(k));

  return (
    <div>
      <p className="prompt"><Rich text={item.instruction} /></p>
      <p className="how">{s.boxesHint}</p>
      {item.roleLabels && (
        <div className="rolekeys" role="group" aria-label={s.roleLegend}>
          {Object.entries(item.roleLabels).map(([code, label]) => (
            <span key={code} className="rolekey"><span className={'rolebadge r-' + code}>{code}</span> {label}</span>
          ))}
        </div>
      )}
      <div className="boxes" role="group" aria-label={s.boxesField}>
        {item.boxes.map((label, b) => (
          <div key={b} className={'bx' + (b === 1 ? ' verbbox' : '')}>
            <div className="bx-label">{label}</div>
            <div className="bx-slot">
              {placed[b].length === 0 && <span className="eq">{s.boxEmpty}</span>}
              {placed[b].map((k, i) => (
                <button key={k} className={done ? 'blk plain' : 'tile sm'} disabled={done} onClick={() => take(b, i)}>
                  {item.roles?.[k] && <span className={'rolebadge r-' + item.roles[k]} aria-label={s.roleAria + ' ' + item.roles[k]}>{item.roles[k]}</span>}
                  {shown(k, b, i)}
                </button>
              ))}
              {sel !== null && !done && (
                <button className="bx-add" aria-label={s.boxPlace(label)} onClick={() => place(b)}>＋</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="bank" aria-label={s.words}>
        {bank.filter((c) => !used.has(c.k)).map((c) => (
          <button key={c.k} className="tile" aria-pressed={sel === c.k} disabled={done} onClick={() => setSel(sel === c.k ? null : c.k)}>
            {item.roles?.[c.k] && <span className={'rolebadge r-' + item.roles[c.k]} aria-label={s.roleAria + ' ' + item.roles[c.k]}>{item.roles[c.k]}</span>}
            <span className="tt">{c.x}</span>
          </button>
        ))}
      </div>
      <div className="row">
        {!done && (
          <>
            <button className="btn" onClick={check}>{s.check}</button>
            <button className="btn ghost" onClick={() => { setPlaced(item.boxes.map(() => [])); setSel(null); }}>{s.clear}</button>
          </>
        )}
        {done && <NextButton onClick={() => onDone(tries === 0 ? 'first-try' : 'after-retry')} />}
      </div>
      <FeedbackBox fb={fb} />
    </div>
  );
}

/* ---- build a whole sentence from pieces: parts of one word touch, words have a space ---- */
function SentenceBuildExercise({ item, onDone }: Props<SentenceBuildItem>) {
  const { s } = useLang();
  const tiles = useMemo<Tile[]>(() => {
    const solution = item.accept[0].replace(/<\/?\w+>/g, '').split(/[ |]/).filter(Boolean).map((x) => x.replace(/_/g, ' '));
    return shuffle([...solution, ...shuffle(item.extras).slice(0, 2)]).map((x, k) => ({ x, k }));
  }, [item]);
  const [picked, setPicked] = useState<Tile[]>([]);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [fb, setFb] = useState<Feedback>(null);
  const [shake, setShake] = useState(false);
  const used = new Set(picked.map((t) => t.k));
  const match = done ? matchSentenceBuild(item, picked.map((t) => t.x)) : null;

  // consecutive tiles that belong to one word are shown touching
  const groups: Tile[][] = [];
  picked.forEach((t, i) => {
    if (i > 0 && glued(item, picked[i - 1].x, t.x)) groups[groups.length - 1].push(t);
    else groups.push([t]);
  });

  const check = () => {
    if (!picked.length) return;
    const m = matchSentenceBuild(item, picked.map((t) => t.x));
    if (m) {
      setDone(true);
      setFb({ kind: 'ok', body: <>{s.right} <Rich text={buildSentenceText(m, item.end)} />{item.explanation && <><br />{item.explanation}</>}</> });
    } else {
      setTries(tries + 1);
      setShake(true);
      setFb({ kind: 'bad', body: s.buildBad });
    }
  };
  // after the right answer the pieces show their roles
  const roleClass = (wi: number, pi: number) => {
    const w = match?.[wi];
    if (!w) return 'tile';
    if (w.tag === 'v') return 'blk ' + (pi === 0 ? 'stem' : 'end');
    if (w.tag === 's') return 'blk pre';
    return 'blk plain';
  };

  return (
    <div>
      <p className="prompt"><Rich text={item.instruction} /></p>
      <div className={'area' + (done ? ' ok' : shake ? ' bad' : '')} onAnimationEnd={() => setShake(false)} role="group" aria-label={s.yourSentence}>
        {done && match
          ? match.map((w, wi) => (
              <span key={wi} className="tilegroup">
                {w.pieces.map((p, pi) => <span key={pi} className={roleClass(wi, pi)}>{wi === 0 && pi === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p}</span>)}
              </span>
            ))
          : groups.map((g, gi) => (
              <span key={gi} className="tilegroup">
                {g.map((t) => (
                  <button key={t.k} className="tile" onClick={() => setPicked(picked.filter((x) => x.k !== t.k))}>{t.x}</button>
                ))}
              </span>
            ))}
      </div>
      <div className="bank" aria-label={s.wordParts}>
        {tiles.filter((t) => !used.has(t.k)).map((t) => (
          <button key={t.k} className="tile" disabled={done} onClick={() => setPicked([...picked, t])}>{t.x}</button>
        ))}
      </div>
      <div className="row">
        {!done && (
          <>
            <button className="btn" onClick={check}>{s.check}</button>
            <button className="btn ghost" onClick={() => setPicked([])}>{s.clear}</button>
            {item.hint && <button className="btn ghost" onClick={() => setFb({ kind: 'tip', body: item.hint })}>{s.hint}</button>}
          </>
        )}
        {done && <NextButton onClick={() => onDone(tries === 0 ? 'first-try' : 'after-retry')} />}
      </div>
      <FeedbackBox fb={fb} />
    </div>
  );
}

/* ---- free writing: chips light up, checklist and example text afterwards ---- */
function WritingExercise({ item, onDone }: Props<WritingItem>) {
  const { s } = useLang();
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(false);
  const [fb, setFb] = useState<Feedback>(null);
  const [ticks, setTicks] = useState<boolean[]>(() => item.checklist.map(() => false));
  const sentences = text.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean).length;
  const lower = text.toLowerCase();

  const check = () => {
    if (sentences < item.minSentences) return setFb({ kind: 'tip', body: s.writeMin(item.minSentences) });
    setFb(null);
    setChecked(true);
  };
  return (
    <div>
      <p className="prompt"><Rich text={item.instruction} /></p>
      <p className="lead">{item.prompt}</p>
      <div className="wordbank" aria-label={s.wordsToUse}>
        {item.words.map((w) => (
          <span key={w} className={'wb' + (lower.includes(w.toLowerCase()) ? ' used' : '')}>{lower.includes(w.toLowerCase()) ? '✓ ' : ''}{w}</span>
        ))}
      </div>
      <p>
        <label htmlFor={'wr-' + item.id} className="sr-only">{s.yourText}</label>
        <textarea id={'wr-' + item.id} value={text} disabled={checked} onChange={(e) => setText(e.target.value)} />
      </p>
      {!checked && <button className="btn" onClick={check}>{s.checkText}</button>}
      <FeedbackBox fb={fb} />
      {checked && (
        <div aria-live="polite">
          <div className="card merke">
            <h3>{s.checklistTitle}</h3>
            <ul className="checklist">
              {item.checklist.map((c, i) => (
                <li key={i}>
                  <label>
                    <input type="checkbox" checked={ticks[i]} onChange={() => setTicks(ticks.map((t, j) => (j === i ? !t : t)))} /> {c}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          {item.detect && item.detect.length > 0 && (
            <div className="card">
              <h3>{s.detectTitle}</h3>
              <ul className="checklist">
                {item.detect.map((d, i) => {
                  const hit = new RegExp(d.pattern, 'iu').test(text);
                  return <li key={i}><b>{hit ? '✓ ' + s.detectFound : '➜ ' + s.detectMissing}:</b> {hit ? d.label : d.tip}</li>;
                })}
              </ul>
            </div>
          )}
          <div className="card">
            <h3>{s.exampleText}</h3>
            <p><Rich text={item.model} /></p>
          </div>
          <NextButton onClick={() => onDone('first-try')} />
        </div>
      )}
    </div>
  );
}

export function Exercise({ item, onDone }: Props<Item>) {
  switch (item.type) {
    case 'build-from-pieces':
      return <BuildExercise item={item} onDone={onDone} />;
    case 'binary-choice':
      return <ChoiceExercise item={item} onDone={onDone} />;
    case 'multiple-choice':
      return <ConvertExercise item={item} onDone={onDone} />;
    case 'sentence-order':
      return <OrderExercise item={item} onDone={onDone} />;
    case 'pick':
      return <PickExercise item={item} onDone={onDone} />;
    case 'pairs':
      return <PairsExercise item={item} onDone={onDone} />;
    case 'boxes':
      return <BoxesExercise item={item} onDone={onDone} />;
    case 'sentence-build':
      return <SentenceBuildExercise item={item} onDone={onDone} />;
    case 'free-writing':
      return <WritingExercise item={item} onDone={onDone} />;
    case 'short-answer':
      return <ShortAnswerExercise item={item} onDone={onDone} />;
    case 'gaps':
      return <GapsExercise item={item} onDone={onDone} />;
  }
}
