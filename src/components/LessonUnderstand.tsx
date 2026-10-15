import { useState } from 'react';
import type { Block, ConjVerb, LessonTraining, VocabWord } from '../content/types';
import { gi, partsArrangement, PERSONS, stemFor, SUBJECT_WORD, TONES } from '../content/expand';
import { cap } from '../logic/german';
import { useLang } from '../i18n';
import { BracketSentence, type Tok } from './Bracket';
import { Rich } from './Rich';

function Chips({ label, items, current, onPick }: { label: string; items: string[]; current: number; onPick: (i: number) => void }) {
  return (
    <div className="controls" role="group" aria-label={label}>
      <span className="lab" aria-hidden="true">{label}</span>
      {items.map((x, i) => (
        <button key={x + i} className="chipbtn" aria-pressed={current === i} onClick={() => onPick(i)}>
          {x}
        </button>
      ))}
    </div>
  );
}

/* ---- conjugation lab: all six forms of a verb, stem and ending in colour ---- */
function ConjugationLab({ t, block }: { t: LessonTraining; block: Extract<Block, { type: 'conjugation' }> }) {
  const { s } = useLang();
  const [i, setI] = useState(0);
  const verbs = block.verbs.map((inf) => t.verbs.find((v) => v.inf === inf)).filter((v): v is ConjVerb => !!v);
  const verb = verbs[i] ?? verbs[0];
  if (!verb) return null;
  const regular = !!verb.stem && !!verb.endings;
  return (
    <div className="card">
      <h2>{block.title}</h2>
      {block.intro && <p><Rich text={block.intro} /></p>}
      <Chips label={s.tapVerb} items={verbs.map((v) => v.inf)} current={i} onPick={setI} />
      <div className="tblwrap" tabIndex={0} role="region" aria-label={block.title}>
        <table className="conjtable">
          <caption className="sr-only">{s.conjCaption(verb.inf)}</caption>
          <thead>
            <tr><th scope="col">{s.person}</th><th scope="col">{s.form}</th></tr>
          </thead>
          <tbody>
            {PERSONS.map((p, k) => (
              <tr key={p}>
                <th scope="row">{p}</th>
                <td>
                  {regular ? (
                    <>
                      <span className={'blk ' + (verb.alt && verb.altAt?.includes(k) ? 'alt' : 'stem')}>{stemFor(verb, k)}</span>
                      <span className="blk end">{verb.endings![k]}</span>
                      {verb.prefix && <span className="blk pre">{verb.prefix}</span>}
                    </>
                  ) : (
                    <span className="blk irr">{verb.forms[k]}</span>
                  )}
                  <span className="sr-only"> {verb.forms[k]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="legend">
        {regular ? (
          <>
            <span className="blk stem">{s.legendStem}</span>
            <span className="blk end">{s.legendEnding}</span>
            {verb.alt && <span className="blk alt">{s.legendChanged}</span>}
            {verb.prefix && <span className="blk pre">{s.legendPrefix}</span>}
          </>
        ) : (
          <span className="blk irr">{s.legendIrregular}</span>
        )}
      </div>
      {block.irregularNote && <p className="rule"><Rich text={block.irregularNote} /></p>}
    </div>
  );
}

/* ---- sentence lab: the verb stays in position 2 ---- */

function SentenceLab({ t, block }: { t: LessonTraining; block: Extract<Block, { type: 'sentence-lab' }> }) {
  const { s } = useLang();
  const [p, setP] = useState(0);
  const [v, setV] = useState(0);
  const [m, setM] = useState(0);
  const [st, setSt] = useState(0);
  const mode = block.modes[m];
  const lab = block.verbs[v];
  const bank = t.verbs.find((x) => x.inf === lab.inf);
  const value = (tok: string) =>
    ({ S: SUBJECT_WORD[p], V: bank?.forms[p] ?? lab.inf, O: lab.comp, T: block.starts[st] ?? '', Q: lab.wq }[tok] ?? '');
  const boxes = mode.boxes.map((parts) => parts.map(value));
  const firstFilled = boxes.findIndex((b) => b.length > 0);
  // the sentence with the verb marked
  const words = boxes.flatMap((b, bi) => b.map((w, wi) => ({ w: bi === firstFilled && wi === 0 ? cap(w) : w, verb: mode.boxes[bi][wi] === 'V' })));
  const sentence = words.map((x) => (x.verb ? `<v>${x.w}</v>` : x.w)).join(' ') + mode.end;
  const usesTime = mode.boxes.flat().includes('T');

  return (
    <div className="card">
      <h2>{block.title}</h2>
      <p><Rich text={block.intro} /></p>
      <Chips label={s.who} items={[...PERSONS]} current={p} onPick={setP} />
      <Chips label={s.what} items={block.verbs.map((x) => x.inf)} current={v} onPick={setV} />
      <Chips label={s.sentenceType} items={block.modes.map((x) => x.label)} current={m} onPick={setM} />
      {usesTime && <Chips label={s.startWith} items={block.starts} current={st} onPick={setSt} />}
      <p className="big-word sentence" aria-live="polite"><Rich text={sentence} /></p>
      <div className="boxes" role="group" aria-label={s.sentenceLabAria}>
        {block.boxLabels.map((label, b) => (
          <div key={b} className={'bx' + (b === 1 ? ' verbbox' : '')}>
            <div className="bx-label">{label}</div>
            <div className="bx-slot">
              {boxes[b].length === 0 && <span className="eq">{s.boxEmpty}</span>}
              {boxes[b].map((w, i) => (
                <span key={i} className={mode.boxes[b][i] === 'V' ? 'blk auxb' : 'blk plain'}>{b === firstFilled && i === 0 ? cap(w) : w}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rule"><Rich text={mode.rule} /></div>
    </div>
  );
}

/* ---- bracket lab: verb + second part (infinitive or prefix) stand far apart ---- */
function BracketLab({ t, block }: { t: LessonTraining; block: Extract<Block, { type: 'bracket-lab' }> }) {
  const { s } = useLang();
  const [p, setP] = useState(0);
  const [lead, setLead] = useState(0);
  const [act, setAct] = useState(0);
  const [m, setM] = useState(0);
  const [st, setSt] = useState(0);
  const separable = block.actions.every((a) => a.lead);
  const action = block.actions[act] ?? block.actions[0];
  const verb = t.verbs.find((v) => v.inf === (separable ? action.lead : block.leads[lead]));
  const mode = block.modes[m];
  if (!verb) return null;
  const value = (tok: string) =>
    ({ S: SUBJECT_WORD[p], V: verb.forms[p], O: action.comp, T: block.starts[st] ?? '', Z: separable ? verb.prefix ?? '' : action.inf ?? '' }[tok] ?? '');
  const boxes = mode.boxes.map((parts) => parts.map(value));
  const firstFilled = boxes.findIndex((b) => b.length > 0);
  const toks: Tok[] = mode.boxes.flatMap((parts, bi) =>
    parts.map((tok, wi) => ({
      t: bi === firstFilled && wi === 0 ? cap(value(tok)) : value(tok),
      c: tok === 'V' ? ('aux' as const) : tok === 'Z' ? ('part' as const) : undefined,
      b: tok === 'V' ? (1 as const) : tok === 'Z' ? (2 as const) : undefined,
    })),
  );
  const usesTime = mode.boxes.flat().includes('T');
  return (
    <div className="card">
      <h2>{block.title}</h2>
      <p><Rich text={block.intro} /></p>
      <Chips label={s.who} items={[...PERSONS]} current={p} onPick={setP} />
      {separable ? (
        <Chips label={block.actionLabel ?? s.what} items={block.actions.map((a) => a.lead!)} current={act} onPick={setAct} />
      ) : (
        <>
          <Chips label={block.leadLabel ?? s.what} items={block.leads} current={lead} onPick={setLead} />
          <Chips label={block.actionLabel ?? s.what} items={block.actions.map((a) => a.inf!)} current={act} onPick={setAct} />
        </>
      )}
      <Chips label={s.sentenceType} items={block.modes.map((x) => x.label)} current={m} onPick={setM} />
      {usesTime && <Chips label={s.startWith} items={block.starts} current={st} onPick={setSt} />}
      <BracketSentence toks={toks} end={mode.end} labels={block.partLabels} />
      <div className="boxes" role="group" aria-label={s.sentenceLabAria}>
        {block.boxLabels.map((label, b) => (
          <div key={b} className={'bx' + (b === 1 ? ' verbbox' : '')}>
            <div className="bx-label">{label}</div>
            <div className="bx-slot">
              {boxes[b].length === 0 && <span className="eq">{s.boxEmpty}</span>}
              {boxes[b].map((w, i) => (
                <span key={i} className={mode.boxes[b][i] === 'V' ? 'blk auxb' : mode.boxes[b][i] === 'Z' ? 'blk partb' : 'blk plain'}>
                  {b === firstFilled && i === 0 ? cap(w) : w}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rule"><Rich text={mode.rule} /></div>
    </div>
  );
}

/* ---- article table: all forms by case and gender, changed forms highlighted ---- */
function ArticleTable({ t, block }: { t: LessonTraining; block: Extract<Block, { type: 'article-table' }> }) {
  const { s } = useLang();
  const arts = t.articles!;
  const genders = [s.genM, s.genF, s.genN, s.genPl];
  return (
    <div className="card">
      <h2>{block.title}</h2>
      {block.intro && <p><Rich text={block.intro} /></p>}
      <div className="tblwrap" tabIndex={0} role="region" aria-label={block.title}>
        <table className="arttable">
          <caption className="sr-only">{s.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">{s.kindLabel}</span></th>
              {TONES.map((tone, i) => (
                <th key={tone + i} scope="col">
                  <span className={'t-' + tone}>{arts[block.kinds[0]]?.nom[i] || genders[i]}</span>
                  <small>{genders[i]}</small>
                  <small>{s.nominativ}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.kinds.flatMap((kind) =>
              block.cases.filter((c) => c.id !== 'nom').map((c) => (
                <tr key={kind + c.id}>
                  <th scope="row">{block.kinds.length > 1 && <>{arts[kind].label} · </>}<b>{c.label}</b></th>
                  {TONES.map((tone, i) => {
                    const v = arts[kind][c.id]![i];
                    const changed = c.id !== 'nom' && v !== '' && v !== arts[kind].nom[i];
                    return (
                      <td key={tone + i}>
                        <span className={'t-' + tone + (changed ? ' chg' : '')}>{v || '–'}</span>
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <div className="legend"><span className="chg">{s.changedLegend}</span></div>
      {block.note && (
        <div className="rule">
          {block.note.split('\n').map((line, i) => <p key={i}><Rich text={line} /></p>)}
        </div>
      )}
    </div>
  );
}

// Tap a part of a sentence: see the question that finds it, the answer and the role.
function Detective({ block }: { block: Extract<Block, { type: 'detective' }> }) {
  const { s } = useLang();
  const [si, setSi] = useState(0);
  const [pi, setPi] = useState<number | null>(null);
  const sent = block.sentences[si];
  const part = pi === null ? null : sent.parts[pi];
  return (
    <div className="card">
      <h2>{block.title}</h2>
      {block.intro && <p><Rich text={block.intro} /></p>}
      {block.sentences.length > 1 && (
        <div className="chips" role="group" aria-label={block.title}>
          {block.sentences.map((x, i) => (
            <button key={i} className={'chip' + (i === si ? ' on' : '')} aria-pressed={i === si} onClick={() => { setSi(i); setPi(null); }}>
              {x.parts.map((p) => p.t).join(' ')}
            </button>
          ))}
        </div>
      )}
      <p className="how">{s.detectiveHint}</p>
      <div className="parts" role="group" lang="de">
        {sent.parts.map((p, i) => (
          <button key={i} className={'sentpart r-' + p.r + (pi === i ? ' sel' : '')} aria-pressed={pi === i} onClick={() => setPi(i)}>
            <span className="sentparttext">{p.t}</span>
          </button>
        ))}
      </div>
      <div className="detout" aria-live="polite">
        {part && (
          <>
            <p><b>{s.detectiveQuestion}:</b> <span lang="de">{part.q}</span></p>
            <p><b>{s.detectiveAnswer}:</b> <span lang="de">{part.t}</span></p>
            <p><b>{s.detectiveRole}:</b> {block.roles[part.r]}</p>
          </>
        )}
      </div>
    </div>
  );
}

// The words of a vocabulary topic: article in its colour, plural, meaning and an example sentence.
function WordList({ t, block }: { t: LessonTraining; block: Extract<Block, { type: 'word-list' }> }) {
  const { s } = useLang();
  const words = block.words.map((id) => t.words?.find((w) => w.id === id)).filter((w): w is VocabWord => !!w);
  return (
    <div className="card">
      <h2>{block.title}</h2>
      {block.intro && <p><Rich text={block.intro} /></p>}
      <ul className="wordlist">
        {words.map((w) => (
          <li key={w.id}>
            <div className="wl-head">
              <span className="wl-word" lang="de">
                {w.art && <span className={'t-' + (w.art === 'pl' ? 'pl' : w.art)}>{w.art === 'pl' ? 'die' : w.art} </span>}
                {w.word}
              </span>
              {w.pl && <span className="wl-pl" lang="de">{s.pluralShort}: {w.art === 'pl' ? '' : 'die '}{w.pl}</span>}
            </div>
            <div className="wl-meaning">{w.meaning}</div>
            <div className="wl-ex" lang="de"><Rich text={w.ex} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlainTable({ block }: { block: Extract<Block, { type: 'table' }> }) {
  return (
    <div className="card">
      <h2>{block.title}</h2>
      {block.intro && <p><Rich text={block.intro} /></p>}
      <div className="tblwrap" tabIndex={0} role="region" aria-label={block.title}>
        <table className="arttable plain">
          <thead>
            <tr>{block.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- case lab: choose a noun, a case and an article type and see the sentence ---- */
function CaseLab({ t, block }: { t: LessonTraining; block: Extract<Block, { type: 'case-lab' }> }) {
  const { s } = useLang();
  const arts = t.articles!;
  const [k, setK] = useState(0);
  const [c, setC] = useState(block.cases.length > 1 ? 1 : 0);
  const [n, setN] = useState(0);
  const kind = block.kinds[k];
  const cs = block.cases[c];
  const noun = block.nouns[n];
  const g = gi(noun.g);
  const art = arts[kind][cs.id]![g];
  const nomArt = arts[kind].nom[g];
  const changed = cs.id !== 'nom' && art !== '' && art !== nomArt;
  const nounText = cs.id === 'dat' && noun.g === 'pl' && noun.dat ? noun.dat : cs.id === 'gen' && noun.gen ? noun.gen : noun.noun;
  const frame = Array.isArray(cs.frame) ? (noun.g === 'pl' ? cs.frame[1] : cs.frame[0]) : cs.frame;
  const [before, after] = frame.split('___');
  const atStart = before.trim() === '';
  return (
    <div className="card">
      <h2>{block.title}</h2>
      <p><Rich text={block.intro} /></p>
      <Chips label={s.kindLabel} items={block.kinds.map((x) => arts[x].label)} current={k} onPick={setK} />
      <Chips label={s.caseLabel} items={block.cases.map((x) => x.label)} current={c} onPick={setC} />
      <Chips label={s.nounLabel} items={block.nouns.map((x) => `${arts.definite.nom[gi(x.g)]} ${x.noun}`)} current={n} onPick={setN} />
      <p className="big-word sentence" aria-live="polite">
        {before}
        {art && <span className={'t-' + TONES[g] + (changed ? ' chg' : '')}>{atStart ? art.charAt(0).toUpperCase() + art.slice(1) : art}</span>}
        {art ? ' ' : ''}
        {!art && atStart ? nounText.charAt(0).toUpperCase() + nounText.slice(1) : nounText}
        {after}
      </p>
      <div className="rule"><Rich text={cs.rule} /></div>
    </div>
  );
}

/* ---- adjective lab: article + adjective with its ending + noun ---- */
function AdjectiveLab({ t, block }: { t: LessonTraining; block: Extract<Block, { type: 'adjective-lab' }> }) {
  const { s } = useLang();
  const arts = t.articles!;
  const ends = t.adjectiveEndings!;
  const [k, setK] = useState(0);
  const [c, setC] = useState(block.cases.length > 1 ? 1 : 0);
  const [a, setA] = useState(0);
  const [n, setN] = useState(0);
  const kind = block.kinds[k];
  const cs = block.cases[c];
  // "ein, eine" has no plural, and nouns without an article only work for nouns marked free (plural, Milch, Brot …)
  const nouns = block.nouns.filter((x) => (kind === 'indefinite' ? x.g !== 'pl' : kind === 'none' ? x.free : true));
  const noun = nouns[Math.min(n, nouns.length - 1)];
  const g = gi(noun.g);
  const art = arts[kind][cs.id]![g];
  const ending = ends[kind][cs.id]![g];
  const adj = block.adjectives[a];
  const nounText = cs.id === 'dat' && noun.g === 'pl' && noun.dat ? noun.dat : noun.noun;
  const frame = Array.isArray(cs.frame) ? (noun.g === 'pl' ? cs.frame[1] : cs.frame[0]) : cs.frame;
  const [before, after] = frame.split('___');
  const nomArt = arts[kind].nom[g];
  const changed = cs.id !== 'nom' && art !== '' && art !== nomArt;
  return (
    <div className="card">
      <h2>{block.title}</h2>
      <p><Rich text={block.intro} /></p>
      <Chips label={s.kindLabel} items={block.kinds.map((x) => arts[x].label)} current={k} onPick={setK} />
      <Chips label={s.caseLabel} items={block.cases.map((x) => x.label)} current={c} onPick={setC} />
      <Chips label={s.adjectiveLabel} items={block.adjectives} current={a} onPick={setA} />
      <Chips label={s.nounLabel} items={nouns.map((x) => `${arts.definite.nom[gi(x.g)]} ${x.noun}`)} current={Math.min(n, nouns.length - 1)} onPick={setN} />
      <p className="big-word sentence" aria-live="polite">
        {before}
        {art && <span className={'t-' + TONES[g] + (changed ? ' chg' : '')}>{before.trim() === '' ? art.charAt(0).toUpperCase() + art.slice(1) : art}</span>}
        {art ? ' ' : ''}
        <span className={'t-' + TONES[g]}>{art || before.trim() !== '' ? adj : adj.charAt(0).toUpperCase() + adj.slice(1)}<span className="chg">{ending}</span></span>
        {' '}
        {nounText}
        {after}
      </p>
      <p className="how">{s.endingLabel}: <b>-{ending}</b></p>
      <div className="rule"><Rich text={cs.rule} /></div>
    </div>
  );
}

/* ---- parts lab: the sentence parts (Satzteile); the verb stays in position 2 ---- */
function PartsLab({ block }: { block: Extract<Block, { type: 'parts-lab' }> }) {
  const { s } = useLang();
  const [si, setSi] = useState(0);
  const [st, setSt] = useState(0);
  const sentence = block.sentences[si];
  const start = sentence.starts[Math.min(st, sentence.starts.length - 1)];
  const order = partsArrangement(sentence.parts, start).flat();
  const roleOf = (text: string) => sentence.parts.find((p) => p.t === text)!.r;
  const words = order.map((tx, i) => (i === 0 ? cap(tx) : tx));
  const text = words.map((w, i) => (roleOf(order[i]) === 'V' ? `<v>${w}</v>` : w)).join(' ') + '.';
  return (
    <div className="card">
      <h2>{block.title}</h2>
      <p><Rich text={block.intro} /></p>
      <Chips label={s.what} items={block.sentences.map((x) => cap(x.parts.map((p) => p.t).join(' ')))} current={si} onPick={(i) => { setSi(i); setSt(0); }} />
      <Chips label={s.startWith} items={sentence.starts.map((r) => block.roles[r])} current={Math.min(st, sentence.starts.length - 1)} onPick={setSt} />
      <div className="parts" role="group" aria-label={s.roleLegend}>
        {order.map((tx, i) => {
          const r = roleOf(tx);
          return (
            <span key={i} className={'sentpart r-' + r}>
              <span className="sentpartlabel"><span className={'rolebadge r-' + r}>{r}</span> {block.roles[r]}{r === 'V' ? ` · ${s.verbPosition}` : ''}</span>
              <span className="sentparttext">{words[i]}</span>
            </span>
          );
        })}
      </div>
      <p className="big-word sentence" aria-live="polite"><Rich text={text} /></p>
    </div>
  );
}

/* ---- clause lab: a main clause and a subordinate clause, in both orders ---- */
const capRich = (text: string) => text.replace(/^((?:<\w+>)?)(.)/, (_m, t: string, c: string) => t + c.toUpperCase());
function ClauseLab({ block }: { block: Extract<Block, { type: 'clause-lab' }> }) {
  const { s } = useLang();
  const [si, setSi] = useState(0);
  const [orderPick, setOrder] = useState(0);
  const x = block.sentences[si];
  // sentences without a second order (dass, ob) are always shown main clause first
  const order = x.mainAfter ? orderPick : 0;
  // "weil 1", "weil 2" when a word is used for several sentences
  const sentenceLabels = block.sentences.map((y, i) => {
    const same = block.sentences.filter((z) => z.conj === y.conj);
    return same.length > 1 ? `${y.conj} ${same.indexOf(y) + 1}` : y.conj;
  });
  const conj = `<p>${x.conj}</p>`;
  // order 0: main clause, comma, conjunction + subordinate clause. order 1: the other way round.
  const parts =
    order === 0
      ? [{ key: 'main', label: block.mainLabel, text: capRich(x.main) }, { key: 'sub', label: block.subLabel, text: `${conj} ${x.sub}` }]
      : [{ key: 'sub', label: block.subLabel, text: capRich(`${conj} ${x.sub}`) }, { key: 'main', label: block.mainLabel, text: x.mainAfter! }];
  const sentence = parts.map((p) => p.text).join(', ') + '.';
  return (
    <div className="card">
      <h2>{block.title}</h2>
      <p><Rich text={block.intro} /></p>
      <Chips label={s.what} items={sentenceLabels} current={si} onPick={setSi} />
      {x.mainAfter && <Chips label={s.order} items={block.orders} current={order} onPick={setOrder} />}
      <div className="parts" role="group" aria-label={s.roleLegend}>
        {parts.map((p) => (
          <span key={p.key} className={'sentpart clause-' + p.key}>
            <span className="sentpartlabel">{p.label}</span>
            <span className="sentparttext"><Rich text={p.text} /></span>
          </span>
        ))}
      </div>
      <p className="big-word sentence" aria-live="polite"><Rich text={sentence} /></p>
      <p className="how"><Rich text={block.rules[order]} /></p>
    </div>
  );
}

export function LessonUnderstand({ t, onPractise }: { t: LessonTraining; onPractise: () => void }) {
  const { s } = useLang();
  return (
    <div>
      <div className="card merke">
        <h3>{s.youWillBeAble}</h3>
        <ul>{t.canDo.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
      {t.understand.map((b, i) => {
        switch (b.type) {
          case 'text':
            return (
              <div key={i} className="card">
                {b.title && <h2>{b.title}</h2>}
                {b.body.map((x, k) => <p key={k}><Rich text={x} /></p>)}
              </div>
            );
          case 'rule':
            return (
              <div key={i} className="card merke">
                <h3>{b.title}</h3>
                {b.body.map((x, k) => <p key={k}><Rich text={x} /></p>)}
              </div>
            );
          case 'dialogue':
            return (
              <div key={i} className="card">
                {b.title && <h2>{b.title}</h2>}
                <div className="bubbles">
                  {b.lines.map((l, n) => (
                    <div key={n} className={'bubble' + (n % 2 ? ' r' : '')}>
                      <span className="who">{l.who}</span>
                      <Rich text={l.say} />
                    </div>
                  ))}
                </div>
              </div>
            );
          case 'conjugation':
            return <ConjugationLab key={i} t={t} block={b} />;
          case 'sentence-lab':
            return <SentenceLab key={i} t={t} block={b} />;
          case 'bracket-lab':
            return <BracketLab key={i} t={t} block={b} />;
          case 'detective':
            return <Detective key={i} block={b} />;
          case 'word-list':
            return <WordList key={i} t={t} block={b} />;
          case 'table':
            return <PlainTable key={i} block={b} />;
          case 'article-table':
            return <ArticleTable key={i} t={t} block={b} />;
          case 'case-lab':
            return <CaseLab key={i} t={t} block={b} />;
          case 'parts-lab':
            return <PartsLab key={i} block={b} />;
          case 'adjective-lab':
            return <AdjectiveLab key={i} t={t} block={b} />;
          case 'clause-lab':
            return <ClauseLab key={i} block={b} />;
        }
      })}
      <p className="center" style={{ marginTop: 28 }}>
        <button className="btn big" onClick={onPractise}>{s.practiseThisTopic}</button>
      </p>
    </div>
  );
}
