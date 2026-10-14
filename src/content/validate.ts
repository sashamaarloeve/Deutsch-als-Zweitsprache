import { buildPieces, parseBuildSolution } from '../logic/check';
import { richProblems } from './rich';
import type { Articles, Block, ConjVerb, Item, LessonTraining, PerfektTraining, Training } from './types';

const sorted = (a: string[]) => [...a].sort().join('|');

// Checks that apply to every kind of item. Returns plain-English problems.
function checkItems(items: Item[], concepts: Record<string, string>, texts: Map<string, string> = new Map()): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const item of items ?? []) {
    const w = `Item "${item.id}"`;
    if (seen.has(item.id)) problems.push(`${w}: id is used twice. Ids must be unique.`);
    seen.add(item.id);
    if (!item.concepts?.length) problems.push(`${w}: add at least one concept.`);
    if (item.textId && !texts.has(item.textId)) problems.push(`${w}: the reading text "${item.textId}" does not exist (see texts).`);
    for (const c of item.concepts ?? []) {
      if (!(c in concepts)) problems.push(`${w}: concept "${c}" is not listed in content/concepts.yaml.`);
    }
    switch (item.type) {
      case 'build-from-pieces':
        if (item.pieces.length < 2) problems.push(`${w}: needs at least 2 pieces.`);
        break;
      case 'multiple-choice':
        if (item.wrong.length < 2) problems.push(`${w}: needs at least 2 wrong options.`);
        if (item.wrong.includes(item.right)) problems.push(`${w}: a wrong option equals the right answer.`);
        break;
      case 'sentence-order':
        if (!item.accept.length) problems.push(`${w}: needs at least one accepted answer.`);
        for (const a of item.accept) {
          if (sorted(a) !== sorted(item.words)) problems.push(`${w}: an accepted answer does not use exactly the same words as the tiles.`);
        }
        break;
      case 'pick': {
        if (item.options.length < 2) problems.push(`${w}: needs at least 2 options.`);
        if (new Set(item.options).size !== item.options.length) problems.push(`${w}: two options are identical.`);
        if (!item.options.includes(item.answer)) problems.push(`${w}: the right answer "${item.answer}" is not among the options.`);
        if (item.sentence && !item.sentence.includes('___')) problems.push(`${w}: the sentence needs a gap written as ___.`);
        for (const t of [item.sentence, item.explanation, item.example, item.instruction]) problems.push(...richProblems(t ?? '').map((p) => `${w}: ${p}`));
        if (item.inText) {
          const text = texts.get(item.textId ?? '') ?? '';
          for (const o of item.options) if (!text.includes(o)) problems.push(`${w}: the option "${o}" is not a sentence of the text.`);
        }
        break;
      }
      case 'short-answer':
        if (!item.accept?.length) problems.push(`${w}: needs at least one accepted answer.`);
        if (!item.prompt?.trim()) problems.push(`${w}: needs a question.`);
        break;
      case 'pairs': {
        if (item.pairs.length < 2) problems.push(`${w}: needs at least 2 pairs.`);
        const lefts = item.pairs.map((p) => p[0]);
        if (new Set(lefts).size !== lefts.length) problems.push(`${w}: two left-hand words are identical.`);
        break;
      }
      case 'boxes': {
        if (!item.solutions.length) problems.push(`${w}: needs at least one solution.`);
        if (item.roles) {
          if (item.roles.length !== item.chunks.length) problems.push(`${w}: needs one role code per chunk.`);
          for (const r of item.roles) if (!item.roleLabels?.[r]) problems.push(`${w}: role "${r}" has no label (roleLabels).`);
        }
        for (const sol of item.solutions) {
          if (sol.length !== item.boxes.length) problems.push(`${w}: a solution must list every box (use [] for an empty box).`);
          if (sorted(sol.flat()) !== sorted(item.chunks)) problems.push(`${w}: a solution does not use exactly the chunks that are offered.`);
        }
        break;
      }
      case 'sentence-build': {
        if (!item.accept.length) problems.push(`${w}: needs at least one solution.`);
        const first = item.accept[0] ? buildPieces(parseBuildSolution(item.accept[0])) : [];
        for (const sol of item.accept) {
          problems.push(...richProblems(sol).map((p) => `${w}: ${p}`));
          if (sorted(buildPieces(parseBuildSolution(sol))) !== sorted(first)) problems.push(`${w}: a solution does not use exactly the same pieces.`);
        }
        for (const e of item.extras) if (first.includes(e)) problems.push(`${w}: the wrong tile "${e}" is also a real piece. Use a different wrong tile.`);
        break;
      }
      case 'gaps':
        for (const [k, g] of item.gaps.entries()) {
          if (!item.sentence.includes(`{${k}}`)) problems.push(`${w}: the sentence has no gap {${k}}.`);
          if (!g.options.includes(g.answer)) problems.push(`${w}: the answer "${g.answer}" of gap ${k} is not among its options.`);
          if (g.options.length < 2) problems.push(`${w}: gap ${k} needs at least 2 options.`);
        }
        break;
      case 'free-writing':
        for (const d of item.detect ?? []) {
          try { new RegExp(d.pattern, 'iu'); } catch { problems.push(`${w}: the pattern "${d.pattern}" is not valid.`); }
        }
        if (!item.words.length) problems.push(`${w}: needs a word list.`);
        if (!item.model.trim()) problems.push(`${w}: needs an example text.`);
        break;
    }
  }
  return problems;
}

