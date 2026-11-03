import { useEffect, useMemo, useState } from 'react';
import { aktuell, archiv, plan, trainings } from './content/load';
import type { Item, Training } from './content/types';
import { LangProvider, useLang } from './i18n';
import { Runner } from './components/Runner';
import { LessonPractice, TopicPractice } from './components/TopicPractice';
import { LessonUnderstand } from './components/LessonUnderstand';
import { Whiteboard } from './components/Whiteboard';
import { TrainingCards } from './components/Aktuell';
import { CalendarView } from './components/Calendar';
import { Understand } from './components/Understand';
import { LinkButton } from './components/LinkButton';
import { ReadingRuler } from './components/ReadingRuler';
import { WrapUp } from './components/WrapUp';
import { addPoints, emptyProgress, recordResult, recordTraining, type Outcome } from './logic/progress';
import { pickQuickPractice } from './logic/practice';
import { applyPrefs, defaultPrefs, ZOOMS } from './logic/prefs';
import { parseTrainingHash, trainingHash } from './logic/links';
import { dayKey } from './logic/calendar';

type Tab = 'home' | 'aktuell' | 'archiv' | 'kalender' | 'understand' | 'practice' | 'wrapup';
type CardsFrom = 'aktuell' | 'archiv' | 'kalender';
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

// A direct link (#/training-id or #/training-id/trainieren) opens that training; unknown ids are ignored.
function fromHash(hash: string): { tab: Tab; topicId: string | null; practice: PracticeView; cardsFrom: 'aktuell' | null } {
  const link = parseTrainingHash(hash);
  const t = link && trainings.find((x) => x.id === link.id);
  if (!link || !t) return { tab: 'home', topicId: null, practice: { name: 'menu' }, cardsFrom: null };
  const cardsFrom = t.aktuellOnly ? ('aktuell' as const) : null;
  return link.mode === 'practice'
    ? { tab: 'practice', topicId: null, practice: { name: 'topic', id: t.id }, cardsFrom }
    : { tab: 'understand', topicId: t.id, practice: { name: 'menu' }, cardsFrom };
}

