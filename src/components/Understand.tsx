import { useState } from 'react';
import type { PartType, PerfektTraining, Verb } from '../content/types';
import { AUXF, verbSentence } from '../content/expand';
import { cap } from '../logic/german';
import { Colored, Marked } from './Colored';
import { BracketSentence, type Tok } from './Bracket';
import { useLang } from '../i18n';

const TYPE_KEYS: PartType[] = ['reg', 'irr', 'trenn', 'ohne'];

function Chips({ label, items, current, onPick }: { label: string; items: string[]; current: number; onPick: (i: number) => void }) {
  return (
    <div className="controls" role="group" aria-label={label}>
      <span className="lab" aria-hidden="true">{label}</span>
      {items.map((x, i) => (
        <button key={x} className="chipbtn" aria-pressed={current === i} onClick={() => onPick(i)}>
          {x}
        </button>
      ))}
    </div>
  );
}

/* ---- Bracket labs ---- */
// Main clauses: helper verb in position 2, Partizip II at the end.
function BracketLab({ t }: { t: PerfektTraining }) {
  const { s } = useLang();
  const k = t.klammer;
  const [p, setP] = useState(0);
  const [v, setV] = useState(6);
  const [m, setM] = useState(0);
  const verb = t.verbs.find((x) => x.inf === k.verbs[v][0])!;
  const comp = k.verbs[v][1];
  const A: Tok = { t: AUXF[verb.aux][p], c: 'aux', b: 1 };
  const Pa: Tok = { t: verb.part, c: 'part', b: 2 };
  const Pe: Tok = { t: k.personWords[p] };
  const C: Tok = { t: comp };
  const G: Tok = { t: 'gestern' };
  const toks: Tok[] = [
    [Pe, A, C, Pa],
    [Pe, A, G, C, Pa],
    [G, A, Pe, C, Pa],
    [A, Pe, C, Pa],
  ][m].map((x) => ({ ...x }));
  toks[0].t = cap(toks[0].t);
  const rule = (m === 3 ? k.rulePos1 : k.rulePos2) + (m === 2 ? ' ' + k.ruleStart : '');

  return (
    <div className="card">
      <h2>{k.title}</h2>
      <p>{k.text}</p>
      <p className="scope">{k.scope}</p>
      <Chips label={s.who} items={k.persons} current={p} onPick={setP} />
      <Chips label={s.what} items={k.verbs.map((x) => x[0])} current={v} onPick={setV} />
      <Chips label={s.sentenceType} items={k.modes} current={m} onPick={setM} />
      <BracketSentence toks={toks} end={m === 3 ? '?' : '.'} labels={[s.helperVerb, 'Partizip II']} />
      <div className="rule">
        {s.bracketRule()}{rule}
      </div>
    </div>
  );
}

// Subordinate clauses (weil, dass): the helper verb moves to the very end.
function SubBracketLab({ t }: { t: PerfektTraining }) {
  const { s: ui } = useLang();
  const k = t.klammer;
  const s = t.subKlammer;
  const [p, setP] = useState(0);
  const [v, setV] = useState(6);
  const [c, setC] = useState(0);
  const [m, setM] = useState(0);
  const verb = t.verbs.find((x) => x.inf === k.verbs[v][0])!;
  const comp = k.verbs[v][1];
  const conj = s.conjunctions[c];
  const aux = AUXF[verb.aux][p];
  const person = k.personWords[p];

  const toks: Tok[] = [
    { t: conj, c: 'conj', b: 1 },
    { t: person },
    ...(m === 1 ? [{ t: 'gestern' }] : []),
    { t: comp },
    { t: verb.part, c: 'part' },
    { t: aux, c: 'aux', b: 2 },
  ];
  const mainClause = `${cap(person)} ${aux} ${m === 1 ? 'gestern ' : ''}${comp} ${verb.part}.`;

  return (
    <div className="card">
      <h2>{s.title}</h2>
      <p>{s.text}</p>
      <Chips label={ui.who} items={k.persons} current={p} onPick={setP} />
      <Chips label={ui.what} items={k.verbs.map((x) => x[0])} current={v} onPick={setV} />
      <Chips label={ui.conjunction} items={s.conjunctions} current={c} onPick={setC} />
      <Chips label={ui.sentenceType} items={s.modes} current={m} onPick={setM} />
      <BracketSentence small lead={s.openers[conj] + ','} toks={toks} end="." labels={[conj, ui.helperVerb]} colors={['var(--amber-ink)', 'var(--aux)']} />
      <div className="rule">
        {ui.subBracketRule(conj)}{s.rule}
      </div>
      <p className="compare">
        {s.compareLabel} <Colored text={mainClause} />
      </p>
    </div>
  );
}