function validatePerfekt(t: PerfektTraining, concepts: Record<string, string>): string[] {
  const problems: string[] = [];
  const where = `Training "${t.id}"`;
  for (const c of t.subKlammer?.conjunctions ?? []) {
    if (!t.subKlammer.openers[c]) problems.push(`${where}: subordinate-clause lab has no opening sentence for "${c}".`);
  }
  const infs = new Set<string>();
  const parts = new Set((t.verbs ?? []).map((v) => v.part));
  for (const v of t.verbs ?? []) {
    const w = `Verb "${v.inf}"`;
    if (infs.has(v.inf)) problems.push(`${w}: appears twice in the verb list.`);
    infs.add(v.inf);
    if (!['haben', 'sein'].includes(v.aux)) problems.push(`${w}: aux must be haben or sein.`);
    if (!['reg', 'irr', 'trenn', 'ohne'].includes(v.type)) problems.push(`${w}: unknown type "${v.type}".`);
    if (!v.fakes || v.fakes.length !== 2) problems.push(`${w}: needs exactly 2 wrong forms (fakes) for the speed round.`);
    for (const f of v.fakes ?? []) {
      if (f === v.part) problems.push(`${w}: wrong form "${f}" is actually the right answer.`);
      else if (parts.has(f)) problems.push(`${w}: wrong form "${f}" is a correct Partizip II of another verb.`);
    }
    if (v.type === 'trenn' && !v.pieces.some((p) => p.r === 'pre')) problems.push(`${w}: type is separable but there is no prefix piece.`);
    if (v.aux === 'sein' && !v.why) problems.push(`${w}: a sein verb needs a reason (why: move, change, exc or event).`);
  }
  return [...problems, ...checkItems(t.items, concepts)];
}

const TOKENS = ['S', 'V', 'O', 'T', 'Q', 'Z'];

const GENDER_IDS = ['m', 'f', 'n', 'pl'];

function validateArticles(articles: Articles | undefined): string[] {
  const problems: string[] = [];
  for (const [kind, set] of Object.entries(articles ?? {})) {
    for (const c of ['nom', 'akk', 'dat', 'gen'] as const) {
      const list = set[c];
      if (list && list.length !== 4) problems.push(`Articles "${kind}": "${c}" needs four forms (masculine, feminine, neuter, plural).`);
    }
    if (!set.nom || !set.akk) problems.push(`Articles "${kind}": needs at least nom and akk.`);
  }
  return problems;
}

