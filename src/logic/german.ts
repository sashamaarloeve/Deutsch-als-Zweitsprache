// Small helpers to recognise the two parts of a Perfekt sentence. Used for colouring
// and for the rough writing check. They look at word shapes, so they are not perfect.
export const AUXRE = /^(habe|hast|hat|haben|habt|bin|bist|ist|sind|seid)$/i;

export const isParticiple = (w: string) =>
  /^ge\w{2,}(t|en)$/.test(w) ||
  /^(auf|an|ein|mit|ab|fern|aus|vor|zurück)ge\w+(t|en)$/.test(w) ||
  /^(be|ver|er|ent|zer)\w{2,}(t|en)$/.test(w) ||
  /\w+iert$/.test(w);

export const stripMarks = (t: string) => t.replace(/[.,?!;:]/g, '');

export type Role = 'aux' | 'part' | null;

// Marks the first helper verb and the last participle of a sentence.
export function roleTokens(text: string): { t: string; role: Role }[] {
  const toks = text.split(' ');
  const ai = toks.findIndex((t) => AUXRE.test(stripMarks(t)));
  let pi = -1;
  toks.forEach((t, i) => {
    if (i !== ai && isParticiple(stripMarks(t).toLowerCase())) pi = i;
  });
  return toks.map((t, i) => ({ t, role: i === ai ? 'aux' : i === pi ? 'part' : null }));
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
