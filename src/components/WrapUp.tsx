import type { Training } from '../content/types';
import { useLang } from '../i18n';
import type { ProgressData } from '../logic/progress';
import { summarize } from '../logic/session';

// "Stunde beenden": a friendly whiteboard page with what was done today. Nothing is saved.
export function WrapUp({ progress, trainings, onBack }: { progress: ProgressData; trainings: Training[]; onBack: () => void }) {
  const { s } = useLang();
  const sum = summarize(progress, trainings);
  return (
    <section className="whiteboard-wrap" aria-labelledby="wu-title">
      <div className="whiteboard">
        <p className="wb-day" id="wu-title">{s.wrapTitle}</p>
        <hr className="wb-line" />
        {sum.practised === 0 ? (
          <p className="wb-text">{s.wrapNone}</p>
        ) : (
          <>
            <p className="wb-hello">{s.wrapPractised(sum.practised)}</p>
            <p className="wb-text">{s.wrapClean(sum.cleanFirstTry)}</p>
            {sum.trainingsDone.length > 0 && <p className="wb-text">{s.wrapDone}: {sum.trainingsDone.join(' · ')}</p>}
            {sum.toRepeat.length > 0 && <p className="wb-text">{s.wrapRepeat}: {sum.toRepeat.join(' · ')}</p>}
          </>
        )}
        <p className="wb-text">{s.wrapBye}</p>
      </div>
      <div className="wb-tray" aria-hidden="true">
        <i className="mk blue" /><i className="mk green" /><i className="mk red" /><i className="eraser" />
      </div>
      <p className="center" style={{ marginTop: 16 }}>
        <button className="btn ghost" onClick={onBack}>{s.toStart}</button>
      </p>
    </section>
  );
}