function validateBlock(b: Block, i: number, bank: Map<string, ConjVerb>, articles: Articles | undefined, wordIds: Set<string> = new Set()): string[] {
  const w = `Understand block ${i + 1} (${b.type})`;
  const problems: string[] = [];
  const rich = (t: string) => problems.push(...richProblems(t).map((p) => `${w}: ${p}`));
  switch (b.type) {
    case 'text':
    case 'rule':
      if (!b.body?.length) problems.push(`${w}: has no text.`);
      b.body?.forEach(rich);
      break;
    case 'detective':
      for (const s of b.sentences ?? []) {
        for (const p of s.parts) {
          if (!b.roles?.[p.r]) problems.push(`${w}: part "${p.t}" has an unknown role "${p.r}".`);
          if (!p.q) problems.push(`${w}: part "${p.t}" needs a question (q).`);
        }
      }
      break;
    case 'word-list':
      for (const id of b.words ?? []) if (!wordIds.has(id)) problems.push(`${w}: the word "${id}" is not in the words list.`);
      if (!b.words?.length) problems.push(`${w}: has no words.`);
      break;
    case 'table':
      if (!b.head?.length || !b.rows?.length) problems.push(`${w}: needs head and rows.`);
      for (const r of b.rows ?? []) if (r.length !== b.head.length) problems.push(`${w}: a row has ${r.length} cells, the head has ${b.head.length}.`);
      break;
    case 'dialogue':
      if (!b.lines?.length) problems.push(`${w}: has no lines.`);
      b.lines?.forEach((l) => rich(l.say));
      break;
    case 'conjugation':
      for (const inf of b.verbs ?? []) if (!bank.has(inf)) problems.push(`${w}: verb "${inf}" is not in the verb list.`);
      break;
    case 'article-table':
    case 'case-lab': {
      for (const k of b.kinds ?? []) if (!articles?.[k]) problems.push(`${w}: article kind "${k}" is not in the articles list.`);
      const cases = b.cases ?? [];
      for (const c of cases) for (const k of b.kinds ?? []) if (!articles?.[k]?.[c.id]) problems.push(`${w}: "${k}" has no forms for the case "${c.id}".`);
      if (b.type === 'case-lab') {
        for (const c of b.cases) {
          for (const f of Array.isArray(c.frame) ? c.frame : [c.frame]) if (!f.includes('___')) problems.push(`${w}: frame "${f}" needs a gap written as ___.`);
          rich(c.rule);
        }
        for (const n of b.nouns ?? []) if (!GENDER_IDS.includes(n.g)) problems.push(`${w}: noun "${n.noun}" has an unknown gender "${n.g}".`);
      }
      break;
    }
    case 'clause-lab': {
      if (b.orders?.length !== 2 || b.rules?.length !== 2) problems.push(`${w}: needs two orders and two rules.`);
      b.rules?.forEach(rich);
      if (!b.sentences?.length) problems.push(`${w}: has no sentences.`);
      for (const s of b.sentences ?? []) {
        if (!s.conj) problems.push(`${w}: every sentence needs a conjunction (conj).`);
        for (const t of [s.main, s.mainAfter ?? s.main, s.sub]) rich(t);
        if (!s.main?.includes('<v>') || (s.mainAfter !== undefined && !s.mainAfter.includes('<v>'))) problems.push(`${w}: "${s.main}" needs its verb marked with <v>.`);
        if (!s.sub?.includes('<s>')) problems.push(`${w}: "${s.sub}" needs its verb at the end marked with <s>.`);
      }
      break;
    }
    case 'parts-lab': {
      for (const s of b.sentences ?? []) {
        const text = s.parts.map((p) => p.t).join(' ');
        if (s.parts.filter((p) => p.r === 'V').length !== 1) problems.push(`${w}: "${text}" needs exactly one verb part (V).`);
        for (const p of s.parts) if (!b.roles?.[p.r]) problems.push(`${w}: part "${p.t}" has an unknown role "${p.r}".`);
        for (const st of s.starts) if (!s.parts.some((p) => p.r === st)) problems.push(`${w}: "${text}" has no part with the role "${st}" to start with.`);
      }
      break;
    }
    case 'bracket-lab': {
      if (b.boxLabels?.length !== 4) problems.push(`${w}: needs exactly 4 box labels (Position 1, Verb, Mittelfeld, Ende).`);
      const separable = b.actions.length > 0 && b.actions.every((a) => a.lead);
      if (!separable) {
        for (const l of b.leads ?? []) if (!bank.has(l)) problems.push(`${w}: verb "${l}" is not in the verb list.`);
        for (const a of b.actions ?? []) if (!a.inf) problems.push(`${w}: every action needs an infinitive (inf) or a lead verb.`);
      }
      for (const a of b.actions ?? []) {
        if (a.lead && !bank.get(a.lead)?.prefix) problems.push(`${w}: "${a.lead}" needs a prefix in the verb list.`);
        if (!a.comp) problems.push(`${w}: every action needs a rest of the sentence (comp).`);
      }
      for (const m of b.modes ?? []) {
        if (m.boxes.length !== 4) problems.push(`${w}: mode "${m.id}" needs 4 boxes.`);
        for (const tok of m.boxes.flat()) if (!TOKENS.includes(tok)) problems.push(`${w}: mode "${m.id}" uses the unknown token "${tok}" (allowed: ${TOKENS.join(' ')}).`);
        if (m.boxes.flat().includes('T') && !b.starts?.length) problems.push(`${w}: mode "${m.id}" needs time words under "starts".`);
        rich(m.rule);
      }
      break;
    }
    case 'sentence-lab': {
      if (b.boxLabels?.length !== 4) problems.push(`${w}: needs exactly 4 box labels (Position 1, Verb, Mittelfeld, Rest).`);
      for (const v of b.verbs ?? []) if (!bank.has(v.inf)) problems.push(`${w}: verb "${v.inf}" is not in the verb list.`);
      for (const m of b.modes ?? []) {
        if (m.boxes.length !== 4) problems.push(`${w}: mode "${m.id}" needs 4 boxes.`);
        for (const tok of m.boxes.flat()) if (!TOKENS.includes(tok)) problems.push(`${w}: mode "${m.id}" uses the unknown token "${tok}" (allowed: ${TOKENS.join(' ')}).`);
        if (m.boxes.flat().includes('T') && !b.starts?.length) problems.push(`${w}: mode "${m.id}" needs time words under "starts".`);
        rich(m.rule);
      }
      break;
    }
  }
  return problems;
}

