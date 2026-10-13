import { parseRich } from '../content/rich';
import { useLang } from '../i18n';

// Renders lesson text with the small inline markup (<v>verb</v> …). Plain text nodes only.
export function Rich({ text }: { text: string }) {
  const { s } = useLang();
  return (
    <>
      {parseRich(text).map((seg, i) =>
        seg.tag ? (
          <span key={i} className={'m-' + seg.tag}>
            {seg.tag === 'x' && <span className="sr-only">{s.wrongMark} </span>}
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
