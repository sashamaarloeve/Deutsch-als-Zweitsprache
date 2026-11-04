import { useLang } from '../i18n';

// Search field for the lists on Verstehen and Trainieren.
export function SearchBox({ value, onChange, count }: { value: string; onChange: (v: string) => void; count: number | null }) {
  const { s } = useLang();
  return (
    <div className="searchbox" role="search">
      <label htmlFor="searchfield" className="searchlabel">{s.searchLabel}</label>
      <div className="searchrow">
        <input id="searchfield" type="search" value={value} placeholder={s.searchPlaceholder} autoComplete="off" spellCheck={false} onChange={(e) => onChange(e.target.value)} />
        {value && <button type="button" className="btn ghost" onClick={() => onChange('')}>{s.searchClear}</button>}
      </div>
      <p className="how" role="status">{count === null ? '' : count === 0 ? s.searchNone : s.searchCount(count)}</p>
    </div>
  );
}
