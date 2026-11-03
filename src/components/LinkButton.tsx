import { useState } from 'react';
import { useLang } from '../i18n';
import { trainingHash, type LinkMode } from '../logic/links';

// Copies the direct link to the open training (nothing is saved, the link is only an address).
export function LinkButton({ id, mode }: { id: string; mode: LinkMode }) {
  const { s } = useLang();
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const url = `${window.location.origin}${window.location.pathname}${trainingHash(id, mode)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('manual'); // clipboard blocked: show the link so it can be copied by hand
    }
  };
  return (
    <>
      <button type="button" className="btn ghost" onClick={copy}>{s.copyLink}</button>
      <span className="linkmsg" role="status">
        {state === 'copied' && s.linkCopied}
        {state === 'manual' && <input className="linkfield" readOnly value={url} aria-label={s.linkFallback} onFocus={(e) => e.currentTarget.select()} />}
      </span>
    </>
  );
}
