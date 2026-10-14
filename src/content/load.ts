import { parse } from 'yaml';
import { parseTraining } from './expand';
import type { Training } from './types';
import { parseAktuell, type Aktuell } from './aktuell';

const mainFiles = import.meta.glob('../../content/trainings/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const conceptFile = import.meta.glob('../../content/concepts.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const concepts: Record<string, string> = parse(Object.values(conceptFile)[0]);

// Draft trainings are shown only while developing (or in a preview build).
// The live site shows reviewed ones only.
const visible = (t: Training) => import.meta.env.DEV || import.meta.env.VITE_SHOW_DRAFTS === '1' || t.status === 'reviewed';

const levelOrder = { A0: 0, A1: 1, A2: 2, B1: 3 };
const byLevel = (a: Training, b: Training) => levelOrder[a.level] - levelOrder[b.level] || a.title.localeCompare(b.title, 'de');

export const trainings: Training[] = Object.values(mainFiles).map((raw) => parseTraining(raw)).filter(visible).sort(byLevel);

const aktuellFile = import.meta.glob('../../content/aktuell.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const aktuell: Aktuell = parseAktuell(Object.values(aktuellFile)[0] ?? '');
