import { parse } from 'yaml';

// The "Kalender" tab is filled from content/kalender.yaml: a loose lesson plan.
// Every entry connects one day (year-month-day) with trainings and an optional note.
export interface PlanEntry {
  date: string; // 2026-11-10
  note: string;
  ids: string[];
}

export const isDayKey = (s: unknown): s is string => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d; // rejects 2026-02-31
};

// Entries with a wrong date are skipped here (the content check reports them); the same day twice is merged.
export function parsePlan(raw: string): PlanEntry[] {
  const list = parse(raw);
  const byDate = new Map<string, PlanEntry>();
  for (const e of Array.isArray(list) ? list : []) {
    // the yaml parser may turn an unquoted date into a Date object: use its year-month-day
    const key = e?.date instanceof Date ? e.date.toISOString().slice(0, 10) : e?.date;
    if (!isDayKey(key)) continue;
    const ids = Array.isArray(e.trainings) ? e.trainings.filter((x: unknown): x is string => typeof x === 'string') : [];
    const old = byDate.get(key);
    byDate.set(key, {
      date: key,
      note: [old?.note, typeof e.note === 'string' ? e.note : ''].filter(Boolean).join(' '),
      ids: [...(old?.ids ?? []), ...ids.filter((x: string) => !old?.ids.includes(x))],
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Problems for the content check: wrong dates, unknown trainings, days that appear twice.
export function planProblems(raw: string, knownIds: Set<string>): string[] {
  const list = parse(raw);
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const [i, e] of (Array.isArray(list) ? list : []).entries()) {
    const key = e?.date instanceof Date ? e.date.toISOString().slice(0, 10) : e?.date;
    if (!isDayKey(key)) problems.push(`kalender.yaml: entry ${i + 1} has no valid date (write it as 2026-11-10).`);
    else if (seen.has(key)) problems.push(`kalender.yaml: the day ${key} appears twice. Put all trainings of a day into one entry.`);
    else seen.add(key);
    for (const id of Array.isArray(e?.trainings) ? e.trainings : []) if (!knownIds.has(id)) problems.push(`kalender.yaml: ${key}: there is no training called "${id}".`);
  }
  return problems;
}

// Adds entries (for example the ones made with the "Zum Kalender hinzufügen" button) to a plan: same days are merged, no training twice.
export function mergePlans(base: PlanEntry[], extra: PlanEntry[]): PlanEntry[] {
  const byDate = new Map<string, PlanEntry>(base.map((e): [string, PlanEntry] => [e.date, { ...e, ids: [...e.ids] }]));
  for (const e of extra) {
    const old = byDate.get(e.date);
    if (!old) byDate.set(e.date, { ...e, ids: [...e.ids] });
    else {
      old.ids.push(...e.ids.filter((id) => !old.ids.includes(id)));
      if (e.note && !old.note.includes(e.note)) old.note = [old.note, e.note].filter(Boolean).join(' ');
    }
  }
  return [...byDate.values()].filter((e) => e.ids.length > 0 || e.note).sort((a, b) => a.date.localeCompare(b.date));
}

// The whole content of kalender.yaml for a plan, to be pasted into the file.
export const PLAN_HEADER = `# The "Kalender" tab: a loose lesson plan. Connect a day with trainings and an optional note.
# Write the date as year-month-day (2026-11-10). Use the id of a training (the file name without .yaml).
# A day can appear only once.
`;
export function planToYaml(plan: PlanEntry[]): string {
  const entries = plan.map((e) => [`- date: ${e.date}`, ...(e.note ? [`  note: ${JSON.stringify(e.note)}`] : []), ...(e.ids.length ? ['  trainings:', ...e.ids.map((id) => `    - ${id}`)] : [])].join('\n'));
  return PLAN_HEADER + (entries.length ? '\n' + entries.join('\n\n') + '\n' : '');
}
