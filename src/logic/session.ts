import type { Training } from '../content/types';
import type { ProgressData } from './progress';

// The summary on the "Stunde beenden" page. Everything comes from the results kept in memory
// while the page is open; nothing is saved. Encouraging only: it counts what worked.
export interface SessionSummary {
  practised: number; // different tasks tried
  cleanFirstTry: number; // tasks that were right on the first try every time
  trainingsDone: string[]; // titles of trainings played to the end
  toRepeat: string[]; // titles of trainings with tasks that were wrong more often than right (at most 3)
}

export function summarize(p: ProgressData, trainings: Training[]): SessionSummary {
  const recs = Object.entries(p.items);
  const titleOfItem = new Map(trainings.flatMap((t) => t.items.map((i) => [i.id, t.title] as const)));
  const hard = new Map<string, number>();
  for (const [id, r] of recs) {
    const title = titleOfItem.get(id);
    if (title && r.wrong > r.right) hard.set(title, (hard.get(title) ?? 0) + 1);
  }
  return {
    practised: recs.length,
    cleanFirstTry: recs.filter(([, r]) => r.wrong === 0 && r.right > 0).length,
    trainingsDone: trainings.filter((t) => p.trainings[t.id]?.done).map((t) => t.title),
    toRepeat: [...hard.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t),
  };
}
