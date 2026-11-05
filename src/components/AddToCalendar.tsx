import { useState } from 'react';
import { isDayKey } from '../content/kalender';
import { useLang } from '../i18n';
import { dayKey, longDay } from '../logic/calendar';

// "Zum Kalender hinzufügen": choose a day (and a note), the training is connected with that day in the calendar.
// The calendar only keeps it while the page is open; the calendar page shows the text for the file that makes it permanent.
export function AddToCalendar({ trainingId, onAdd, onShowCalendar }: { trainingId: string; onAdd: (date: string, id: string, note: string) => boolean; onShowCalendar: () => void }) {
  const { s } = useLang();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dayKey(new Date()));
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDayKey(date)) return setMsg({ ok: false, text: s.addDayInvalid });
    const added = onAdd(date, trainingId, note.trim());
    setMsg({ ok: added, text: added ? s.addDone(longDay(date)) : s.addAlready(longDay(date)) });
    if (added) setNote('');
  };
  return (
    <>
      <button type="button" className="btn ghost" aria-expanded={open} onClick={() => { setOpen(!open); setMsg(null); }}>{s.addToCalendar}</button>
      {open && (
        <form className="addpanel" onSubmit={add}>
          <label htmlFor={'add-date-' + trainingId}>{s.addDayLabel}</label>
          <input id={'add-date-' + trainingId} type="date" value={date} onChange={(e) => { setDate(e.target.value); setMsg(null); }} required />
          <label htmlFor={'add-note-' + trainingId}>{s.addNoteLabel}</label>
          <input id={'add-note-' + trainingId} type="text" value={note} placeholder={s.addNotePlaceholder} onChange={(e) => setNote(e.target.value)} />
          <div className="row">
            <button type="submit" className="btn">{s.addButton}</button>
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>{s.addClose}</button>
          </div>
          <p className="how" role="status">{msg?.text}</p>
          {msg && msg.text !== s.addDayInvalid && <button type="button" className="btn ghost" onClick={onShowCalendar}>{s.addShowCalendar}</button>}
        </form>
      )}
    </>
  );
}
