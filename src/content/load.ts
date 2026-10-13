import { parse } from 'yaml';
import { parseTraining } from './expand';
import type { Training } from './types';

export type Lang = 'en' | 'de';

const files = (glob: Record<string, string>) => glob;
const mainFiles = files(
  import.meta.glob('../../content/trainings/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
);
const germanFiles = files(
  import.meta.glob('../../content/trainings/de/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
);
const conceptFile = import.meta.glob('../../content/concepts.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const concepts: Record<string, string> = parse(Object.values(conceptFile)[0]);

const nameOf = (path: string) => path.split('/').pop()!;
const germanFor = (path: string) => Object.entries(germanFiles).find(([p]) => nameOf(p) === nameOf(path))?.[1];

// Draft trainings are shown only while developing (or in a preview build).
// The live site shows reviewed ones only.
const visible = (t: Training) => import.meta.env.DEV || import.meta.env.VITE_SHOW_DRAFTS === '1' || t.status === 'reviewed';

const levelOrder = { A0: 0, A1: 1, A2: 2, B1: 3 };
const byLevel = (a: Training, b: Training) => levelOrder[a.level] - levelOrder[b.level] || a.title.localeCompare(b.title, 'de');

// The same trainings, once in English (interface help) and once German only.
// Perfekt keeps its translation in content/trainings/de/; lesson trainings carry both languages in one file.
const build = (lang: Lang): Training[] =>
  Object.entries(mainFiles)
    .map(([path, raw]) => parseTraining(raw, lang === 'de' ? germanFor(path) : undefined, [], lang))
    .filter(visible)
    .sort(byLevel);
export const trainingsByLang: Record<Lang, Training[]> = { en: build('en'), de: build('de') };
