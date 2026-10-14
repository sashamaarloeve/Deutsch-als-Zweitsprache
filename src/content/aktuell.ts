import { parse } from 'yaml';

// The "Aktuell" tab is filled from content/aktuell.yaml: a short intro and the ids of the trainings
// the pupils are working on right now.
export interface Aktuell {
  intro: string;
  ids: string[];
}

export function parseAktuell(raw: string): Aktuell {
  const data = (parse(raw) ?? {}) as { intro?: unknown; trainings?: unknown };
  return {
    intro: typeof data.intro === 'string' ? data.intro : '',
    ids: Array.isArray(data.trainings) ? data.trainings.filter((x): x is string => typeof x === 'string') : [],
  };
}
