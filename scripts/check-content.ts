// Run with: npm run check-content
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { bilingualProblems, parseTraining } from '../src/content/expand';
import { validateTraining } from '../src/content/validate';

const concepts = parse(readFileSync('content/concepts.yaml', 'utf8')) as Record<string, string>;
const dir = 'content/trainings';
let problems: string[] = [];
const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));
for (const f of files) {
  const main = readFileSync(`${dir}/${f}`, 'utf8');
  const isLesson = (parse(main) as { kind?: string }).kind === 'lesson';
  // lesson trainings hold English and German side by side; Perfekt has a separate German file
  const overlayPath = `${dir}/de/${f}`;
  const overlay = existsSync(overlayPath) ? readFileSync(overlayPath, 'utf8') : undefined;
  if (isLesson) problems = problems.concat(bilingualProblems(parse(main)).map((p) => `${f}: ${p}`));
  else if (!overlay) problems.push(`${f}: no German version yet (content/trainings/de/${f}).`);
  for (const [label, lang] of [['English', 'en'], ['German', 'de']] as const) {
    const overlayProblems: string[] = [];
    const t = parseTraining(main, lang === 'de' ? overlay : undefined, overlayProblems, lang);
    problems = problems.concat(overlayProblems.map((p) => `${f}: ${p}`));
    problems = problems.concat(validateTraining(t, concepts).map((p) => `${f} (${label}): ${p}`));
  }
}
if (problems.length) {
  console.error('Content problems found:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(`Content OK: ${files.length} training file(s) checked in English and German.`);
