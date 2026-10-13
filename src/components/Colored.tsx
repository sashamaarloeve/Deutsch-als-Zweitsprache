import { roleTokens } from '../logic/german';

// A sentence with the helper verb (underlined) and the Partizip II (wavy underline) marked.
// Underline style plus colour, so it does not depend on colour alone.
export function Colored({ text }: { text: string }) {
  return (
    <>
      {roleTokens(text).map((x, i) => (
        <span key={i}>
          {i > 0 && ' '}
          {x.role ? <span className={x.role}>{x.t}</span> : x.t}
        </span>
      ))}
    </>
  );
}

// "Ich [habe] Fußball [gespielt]." – first bracket is the helper verb, second the Partizip II.
export function Marked({ text }: { text: string }) {
  let n = 0;
  return (
    <>
      {text.split(/(\[[^\]]+\])/g).map((p, i) =>
        p.startsWith('[') ? (
          <span key={i} className={n++ % 2 === 0 ? 'aux' : 'part'}>
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
