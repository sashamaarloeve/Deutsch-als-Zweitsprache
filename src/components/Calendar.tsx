import { useState } from 'react';
import type { PlanEntry } from '../content/kalender';
import type { Training } from '../content/types';
import { useLang } from '../i18n';
import { dayKey, longDay, monthGrid, monthTitle, parseDayKey, WEEKDAYS } from '../logic/calendar';
import { TrainingCards } from './Aktuell';

// "Kalender": a loose lesson plan. Pick a day to see the trainings and the note planned for it.
// The repository file that holds the plan (link for the owner; adjust it if the branch changes)
const PLAN_FILE_URL = 'https://github.com/sashamaarloeve/Deutsch-als-Zweitsprache/edit/claude/deutsch-tutoring-app-yijrj3/content/kalender.yaml';

export function CalendarView({ plan, trainings, added, fileText, onRemove, onUnderstand, onPractice }: { plan: PlanEntry[]; trainings: Training[]; added: PlanEntry[]; fileText: string; onRemove: (date: string, id: string) => void; onUnderstand: (id: string) => void; onPractice: (id: string) => void }) {
  const { s } = useLang();
  const today = dayKey(new Date());
  const [selected, setSelected] = useState(today);
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() };
  });
  const byDay = new Map(plan.map((e) => [e.date, e] as const));
  const move = (delta: number) => {
    const d = new Date(shown.year, shown.month + delta, 1);
    setShown({ year: d.getFullYear(), month: d.getMonth() });
  };
  const pick = (key: string) => {
    setSelected(key);
    const d = parseDayKey(key);
    setShown({ year: d.getFullYear(), month: d.getMonth() }); // jumping to a day from the list also shows its month
  };
  const entry = byDay.get(selected);
  const upcoming = plan.filter((e) => e.date >= today && e.ids.length > 0).slice(0, 5);
  const dayCount = (key: string) => byDay.get(key)?.ids.length ?? 0;
  return (
    <>
      <h2>{s.navCalendar}</h2>
      <div className="card">
        <div className="calhead">
          <button type="button" className="btn ghost" onClick={() => move(-1)} aria-label={s.calendarPrev}>‹</button>
          <h3 id="cal-title" aria-live="polite">{monthTitle(shown.year, shown.month)}</h3>
          <button type="button" className="btn ghost" onClick={() => move(1)} aria-label={s.calendarNext}>›</button>
        </div>
        <table className="cal" aria-labelledby="cal-title">
          <thead>
            <tr>{WEEKDAYS.map((w) => <th key={w} scope="col">{w}</th>)}</tr>
          </thead>
          <tbody>
            {monthGrid(shown.year, shown.month).map((week, wi) => (
              <tr key={wi}>
                {week.map((key, di) => (
                  <td key={di}>
                    {key && (
                      <button
                        type="button"
                        className={'calday' + (key === selected ? ' sel' : '') + (key === today ? ' today' : '') + (dayCount(key) ? ' has' : '')}
                        aria-pressed={key === selected}
                        aria-label={`${longDay(key)}${key === today ? `, ${s.calendarToday}` : ''}${dayCount(key) ? `, ${s.calendarPlanned(dayCount(key))}` : ''}`}
                        onClick={() => pick(key)}
                      >
                        {Number(key.slice(8))}
                        {dayCount(key) > 0 && <span className="caldot" aria-hidden="true">●</span>}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="center">
          <button type="button" className="btn ghost" onClick={() => pick(today)}>{s.calendarToday}</button>
        </p>
      </div>

      <TrainingCards
        title={longDay(selected)}
        list={{ intro: entry?.note ?? '', ids: entry?.ids ?? [] }}
        trainings={trainings}
        emptyText={s.calendarNothing}
        onUnderstand={onUnderstand}
        onPractice={onPractice}
      />

      {added.length > 0 && (
        <div className="card">
          <h3>{s.calendarNewTitle}</h3>
          <p>{s.calendarNewText}</p>
          <ul className="upcoming">
            {added.map((e) => (
              <li key={e.date}>
                <b>{longDay(e.date)}</b>
                {e.note && <> · {e.note}</>}
                <ul>
                  {e.ids.map((id) => {
                    const title = trainings.find((t) => t.id === id)?.title ?? id;
                    return (
                      <li key={id}>
                        {title} <button type="button" className="linklike" onClick={() => onRemove(e.date, id)} aria-label={s.calendarRemove(title)}>×</button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <label htmlFor="plantext" className="searchlabel">{s.calendarFileText}</label>
          <textarea id="plantext" className="plantext" readOnly rows={8} value={fileText} onFocus={(e) => e.currentTarget.select()} />
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(fileText);
                  setCopied(true);
                } catch {
                  /* clipboard blocked: the text can be selected and copied by hand */
                }
              }}
            >
              {s.calendarCopy}
            </button>
            <a className="btn ghost" href={PLAN_FILE_URL} target="_blank" rel="noopener noreferrer">{s.calendarOpenFile}</a>
            <span role="status">{copied ? s.calendarCopied : ''}</span>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="card merke">
          <h3>{s.calendarUpcoming}</h3>
          <ul className="upcoming">
            {upcoming.map((e) => (
              <li key={e.date}>
                <button type="button" className="linklike" onClick={() => pick(e.date)}>{parseDayKey(e.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })}</button>
                {': '}
                {e.ids.map((id) => trainings.find((t) => t.id === id)?.title).filter(Boolean).join(' · ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
