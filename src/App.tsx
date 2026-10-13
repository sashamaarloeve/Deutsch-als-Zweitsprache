import { useMemo, useState } from 'react';
import { trainingsByLang } from './content/load';
import type { Item, Training } from './content/types';
import { LangProvider, useLang } from './i18n';
import { Runner } from './components/Runner';
import { LessonPractice, TopicPractice } from './components/TopicPractice';
import { LessonUnderstand } from './components/LessonUnderstand';
import { Understand } from './components/Understand';
import { addPoints, emptyProgress, recordResult, recordTraining, type Outcome } from './logic/progress';
import { pickQuickPractice } from './logic/practice';
import { applyPrefs, defaultPrefs, ZOOMS } from './logic/prefs';

type Tab = 'understand' | 'practice';
const READ_LEVELS = ['A1', 'A2', 'B1'] as const;
const AREAS = ['reading', 'grammar', 'vocabulary'] as const; // the three areas of the Practice menu
// What is open inside each tab. Ids (not objects) so a language switch shows the right texts.
type PracticeView = { name: 'menu' } | { name: 'quick'; ids: string[] } | { name: 'topic'; id: string };

function TopicCard({ t, done, onClick, extra }: { t: Training; done?: { best: number }; onClick: () => void; extra?: string }) {
  const { s } = useLang();
  return (
    <button className="tcard" onClick={onClick}>
      <h3>{t.title}</h3>
      <div className="meta">
        <span className="badge">{t.level}</span>
        <span className="badge">{s.skill[t.skill] ?? t.skill}</span>
        <span className="badge">{s.minutes(t.minutes)}</span>
        {t.status === 'draft' && <span className="badge draft">{s.draft}</span>}
        {done && <span className="badge">{s.best(done.best)}</span>}
      </div>
      <span>{extra ?? t.description}</span>
    </button>
  );
}