/* ---- Workshop: the four types of Partizip II ---- */
function Workshop({ t }: { t: PerfektTraining }) {
  const { s } = useLang();
  const [type, setType] = useState<PartType>('reg');
  const [verb, setVerb] = useState<Verb | null>(null);
  const info = t.partTypes[type];
  return (
    <div>
      <h2>{t.partTypes.title}</h2>
      <p>{t.partTypes.text}</p>
      <div className="types" role="group" aria-label={s.typesOfParticiple}>
        {TYPE_KEYS.map((k) => (
          <button
            key={k}
            className={'typecard' + (k === type ? ' on' : '')}
            aria-pressed={k === type}
            onClick={() => {
              setType(k);
              setVerb(null);
            }}
          >
            <b>{t.partTypes[k].name}</b>
            <div className="f">
              {t.partTypes[k].formula.map(([x, r]) => (
                <span key={x} className={'blk ' + r}>{x}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
      <div className="card">
        <p style={{ marginTop: 0 }}>{info.text}</p>
        <div className="legend">
          <span className="blk pre">{s.legendPrefix}</span><span className="blk ge">ge</span><span className="blk stem">{s.legendStem}</span><span className="blk end">{s.legendEnding}</span>
        </div>
        <div className="verbrow" role="group" aria-label={s.verbs}>
          {t.verbs.filter((x) => x.type === type).map((x) => (
            <button key={x.inf} className="chipbtn" aria-pressed={verb?.inf === x.inf} onClick={() => setVerb(x)}>
              {x.inf}
            </button>
          ))}
        </div>
        <div className="werk" aria-live="polite">
          {!verb && <span className="eq">{s.chooseVerb}</span>}
          {verb && (
            <>
              <div className="wrow">
                <b>{verb.inf}</b>
                <span className="eq">→</span>
                {verb.pieces.map((x, i) => (
                  <span key={i} className={'blk ' + x.r} style={{ animationDelay: `${i * 0.12}s` }}>{x.x}</span>
                ))}
                <span className="eq">=</span>
                <b className="part">{verb.part}</b>
              </div>
              <p><Colored text={verbSentence(verb, t.exceptions)} /></p>
              <p>
                <span className="blk auxb">{verb.aux}</span>{' '}
                {verb.aux === 'sein' ? t.why[verb.why ?? 'move'] : ''}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Verb list ---- */
function VerbList({ t }: { t: PerfektTraining }) {
  const { s } = useLang();
  const [cat, setCat] = useState<'all' | PartType>('all');
  return (
    <details>
      <summary>{s.verbList}</summary>
      <div className="controls" role="group" aria-label={s.filterVerbs} style={{ marginTop: 10 }}>
        {(['all', ...TYPE_KEYS] as const).map((k) => (
          <button key={k} className="chipbtn" aria-pressed={cat === k} onClick={() => setCat(k)}>
            {k === 'all' ? s.all : t.partTypes[k].name}
          </button>
        ))}
      </div>
      <div className="tblwrap">
        <table>
          <thead>
            <tr><th>{s.infinitive}</th><th>{s.participle}</th><th>{s.auxiliary}</th></tr>
          </thead>
          <tbody>
            {t.verbs.filter((v) => cat === 'all' || v.type === cat).map((v) => (
              <tr key={v.inf}>
                <td>{v.inf}</td>
                <td>{v.pieces.map((x, i) => <span key={i} className={'blk ' + x.r} style={{ padding: '0 .3em' }}>{x.x}</span>)}</td>
                <td>{v.aux}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function Understand({ t, onTrain }: { t: PerfektTraining; onTrain: () => void }) {
  const { s } = useLang();
  const i = t.intro;
  return (
    <div>
      <div className="card merke">
        <h3>{s.youWillBeAble}</h3>
        <ul>{t.canDo.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>

      <h2>{i.title}</h2>
      <div className="card">
        <p className="lead">{i.lead}</p>
        <div className="bubbles">
          {i.dialogue.map((d, n) => (
            <div key={n} className={'bubble' + (n % 2 ? ' r' : '')}>
              <span className="who">{d.who}</span>
              <Marked text={d.text} />
            </div>
          ))}
        </div>
        <p>{i.formulaText}</p>
        <div className="formula">
          <span className="blk auxb">{i.formula[0]}</span><span className="eq">+</span>
          <span className="blk plain">{i.formula[1]}</span><span className="eq">+</span>
          <span className="blk partb">{i.formula[2]}</span>
        </div>
      </div>

      <BracketLab t={t} />
      <SubBracketLab t={t} />
      <Workshop t={t} />

      <h2>{t.auxCards.title}</h2>
      <div className="two">
        {(['haben', 'sein'] as const).map((k) => (
          <div key={k} className="card">
            <h3><span className="blk auxb">{k}</span> {t.auxCards[k].title.replace(/^\w+ – /, '– ')}</h3>
            <ul>{t.auxCards[k].points.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        ))}
      </div>

      <VerbList t={t} />

      <p className="center" style={{ marginTop: 28 }}>
        <button className="btn big" onClick={onTrain}>{s.practiseThisTopic}</button>
      </p>
    </div>
  );
}
