import { useLang } from '../i18n';
import { todayInGerman } from '../logic/today';

// Start page: a whiteboard with today's weekday and date and a short welcome.
export function Whiteboard({ onFinish, planned }: { onFinish: () => void; planned: string[] }) {
  const { s } = useLang();
  const { weekday, date } = todayInGerman();
  return (
    <section className="whiteboard-wrap" aria-labelledby="wb-title">
      <div className="whiteboard">
        <p className="wb-day" id="wb-title">{weekday}</p>
        <p className="wb-date">{date}</p>
        <hr className="wb-line" />
        <p className="wb-hello">{s.homeHello}</p>
        <p className="wb-text">{s.homeText}</p>
        {planned.length > 0 && <p className="wb-text">{s.plannedToday}: <b>{planned.join(' · ')}</b></p>}
        <p className="wb-text">{s.homeHint}</p>
      </div>
      {/* the marker tray is decoration only */}
      <div className="wb-tray" aria-hidden="true">
        <i className="mk blue" /><i className="mk green" /><i className="mk red" /><i className="eraser" />
      </div>
      <p className="center" style={{ marginTop: 16 }}>
        <button className="btn ghost" onClick={onFinish}>{s.finishLesson}</button>
      </p>
    </section>
  );
}
