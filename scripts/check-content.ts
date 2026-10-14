// Run with: npm run check-content
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { parseTraining } from '../src/content/expand';
import { validateTraining } from '../src/content/validate';
import { parseAktuell } from '../src/content/aktuell';

const concepts = parse(readFileSync('content/concepts.yaml', 'utf8')) as Record<string, string>;
const dir = 'content/trainings';
const problems: string[] = [];
const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));
for (const f of files) {
  const t = parseTraining(readFileSync(`${dir}/${f}`, 'utf8'));
  problems.push(...validateTraining(t, concepts).map((p) => `${f}: ${p}`));
}
// every id in content/aktuell.yaml and content/archiv.yaml must be a real training, and none may be in both lists
const known = new Set(files.map((f) => f.replace(/\.yaml$/, '')));
const lists = (['aktuell', 'archiv'] as const).map((name) => ({ name, ids: parseAktuell(readFileSync(`content/${name}.yaml`, 'utf8')).ids }));
for (const { name, ids } of lists) {
  for (const id of ids) if (!known.has(id)) problems.push(`${name}.yaml: there is no training called "${id}".`);
}
for (const id of lists[0].ids) if (lists[1].ids.includes(id)) problems.push(`"${id}" is in aktuell.yaml and in archiv.yaml. Put it in only one of them.`);
if (problems.length) {
  console.error('Content problems found:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(`Content OK: ${files.length} training file(s) checked.`);