function validateLesson(t: LessonTraining, concepts: Record<string, string>): string[] {
  const problems: string[] = [];
  const bank = new Map<string, ConjVerb>();
  for (const v of t.verbs ?? []) {
    const w = `Verb "${v.inf}"`;
    if (bank.has(v.inf)) problems.push(`${w}: appears twice in the verb list.`);
    bank.set(v.inf, v);
    if (v.forms.length !== 6 || v.forms.some((f) => !f)) problems.push(`${w}: needs six forms (ich, du, er/sie/es, wir, ihr, sie/Sie).`);
    if (v.stem && v.endings?.length !== 6) problems.push(`${w}: needs six endings.`);
    if (v.alt && !v.altAt?.length) problems.push(`${w}: a changed stem (alt) needs altAt, for example [1, 2].`);
    if (v.alt && v.altAt?.some((p) => p < 0 || p > 5)) problems.push(`${w}: altAt must contain persons 0 to 5.`);
    if (v.prefix && !v.inf.startsWith(v.prefix)) problems.push(`${w}: the infinitive should start with the prefix "${v.prefix}".`);
  }
  problems.push(...validateArticles(t.articles));
  const wordIds = new Set<string>();
  for (const x of t.words ?? []) {
    const w = `Word "${x.id}"`;
    if (wordIds.has(x.id)) problems.push(`${w}: id is used twice.`);
    wordIds.add(x.id);
    if (!x.word || !x.meaning || !x.ex) problems.push(`${w}: needs word, meaning and ex.`);
    if (!/<c>.+<\/c>/.test(x.ex ?? '')) problems.push(`${w}: the example must mark the word with <c>…</c>.`);
    problems.push(...richProblems(x.ex ?? '').map((p) => `${w}: ${p}`));
    if (x.art && x.art !== 'pl' && !x.pl && !x.noPlural) problems.push(`${w}: a noun needs its plural (pl) or noPlural: true.`);
  }
  const textMap = new Map<string, string>();
  for (const x of t.texts ?? []) {
    if (textMap.has(x.id)) problems.push(`Reading text "${x.id}": id is used twice.`);
    if (!x.paragraphs?.length) problems.push(`Reading text "${x.id}": has no paragraphs.`);
    textMap.set(x.id, (x.paragraphs ?? []).join(' ').replace(/\s+/g, ' '));
  }
  (t.understand ?? []).forEach((b, i) => problems.push(...validateBlock(b, i, bank, t.articles, wordIds)));
  if (!t.sets?.length) problems.push(`Training "${t.id}": has no practice sets.`);
  for (const s of t.sets ?? []) {
    if (!s.title) problems.push(`Practice set "${s.id}": needs a title.`);
    if (s.kind && !t.words?.length) problems.push(`Practice set "${s.id}": cards and memory need a words list.`);
    if (!s.itemIds.length && !s.kind) problems.push(`Practice set "${s.id}": has no items.`);
  }
  return [...problems, ...checkItems(t.items, concepts, textMap)];
}

// Returns a list of plain-English problems. Empty list = content is fine.
export function validateTraining(t: Training, concepts: Record<string, string>): string[] {
  const problems: string[] = [];
  const where = `Training "${t.id}"`;
  if (!t.id || !t.title) problems.push(`${where}: id and title are required.`);
  if (!['A0', 'A1', 'A2', 'B1'].includes(t.level)) problems.push(`${where}: level must be A0, A1, A2 or B1.`);
  if (!t.canDo?.length) problems.push(`${where}: add at least one can-do goal.`);
  if (!t.items?.length) problems.push(`${where}: has no items.`);
  problems.push(...(t.kind === 'lesson' ? validateLesson(t, concepts) : validatePerfekt(t, concepts)));
  if (t.status === 'reviewed' && problems.length) problems.push(`${where}: cannot be "reviewed" while it has problems.`);
  return problems;
}
