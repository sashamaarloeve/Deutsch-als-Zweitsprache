import type { Aktuell } from '../content/aktuell';
import type { Training } from '../content/types';
import { useLang } from '../i18n';

// "Aktuell" and "Archiv": the trainings chosen in content/aktuell.yaml or content/archiv.yaml,
// each with a way into Verstehen and Trainieren.
export function TrainingCards({ title, list, trainings, emptyText, onUnderstand, onPractice }: { title: string; list: Aktuell; trainings: Training[]; emptyText: string; onUnderstand: (id: string) => void; onPractice: (id: string) => void }) {
  const { s } = useLang();
  // keep the order of the list; ids that do not exist (or are still hidden drafts) are skipped
  const shown = list.ids.map((id) => trainings.find((t) => t.id === id)).filter((t): t is Training => !!t);
  return (
    <>
      <h2>{title}</h2>
      {list.intro && <p className="how">{list.intro}</p>}
      {shown.length === 0 && <p className="how">{emptyText}</p>}
      {shown.map((t) => (
        <div className="card" key={t.id}>
          <h3>{t.title}</h3>
          <p>{t.description}</p>
          <div className="row">
            <button className="btn ghost" onClick={() => onUnderstand(t.id)}>{s.navUnderstand}</button>
            <button className="btn" onClick={() => onPractice(t.id)}>{s.navPractice}</button>
          </div>
        </div>
      ))}
    </>
  );
}
