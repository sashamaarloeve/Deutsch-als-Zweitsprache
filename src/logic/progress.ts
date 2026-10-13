// Results exist only while the page is open (nothing is saved, no accounts).
// Quick practice uses them to repeat mistakes first within the same session.
export interface ItemRecord {
  right: number;
  wrong: number;
  lastSeen: number;
}
export interface TrainingRecord {
  done: boolean;
  best: number; // best score as percent
}
export interface ProgressData {
  points: number;
  items: Record<string, ItemRecord>;
  trainings: Record<string, TrainingRecord>;
}

export const emptyProgress = (): ProgressData => ({ points: 0, items: {}, trainings: {} });

export type Outcome = 'first-try' | 'after-retry' | 'wrong';

export function recordResult(p: ProgressData, itemId: string, outcome: Outcome, now = Date.now()): ProgressData {
  const old = p.items[itemId] ?? { right: 0, wrong: 0, lastSeen: 0 };
  const rec = {
    right: old.right + (outcome === 'wrong' ? 0 : 1),
    wrong: old.wrong + (outcome === 'first-try' ? 0 : 1),
    lastSeen: now,
  };
  const pts = outcome === 'first-try' ? 2 : outcome === 'after-retry' ? 1 : 0;
  return { ...p, points: p.points + pts, items: { ...p.items, [itemId]: rec } };
}

export function recordTraining(p: ProgressData, id: string, percent: number): ProgressData {
  const old = p.trainings[id];
  return { ...p, trainings: { ...p.trainings, [id]: { done: true, best: Math.max(old?.best ?? 0, percent) } } };
}

export const addPoints = (p: ProgressData, n: number): ProgressData => ({ ...p, points: p.points + n });
