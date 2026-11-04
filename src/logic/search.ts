import { stripRich } from '../content/rich';
import type { Training } from '../content/types';

// Search in the trainings (pages Verstehen and Trainieren). Everything is looked up in the loaded content, nothing is sent anywhere.
// Capital letters, umlauts and ß do not matter: "falle", "fälle" and "faelle" all find "Fälle", "strasse" finds "Straße".
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // the dots of ä, ö, ü
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u');

export type Where = 'title' | 'explain' | 'practice';
export interface SearchHit {
  training: Training;
  where: Where[]; // where a word of the query was found
}

interface Doc {
  title: string;
  explain: string;
  practice: string;
}

// all texts of a training, split into: title, explanation (everything the learner reads) and practice (task titles, words)
const SKIP = new Set(['id', 'kind', 'level', 'skill', 'status', 'minutes', 'aktuellOnly', 'items', 'sets', 'title', 'articles', 'adjectiveEndings']);
function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(stripRich(x));
  else if (Array.isArray(x)) x.forEach((v) => strings(v, out));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (!SKIP.has(k)) strings(v, out);
  return out;
}
const docs = new WeakMap<Training, Doc>();
function docOf(t: Training): Doc {
  let d = docs.get(t);
  if (!d) {
    const practice = t.kind === 'lesson' ? [...t.sets.map((s) => s.title), ...(t.words ?? []).flatMap((w) => [w.word, w.meaning])] : [];
    d = { title: normalize(t.title), explain: normalize(strings(t).join(' ')), practice: normalize(practice.join(' ')) };
    docs.set(t, d);
  }
  return d;
}

// Every word of the query must be found somewhere in the training. Trainings with the word in the title come first.
export function searchTrainings(trainings: Training[], query: string): SearchHit[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: (SearchHit & { score: number })[] = [];
  for (const t of trainings) {
    const d = docOf(t);
    const all = `${d.title} ${d.explain} ${d.practice}`;
    if (!words.every((w) => all.includes(w))) continue;
    const where = (['title', 'explain', 'practice'] as const).filter((part) => words.some((w) => d[part].includes(w)));
    const score = (words.every((w) => d.title.includes(w)) ? 100 : words.some((w) => d.title.includes(w)) ? 50 : 0) + (where.includes('practice') ? 5 : 0) + (where.includes('explain') ? 3 : 0);
    hits.push({ training: t, where, score });
  }
  return hits.sort((a, b) => b.score - a.score || a.training.title.localeCompare(b.training.title, 'de')).map(({ training, where }) => ({ training, where }));
}
