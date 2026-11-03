// Direct links to a training: "#/adjektiv-endungen" opens the explanation, "#/adjektiv-endungen/trainieren" the exercises.
// The link is only an address; nothing is saved anywhere.
export type LinkMode = 'understand' | 'practice';

export function parseTrainingHash(hash: string): { id: string; mode: LinkMode } | null {
  const m = /^#\/([a-z0-9-]+)(?:\/(verstehen|trainieren))?\/?$/.exec(hash);
  if (!m) return null;
  return { id: m[1], mode: m[2] === 'trainieren' ? 'practice' : 'understand' };
}

export const trainingHash = (id: string, mode: LinkMode) => `#/${id}${mode === 'practice' ? '/trainieren' : ''}`;