function Shell() {
  const { s } = useLang();
  const start = useMemo(() => fromHash(window.location.hash), []);
  const [tab, setTab] = useState<Tab>(start.tab);
  const [topicId, setTopicId] = useState<string | null>(start.topicId); // open topic in "Understand"
  const [cardsFrom, setCardsFrom] = useState<CardsFrom | null>(start.cardsFrom); // set when a training was opened from the Aktuell or Archiv tab
  const [practice, setPractice] = useState<PracticeView>(start.practice);
  const [quickFrom, setQuickFrom] = useState<'aktuell' | null>(null); // the quick practice was started in the Aktuell tab
  const [progress, setProgress] = useState(emptyProgress);
  const [prefs, setPrefs] = useState(defaultPrefs);
  const changePrefs = (next: typeof prefs) => {
    setPrefs(next);
    applyPrefs(next);
  };
  const zoomIdx = ZOOMS.indexOf(prefs.zoom);
  // the address shows the open training, so it can be copied; nothing is stored
  useEffect(() => {
    const open = tab === 'understand' && topicId ? trainingHash(topicId, 'understand') : tab === 'practice' && practice.name === 'topic' ? trainingHash(practice.id, 'practice') : '';
    if (open !== window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search + open);
  }, [tab, topicId, practice]);
  useEffect(() => {
    const follow = () => {
      const next = fromHash(window.location.hash);
      if (next.tab === 'home') return;
      setTab(next.tab);
      setTopicId(next.topicId);
      setPractice(next.practice);
      setCardsFrom(next.cardsFrom);
    };
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);
  // trainings planned in the calendar for today (shown on the start page)
  const plannedToday = (plan.find((e) => e.date === dayKey(new Date()))?.ids ?? []).map((id) => trainings.find((t) => t.id === id)?.title).filter((x): x is string => !!x);
  const aktuellTrainings = aktuell.ids.map((id) => trainings.find((t) => t.id === id)).filter((t): t is Training => !!t);
  const startQuickCurrent = () => {
    setPractice({ name: 'quick', ids: pickQuickPractice(aktuellTrainings, progress).map((i) => i.id) });
    setQuickFrom('aktuell');
    goTab('practice');
  };
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
  // leaving an Aktuell-only training: close it everywhere, so the Verstehen and Trainieren tabs show their lists again
  const backToCards = () => {
    setTopicId(null);
    setPractice({ name: 'menu' });
    goTab(cardsFrom ?? 'aktuell');
  };
  const backLabelCards = cardsFrom === 'archiv' ? s.backToArchive : cardsFrom === 'kalender' ? s.backToCalendar : s.backToCurrent;
  // open a training from one of the card tabs (Aktuell, Archiv)
  const openFromCards = (from: CardsFrom, id: string, to: 'understand' | 'practice') => {
    setCardsFrom(from);
    if (to === 'understand') {
      setTopicId(id);
      goTab('understand');
    } else goPractice(id);
  };

  // trainings marked aktuellOnly are reached from the Aktuell or Archiv tab only
  const listed = trainings.filter((t) => !t.aktuellOnly);
  const shown = listed.filter((t) => t.skill === area && ((area !== 'reading' && area !== 'vocabulary') || t.level === readLevel));
  const topic = trainings.find((t) => t.id === topicId);
  const practiceTopic = practice.name === 'topic' ? trainings.find((t) => t.id === practice.id) : undefined;
  const quickItems = practice.name === 'quick' ? practice.ids.map((id) => itemById.get(id)).filter((i): i is Item => !!i) : [];

  return (
    <div className="sheet">
      {prefs.ruler && <ReadingRuler />}
      <header className="top">
        <div>
          <h1><button type="button" className="homelink" aria-label={`DaZ-Alex – ${s.toStart}`} onClick={() => goTab('home')}>DaZ-<span className="u">Alex</span></button></h1>
          <span className="kicker">{s.brandKicker}</span>
        </div>
        <div className="topright">
          <div className="prefs" role="group" aria-label={s.prefsLabel}>
            <button type="button" aria-label={`A− ${s.textSmaller}`} disabled={zoomIdx <= 0} onClick={() => changePrefs({ ...prefs, zoom: ZOOMS[zoomIdx - 1] })}>A−</button>
            <button type="button" aria-label={`A+ ${s.textLarger}`} disabled={zoomIdx >= ZOOMS.length - 1} onClick={() => changePrefs({ ...prefs, zoom: ZOOMS[zoomIdx + 1] })}>A+</button>
            <button type="button" aria-pressed={prefs.wide} onClick={() => changePrefs({ ...prefs, wide: !prefs.wide })}>{s.wideSpacing}</button>
            <button type="button" aria-pressed={prefs.dys} onClick={() => changePrefs({ ...prefs, dys: !prefs.dys })}>{s.dysFont}</button>
            <button type="button" aria-pressed={prefs.ruler} onClick={() => changePrefs({ ...prefs, ruler: !prefs.ruler })}>{s.readingRuler}</button>
          </div>
        </div>
      </header>

      <nav className="maintabs" aria-label={s.sections}>
        <button className={'btn' + (tab === 'aktuell' ? ' on' : ' ghost')} aria-pressed={tab === 'aktuell'} onClick={() => goTab('aktuell')}>
          {s.navCurrent}
        </button>
        <button className={'btn' + (tab === 'understand' ? ' on' : ' ghost')} aria-pressed={tab === 'understand'} onClick={() => goTab('understand')}>
          {s.navUnderstand}
        </button>
        <button className={'btn' + (tab === 'practice' ? ' on' : ' ghost')} aria-pressed={tab === 'practice'} onClick={() => goTab('practice')}>
          {s.navPractice}
        </button>
        <button className={'btn' + (tab === 'archiv' ? ' on' : ' ghost')} aria-pressed={tab === 'archiv'} onClick={() => goTab('archiv')}>
          {s.navArchive}
        </button>
        <button className={'btn' + (tab === 'kalender' ? ' on' : ' ghost')} aria-pressed={tab === 'kalender'} onClick={() => goTab('kalender')}>
          {s.navCalendar}
        </button>
      </nav>

      <main>
        {tab === 'home' && <Whiteboard onFinish={() => goTab('wrapup')} planned={plannedToday} />}

        {tab === 'wrapup' && <WrapUp progress={progress} trainings={trainings} onBack={() => goTab('home')} />}

        {tab === 'aktuell' && (
          <TrainingCards
            title={s.navCurrent}
            list={aktuell}
            trainings={trainings}
            emptyText={s.currentEmpty}
            onUnderstand={(id) => openFromCards('aktuell', id, 'understand')}
            onPractice={(id) => openFromCards('aktuell', id, 'practice')}
            onQuick={startQuickCurrent}
          />
        )}

        {tab === 'kalender' && (
          <CalendarView
            plan={plan}
            trainings={trainings}
            onUnderstand={(id) => openFromCards('kalender', id, 'understand')}
            onPractice={(id) => openFromCards('kalender', id, 'practice')}
          />
        )}

        {tab === 'archiv' && (
          <TrainingCards
            title={s.navArchive}
            list={archiv}
            trainings={trainings}
            emptyText={s.archiveEmpty}
            onUnderstand={(id) => openFromCards('archiv', id, 'understand')}
            onPractice={(id) => openFromCards('archiv', id, 'practice')}
          />
        )}

        {tab === 'understand' && !topic && (
          <>
            <h2>{s.topicsTitle}</h2>
            <p className="how">{s.topicsHint}</p>
            {listed.map((t) => (
              <TopicCard key={t.id} t={t} onClick={() => { setCardsFrom(null); setTopicId(t.id); window.scrollTo({ top: 0 }); }} />
            ))}
          </>
        )}

        {tab === 'understand' && topic && (
          <>
            <div className="row">
              <button className="btn ghost" onClick={() => (cardsFrom ? backToCards() : setTopicId(null))}>{cardsFrom ? backLabelCards : s.backToTopics}</button>
              <LinkButton id={topic.id} mode="understand" />
            </div>
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
              <button className="btn big" onClick={() => { setQuickFrom(null); setPractice({ name: 'quick', ids: pickQuickPractice(listed, progress).map((i) => i.id) }); }}>
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
                onClick={() => { setCardsFrom(null); setPractice({ name: 'topic', id: t.id }); }}
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
            exitLabel={quickFrom ? s.backToCurrentLong : undefined}
            onExit={() => {
              setPractice({ name: 'menu' });
              if (quickFrom) {
                setQuickFrom(null);
                goTab('aktuell');
              }
            }}
          />
        )}

        {tab === 'practice' && practiceTopic?.kind === 'perfekt' && (
          <TopicPractice
            t={practiceTopic}
            onBack={() => setPractice({ name: 'menu' })}
            extra={<LinkButton id={practiceTopic.id} mode="practice" />}
            onResult={onResult}
            onFinish={onFinish(practiceTopic.id)}
            onPoints={onPoints}
          />
        )}
        {tab === 'practice' && practiceTopic?.kind === 'lesson' && (
          <LessonPractice t={practiceTopic} extra={<LinkButton id={practiceTopic.id} mode="practice" />} backLabel={cardsFrom ? backLabelCards : undefined} onBack={() => (cardsFrom ? backToCards() : setPractice({ name: 'menu' }))} onResult={onResult} onFinish={onFinish(practiceTopic.id)} />
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