function Shell() {
  const { lang, s } = useLang();
  const trainings = trainingsByLang[lang];
  const [tab, setTab] = useState<Tab>('understand');
  const [topicId, setTopicId] = useState<string | null>(null); // open topic in "Understand"
  const [practice, setPractice] = useState<PracticeView>({ name: 'menu' });
  const [progress, setProgress] = useState(emptyProgress);
  const [prefs, setPrefs] = useState(defaultPrefs);
  const changePrefs = (next: typeof prefs) => {
    setPrefs(next);
    applyPrefs(next);
  };
  const zoomIdx = ZOOMS.indexOf(prefs.zoom);
  const [area, setArea] = useState<(typeof AREAS)[number]>('grammar');
  const [readLevel, setReadLevel] = useState<'A1' | 'A2' | 'B1'>('A1'); // sub-areas of Reading

  const itemById = useMemo(() => new Map(trainings.flatMap((t) => t.items).map((i) => [i.id, i] as const)), [trainings]);
  // functional updates: results live only in memory while the page is open
  const onResult = (item: Item, o: Outcome) => setProgress((p) => recordResult(p, item.id, o));
  const onPoints = (n: number) => setProgress((p) => addPoints(p, n));
  const onFinish = (id?: string) => (pct: number) => id && setProgress((p) => recordTraining(p, id, pct));
  const goPractice = (id: string) => {
    setPractice({ name: 'topic', id });
    goTab('practice');
  };
  const goTab = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const shown = trainings.filter((t) => t.skill === area && ((area !== 'reading' && area !== 'vocabulary') || t.level === readLevel));
  const topic = trainings.find((t) => t.id === topicId);
  const practiceTopic = practice.name === 'topic' ? trainings.find((t) => t.id === practice.id) : undefined;
  const quickItems = practice.name === 'quick' ? practice.ids.map((id) => itemById.get(id)).filter((i): i is Item => !!i) : [];

  return (
    <div className="sheet">
      <header className="top">
        <div>
          <span className="kicker">{s.brandKicker}</span>
          <h1>DaZ-<span className="u">Alex</span></h1>
        </div>
        <div className="topright">
          <div className="prefs" role="group" aria-label={s.prefsLabel}>
            <button type="button" aria-label={`A− ${s.textSmaller}`} disabled={zoomIdx <= 0} onClick={() => changePrefs({ ...prefs, zoom: ZOOMS[zoomIdx - 1] })}>A−</button>
            <button type="button" aria-label={`A+ ${s.textLarger}`} disabled={zoomIdx >= ZOOMS.length - 1} onClick={() => changePrefs({ ...prefs, zoom: ZOOMS[zoomIdx + 1] })}>A+</button>
            <button type="button" aria-pressed={prefs.theme === 'white'} onClick={() => changePrefs({ ...prefs, theme: prefs.theme === 'white' ? 'yellow' : 'white' })}>{s.whiteBackground}</button>
            <button type="button" aria-pressed={prefs.wide} onClick={() => changePrefs({ ...prefs, wide: !prefs.wide })}>{s.wideSpacing}</button>
          </div>
        </div>
      </header>

      <nav className="maintabs" aria-label={s.sections}>
        <button className={'btn' + (tab === 'understand' ? ' on' : ' ghost')} aria-pressed={tab === 'understand'} onClick={() => goTab('understand')}>
          {s.navUnderstand}
        </button>
        <button className={'btn' + (tab === 'practice' ? ' on' : ' ghost')} aria-pressed={tab === 'practice'} onClick={() => goTab('practice')}>
          {s.navPractice}
        </button>
      </nav>

      <main>
        {tab === 'understand' && !topic && (
          <>
            <h2>{s.topicsTitle}</h2>
            <p className="how">{s.topicsHint}</p>
            {trainings.map((t) => (
              <TopicCard key={t.id} t={t} onClick={() => { setTopicId(t.id); window.scrollTo({ top: 0 }); }} />
            ))}
          </>
        )}

        {tab === 'understand' && topic && (
          <>
            <button className="btn ghost" onClick={() => setTopicId(null)}>{s.backToTopics}</button>
            <h2 className="tt">{topic.title}</h2>
            {topic.kind === 'perfekt' ? (
              <Understand t={topic} onTrain={() => goPractice(topic.id)} />
            ) : (
              <LessonUnderstand t={topic} onPractise={() => goPractice(topic.id)} />
            )}
          </>
        )}

        {tab === 'practice' && practice.name === 'menu' && (
          <>
            <h2>{s.practiceTitle}</h2>
            <p className="how">{s.practiceHint}</p>
            <div className="card merke">
              <h3>{s.quickTitle}</h3>
              <p>{s.quickText}</p>
              <button className="btn big" onClick={() => setPractice({ name: 'quick', ids: pickQuickPractice(trainings, progress).map((i) => i.id) })}>
                {s.quickButton}
              </button>
            </div>
            <h2 style={{ marginTop: 28 }}>{s.byTopic}</h2>
            <div className="areatabs" role="group" aria-label={s.areaLabel}>
              {AREAS.map((a) => (
                <button key={a} className={'btn' + (area === a ? ' on' : ' ghost')} aria-pressed={area === a} onClick={() => setArea(a)}>
                  {s.skill[a]}
                </button>
              ))}
            </div>
            {(area === 'reading' || area === 'vocabulary') && (
              <div className="areatabs sub" role="group" aria-label={s.levelLabel}>
                {READ_LEVELS.map((l) => (
                  <button key={l} className={'btn' + (readLevel === l ? ' on' : ' ghost')} aria-pressed={readLevel === l} onClick={() => setReadLevel(l)}>
                    {l}
                  </button>
                ))}
              </div>
            )}
            {shown.length === 0 && <p className="how">{s.areaEmpty}</p>}
            {shown.map((t) => (
              <TopicCard
                key={t.id}
                t={t}
                done={progress.trainings[t.id]}
                extra={
                  t.kind === 'perfekt'
                    ? s.exercisesOf(7) + ': ' + [s.exBau, s.exHs, s.exConv, s.exPuz, s.exMem, s.exSprint, s.exWri].join(' · ')
                    : s.exercisesOf(t.sets.length) + ': ' + t.sets.map((x) => x.title).join(' · ')
                }
                onClick={() => setPractice({ name: 'topic', id: t.id })}
              />
            ))}
          </>
        )}

        {tab === 'practice' && practice.name === 'quick' && (
          <Runner
            title={s.quickTitle}
            items={quickItems}
            onResult={onResult}
            onFinish={onFinish()}
            onExit={() => setPractice({ name: 'menu' })}
          />
        )}

        {tab === 'practice' && practiceTopic?.kind === 'perfekt' && (
          <TopicPractice
            t={practiceTopic}
            onBack={() => setPractice({ name: 'menu' })}
            onResult={onResult}
            onFinish={onFinish(practiceTopic.id)}
            onPoints={onPoints}
          />
        )}
        {tab === 'practice' && practiceTopic?.kind === 'lesson' && (
          <LessonPractice t={practiceTopic} onBack={() => setPractice({ name: 'menu' })} onResult={onResult} onFinish={onFinish(practiceTopic.id)} />
        )}
      </main>
    </div>
  );
}

export function App() {
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  );
}
