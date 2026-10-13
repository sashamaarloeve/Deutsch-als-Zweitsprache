import type { Item, Training } from '../content/types';
import type { ProgressData } from './progress';
import { shuffle } from './check';

// "Quick practice": a mix of items the learner got wrong, has not seen, or has not seen for a while.
// Simple on purpose, so a teacher can read and change it. Higher score = practise sooner.
export function priority(p: ProgressData, itemId: string, now: number): number {
  const rec = p.items[itemId];
  if (!rec) return 2; // never seen
  const net = rec.wrong - rec.right;
  const days = (now - rec.lastSeen) / 86_400_000;
  return Math.max(0, net) + Math.min(days, 7) / 7;
}

export function pickQuickPractice(trainings: Training[], p: ProgressData, count = 8, now = Date.now()): Item[] {
  // free writing is too long for a quick round
  const all = trainings.flatMap((t) => t.items).filter((i) => i.type !== 'free-writing');
  const scored = shuffle(all).map((i) => ({ i, s: priority(p, i.id, now) }));
  scored.sort((a, b) => b.s - a.s);
  return shuffle(scored.slice(0, count).map((x) => x.i));
}
