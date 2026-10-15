import { parse } from 'yaml';
import { stripRich } from './rich';
import type {
  Articles,
  BoxesItem,
  CaseId,
  Gender,
  Tone,
  BuildItem,
  ChoiceItem,
  ConjVerb,
  ConvertItem,
  Item,
  LessonSet,
  LessonTraining,
  OrderItem,
  PairsItem,
  PerfektTraining,
  PickItem,
  ShortAnswerItem,
  GapsItem,
  VocabWord,
  SentenceBuildItem,
  PieceRole,
  RawVerb,
  Training,
  Verb,
  WritingItem,
} from './types';

export const AUXF = {
  haben: ['habe', 'hast', 'hat', 'hat', 'haben', 'habt', 'haben'],
  sein: ['bin', 'bist', 'ist', 'ist', 'sind', 'seid', 'sind'],
} as const;

const PREFIXES = ['auf', 'an', 'ein', 'mit', 'ab', 'fern', 'be', 'ver', 'er', 'ent'];
// Pool of wrong tiles for "build the word". Same idea as the prototype.
const TILE_POOL = ['ge', 't', 'en', 'et', 'be', 'ver', 'er', 'auf', 'an', 'ent'];

export function makeVerb(r: RawVerb): Verb {
  const p = r.pc.split('.');
  const pieces = p.map((x, i) => {
    let role: PieceRole = 'stem';
    if (x === 'ge') role = 'ge';
    else if (p.length > 1 && i === p.length - 1 && /^(t|et|en)$/.test(x)) role = 'end';
    else if (i === 0 && p.length > 1 && PREFIXES.includes(x)) role = 'pre';
    return { x, r: role };
  });
  return { ...r, pieces, part: p.join('') };
}

export function verbSentence(v: Verb, exceptions: Record<string, string>): string {
  return exceptions[v.inf] ?? `Er ${AUXF[v.aux][2]} ${v.part}.`;
}

const CONCEPT_BY_TYPE = {
  reg: 'perfekt.participle-regular',
  irr: 'perfekt.participle-irregular',
  trenn: 'perfekt.participle-separable',
  ohne: 'perfekt.participle-no-ge',
} as const;

// Turns the raw verb bank, sentences and puzzles into the items the exercise runner plays.
export function expandPerfekt(raw: Omit<PerfektTraining, 'items' | 'kind'>): PerfektTraining {
  const verbs = (raw.verbs as unknown as RawVerb[]).map(makeVerb);
  const items: Item[] = [];
  for (const v of verbs) {
    const sentence = verbSentence(v, raw.exceptions);
    const build: BuildItem = {
      id: `${raw.id}-build-${v.inf}`,
      type: 'build-from-pieces',
      concepts: [CONCEPT_BY_TYPE[v.type]],
      verb: v.inf,
      verbType: v.type,
      pieces: v.pieces.map((p) => p.x),
      roles: v.pieces.map((p) => p.r),
      extras: TILE_POOL.filter((x) => !v.pieces.some((p) => p.x === x)),
      hint: raw.partTypes[v.type].hint,
      example: sentence,
    };
    const choice: ChoiceItem = {
      id: `${raw.id}-aux-${v.inf}`,
      type: 'binary-choice',
      concepts: ['perfekt.aux-choice'],
      verb: v.inf,
      answer: v.aux,
      example: sentence,
      explanation: v.aux === 'sein' ? raw.why[v.why ?? 'move'] : raw.why.haben,
    };
    items.push(build, choice);
  }
  raw.conv.forEach((c, i) => {
    const item: ConvertItem = {
      id: `${raw.id}-conv-${String(i + 1).padStart(2, '0')}`,
      type: 'multiple-choice',
      concepts: ['perfekt.convert'],
      prompt: c.present,
      right: c.right,
      wrong: c.wrong,
      explanation: c.explanation,
    };
    items.push(item);
  });
  raw.puzzles.forEach((p, i) => {
    const item: OrderItem = {
      id: `${raw.id}-puzzle-${String(i + 1).padStart(2, '0')}`,
      type: 'sentence-order',
      concepts: ['perfekt.word-order'],
      words: p.words.split(' '),
      accept: p.accept.map((a) => a.split(' ')),
      end: p.end,
      explanation: p.end === '?' && /^(hast|bist|hat|ist)\b/.test(p.words) ? raw.orderRules.question : raw.orderRules.main,
    };
    items.push(item);
  });
  return { ...raw, kind: 'perfekt', verbs, items };
}

export const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'] as const;
// the pronoun used at the start of a sentence for each person
export const SUBJECT_WORD = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'] as const;

// Stem used for one person: the changed stem (sprich-) for du and er/sie/es of vowel-change verbs.
export const stemFor = (v: ConjVerb, person: number) => (v.alt && v.altAt?.includes(person) ? v.alt : v.stem!);

export function makeConjVerb(v: Omit<ConjVerb, 'forms'> & { forms?: string[] }): ConjVerb {
  if (v.stem && v.endings) {
    const full = { ...v, forms: [] as string[] };
    full.forms = v.endings.map((e, p) => stemFor(full, p) + e);
    return full;
  }
  return { ...v, forms: v.forms ?? [] };
}

// What the learner sees as the answer: the form, with the prefix at the end for separable verbs.
const display = (v: ConjVerb, p: number) => (v.prefix ? `${v.forms[p]} ${v.prefix}` : v.forms[p]);

// The correct form plus up to three other different forms of the same verb. Deterministic.
export function formOptions(forms: string[], person: number): string[] {
  const out = [forms[person]];
  for (let k = 1; k < forms.length && out.length < 4; k++) {
    const f = forms[(person + k) % forms.length];
    if (!out.includes(f)) out.push(f);
  }
  return out;
}

const FORM_ENDINGS_POOL = ['e', 'st', 't', 'en', 'et', 'est'];

/* ---- articles by case and gender ---- */
export const GENDERS: Gender[] = ['m', 'f', 'n', 'pl'];
export const TONES: Tone[] = ['der', 'die', 'das', 'pl'];
// A vocabulary word as the learner reads it: nouns with their article (die Mutter).
export const wordText = (w: VocabWord) => (w.art ? `${w.art === 'pl' ? 'die' : w.art} ${w.word}` : w.word);

export const gi = (g: Gender) => GENDERS.indexOf(g);
// wrong endings offered in adjective exercises, most typical first (never the right one)
const ADJ_ENDING_POOL = ['en', 'e', 'er', 'es', 'em'];
const CASE_NAMES: Record<string, string> = { nom: 'Nominativ', akk: 'Akkusativ', dat: 'Dativ', gen: 'Genitiv' };
const GENDER_NAMES: Record<Gender, string> = { m: 'maskulin', f: 'feminin', n: 'Neutrum', pl: 'Plural' };
const CASES: CaseId[] = ['nom', 'akk', 'dat', 'gen'];

// The answer first, then up to three wrong options. Definite articles: the forms of the SAME gender
// in other cases (der / den / dem), so learners never have to guess the gender. ein-words, mein-words
// and kein-words: the forms of the case, then of the other cases.
export function articleOptions(articles: Articles, kind: string, c: CaseId, g: Gender): string[] {
  const set = articles[kind];
  const cases = [c, ...CASES.filter((x) => x !== c)].filter((x) => set[x]);
  const out = [set[c]![gi(g)]];
  for (const k of cases) {
    const forms = kind === 'definite' ? [set[k]![gi(g)]] : set[k]!;
    for (const f of forms) if (f && !out.includes(f)) out.push(f);
  }
  return out.slice(0, 4);
}

/* ---- sentence parts ("ich/S lese/V ein_Buch/A") ---- */
export interface Part {
  t: string;
  r: string;
}
export const MITTELFELD_ORDER = ['S', 'T', 'D', 'A', 'L']; // usual order: subject, time, Dativ, Akkusativ, place
export function parseParts(s: string): Part[] {
  return s
    .split(' ')
    .filter(Boolean)
    .map((tok) => {
      const i = tok.lastIndexOf('/');
      return { t: tok.slice(0, i).replace(/_/g, ' '), r: tok.slice(i + 1) };
    });
}
// One arrangement per part that may stand in position 1: [position 1, verb, Mittelfeld, (end)].
export function partsArrangement(parts: Part[], start: string): string[][] {
  const verb = parts.find((p) => p.r === 'V')!;
  const end = parts.find((p) => p.r === 'E');
  const first = parts.find((p) => p.r === start)!;
  const middle = MITTELFELD_ORDER.filter((r) => r !== start)
    .map((r) => parts.find((p) => p.r === r))
    .filter((p): p is Part => !!p)
    .map((p) => p.t);
  return end ? [[first.t], [verb.t], middle, [end.t]] : [[first.t], [verb.t], middle];
}
export const possibleStarts = (parts: Part[]) => MITTELFELD_ORDER.filter((r) => parts.some((p) => p.r === r));

/* eslint-disable @typescript-eslint/no-explicit-any */
export function expandLesson(raw: any): LessonTraining {
  const verbs: ConjVerb[] = (raw.verbs ?? []).map(makeConjVerb);
  const bank = new Map(verbs.map((v) => [v.inf, v]));
  const allPrefixes = verbs.flatMap((v) => (v.prefix ? [v.prefix] : []));
  const items: Item[] = [];
  const sets: LessonSet[] = [];

  for (const set of raw.practice ?? []) {
    const ids: string[] = [];
    let n = 0;
    let currentText: string | undefined;
    const add = (item: Item) => {
      if (currentText) item.textId = currentText;
      items.push(item);
      ids.push(item.id);
    };
    for (const spec of set.items ?? []) {
      const concepts: string[] = spec.concepts ?? set.concepts ?? [];
      const instruction: string = spec.instruction ?? set.instruction ?? '';
      const nextId = () => `${raw.id}-${set.id}-${String(++n).padStart(2, '0')}`;
      const persons: number[] = spec.persons ?? [0, 1, 2, 3, 4, 5];
      currentText = spec.text ?? set.text;

      if (spec.type === 'forms-build') {
        for (const inf of spec.verbs as string[]) {
          const v = bank.get(inf);
          if (!v?.stem || !v.endings) continue;
          for (const p of persons) {
            const usedAlt = !!v.alt && !!v.altAt?.includes(p);
            const endingsPool = FORM_ENDINGS_POOL.filter((e) => e !== v.endings![p]);
            // wrong tiles that are typical mistakes: the other stem, a wrong prefix, then endings
            const extras: string[] = [];
            if (v.alt) extras.push(usedAlt ? v.stem : v.alt);
            if (v.prefix) extras.push(allPrefixes.find((x) => x !== v.prefix) ?? 'an');
            if (extras.length) extras.push(endingsPool[0]);
            else extras.push(...endingsPool);
            add({
              id: `${raw.id}-${set.id}-b-${inf}-p${p}`,
              type: 'build-from-pieces',
              promptKind: 'form',
              concepts,
              verb: `${PERSONS[p]} → ${inf}`,
              pieces: [stemFor(v, p), v.endings[p], ...(v.prefix ? [v.prefix] : [])],
              roles: [usedAlt ? 'alt' : 'stem', 'end', ...(v.prefix ? (['pre'] as const) : [])],
              extras,
              hint: spec.hint,
              example: `${PERSONS[p]} ${display(v, p)}`,
            } as BuildItem);
          }
        }
      } else if (spec.type === 'article-pick') {
        const arts = raw.articles as Articles;
        for (const it of spec.items as { g: Gender; noun: string; frame: string; explanation?: string }[]) {
          const set0 = arts[spec.kind];
          const tone = TONES[gi(it.g)];
          add({
            id: nextId(),
            type: 'pick',
            concepts,
            instruction,
            prompt: `(<${tone}>${arts.definite.nom[gi(it.g)]}</${tone}> ${it.noun})`,
            sentence: it.frame,
            options: articleOptions(arts, spec.kind, spec.case, it.g),
            answer: set0[spec.case as CaseId]![gi(it.g)],
            explanation: it.explanation ?? spec.explanation ?? set.explanation ?? '',
            tone,
          } as PickItem);
        }
      } else if (spec.type === 'adj-pick') {
        const arts = raw.articles as Articles;
        const endings = raw.adjectiveEndings as Record<string, Record<string, string[]>>;
        const forms = endings?.[spec.kind]?.[spec.case];
        if (!forms || !arts?.[spec.kind]?.[spec.case as CaseId]) throw new Error(`adj-pick in "${set.id}": no articles or endings for ${spec.kind} / ${spec.case}.`);
        for (const it of spec.items as { g: Gender; adj: string; noun: string; frame: string; explanation?: string }[]) {
          const e = forms[gi(it.g)];
          const art = arts[spec.kind][spec.case as CaseId]![gi(it.g)];
          const phrase = `${art ? art + ' ' : ''}___ ${it.noun}`;
          const wrong = ADJ_ENDING_POOL.filter((x) => x !== e).slice(0, 2);
          add({
            id: nextId(),
            type: 'pick',
            concepts,
            instruction,
            prompt: `(${it.adj})`,
            sentence: it.frame.replace('{}', phrase),
            options: [it.adj + e, ...wrong.map((x) => it.adj + x)],
            answer: it.adj + e,
            explanation: `${CASE_NAMES[spec.case] ?? spec.case} ${GENDER_NAMES[it.g]}, ${art ? `nach „${art}“` : 'ohne Artikel'}: Endung -${e}.${it.explanation ? ' ' + it.explanation : ''}`,
            tone: TONES[gi(it.g)],
          } as PickItem);
        }
      } else if (spec.type === 'parts-boxes') {
        const parts = parseParts(spec.parts);
        const hasEnd = parts.some((p) => p.r === 'E');
        const starts: string[] = spec.starts ?? possibleStarts(parts);
        add({
          id: nextId(),
          type: 'boxes',
          concepts,
          instruction,
          boxes: set.boxes,
          chunks: parts.map((p) => p.t),
          roles: parts.map((p) => p.r),
          roleLabels: set.roleLabels,
          // pad with empty boxes when the sentence has no verb end but the set has a box for it
          solutions: starts.map((st) => {
            const sol = partsArrangement(parts, st);
            while (sol.length < (set.boxes?.length ?? sol.length)) sol.push([]);
            return sol;
          }),
          end: spec.end ?? '.',
          markLast: hasEnd,
          explanation: spec.explanation ?? set.explanation ?? '',
        } as BoxesItem);
      } else if (spec.type === 'parts-order') {
        const parts = parseParts(spec.parts);
        const arrangement = partsArrangement(parts, spec.start ?? 'S').flat();
        add({
          id: nextId(),
          type: 'sentence-order',
          concepts,
          instruction,
          words: parts.map((p) => p.t),
          accept: [arrangement],
          end: spec.end ?? '.',
          explanation: spec.explanation ?? set.explanation ?? '',
        } as OrderItem);
      } else if (spec.type === 'forms-sentence') {
        for (const inf of spec.verbs as string[]) {
          const v = bank.get(inf);
          if (!v?.stem || !v.endings || !v.comp) continue;
          for (const p of persons) {
            const usedAlt = !!v.alt && !!v.altAt?.includes(p);
            const endingsPool = FORM_ENDINGS_POOL.filter((e) => e !== v.endings![p]);
            const extras: string[] = [];
            if (v.alt) extras.push(usedAlt ? v.stem : v.alt);
            if (v.prefix) extras.push(allPrefixes.find((x) => x !== v.prefix) ?? 'an');
            extras.push(endingsPool[0]);
            const verbWord = `<v>${stemFor(v, p)}|${v.endings[p]}</v>`;
            const second = v.prefix ? ` <s>${v.prefix}</s>` : '';
            add({
              id: `${raw.id}-${set.id}-s-${inf}-p${p}`,
              type: 'sentence-build',
              concepts,
              instruction,
              accept: [`${SUBJECT_WORD[p]} ${verbWord} ${v.comp.replace(/ /g, '_')}${second}`],
              extras,
              end: '.',
              hint: spec.hint,
              explanation: spec.explanation ?? set.explanation ?? '',
            } as SentenceBuildItem);
          }
        }
      } else if (spec.type === 'sentence-build') {
        add({
          id: nextId(),
          type: 'sentence-build',
          concepts,
          instruction,
          accept: spec.accept,
          extras: spec.extras ?? [],
          end: spec.end ?? '.',
          hint: spec.hint ?? '',
          explanation: spec.explanation ?? set.explanation ?? '',
        } as SentenceBuildItem);
      } else if (spec.type === 'forms-pick') {
        for (const inf of spec.verbs as string[]) {
          const v = bank.get(inf);
          if (!v) continue;
          for (const p of persons) {
            add({
              id: `${raw.id}-${set.id}-k-${inf}-p${p}`,
              type: 'pick',
              concepts,
              instruction,
              prompt: `${PERSONS[p]} → ${inf}`,
              options: formOptions(v.forms.map((_, k) => display(v, k)), p),
              answer: display(v, p),
              explanation: spec.explanation,
              example: `${PERSONS[p]} <v>${v.forms[p]}</v>${v.prefix ? ` <s>${v.prefix}</s>` : ''}`,
            } as PickItem);
          }
        }
      } else if (spec.type === 'pick-form') {
        const v = bank.get(spec.verb);
        const answer = v?.forms[spec.person];
        add({
          id: nextId(),
          type: 'pick',
          concepts,
          instruction,
          prompt: `(${spec.verb})`,
          sentence: spec.sentence,
          options: spec.options ?? (v ? formOptions(v.forms, spec.person) : []),
          answer: answer ?? '',
          explanation: spec.explanation ?? set.explanation ?? '',
        } as PickItem);
      } else if (spec.type === 'pick') {
        add({ id: nextId(), type: 'pick', concepts, instruction, prompt: spec.prompt ?? '', sentence: spec.sentence, options: spec.options, answer: spec.answer, explanation: spec.explanation ?? set.explanation ?? '', inText: spec.inText ?? set.inText } as PickItem);
      } else if (spec.type === 'words-pairs') {
        // groups of about `size` words, each group is one matching exercise
        const ws = (spec.ids as string[]).map((id) => (raw.words as VocabWord[]).find((x) => x.id === id)).filter((x): x is VocabWord => !!x);
        const size: number = spec.size ?? 5;
        const groups = Math.max(1, Math.round(ws.length / size));
        for (let g = 0; g < groups; g++) {
          const part = ws.filter((_, k) => k % groups === g);
          add({ id: nextId(), type: 'pairs', concepts, instruction, pairs: part.map((x) => [wordText(x), x.meaning]), explanation: spec.explanation ?? set.explanation } as PairsItem);
        }
      } else if (spec.type === 'words-write') {
        for (const id of spec.ids as string[]) {
          const x = (raw.words as VocabWord[]).find((y) => y.id === id);
          if (!x) continue;
          const plural = x.art && x.pl ? ` (Plural: die ${x.pl})` : '';
          add({ id: nextId(), type: 'short-answer', concepts, instruction, prompt: x.meaning, accept: [...new Set([wordText(x), x.word, ...[...x.ex.matchAll(/<c>(.*?)<\/c>/g)].map((m) => m[1])])], explanation: `${wordText(x)}${plural}. ${stripRich(x.ex)}` } as ShortAnswerItem);
        }
      } else if (spec.type === 'short-answer') {
        add({ id: nextId(), type: 'short-answer', concepts, instruction, prompt: spec.prompt, accept: spec.accept, explanation: spec.explanation ?? '' } as ShortAnswerItem);
      } else if (spec.type === 'pairs') {
        add({ id: nextId(), type: 'pairs', concepts, instruction, pairs: spec.pairs, explanation: spec.explanation } as PairsItem);
      } else if (spec.type === 'boxes') {
        add({
          id: nextId(),
          type: 'boxes',
          concepts,
          instruction,
          boxes: set.boxes ?? spec.boxes,
          chunks: spec.chunks,
          solutions: spec.solutions,
          end: spec.end ?? '.',
          markLast: spec.markLast ?? set.markLast ?? false,
          roles: spec.roles,
          roleLabels: spec.roleLabels ?? set.roleLabels,
          explanation: spec.explanation ?? set.explanation ?? '',
        } as BoxesItem);
      } else if (spec.type === 'sentence-order') {
        add({
          id: nextId(),
          type: 'sentence-order',
          concepts,
          instruction: instruction || undefined,
          // an underscore joins the words of one tile: im_Supermarkt
          words: spec.words.split(' ').map((w: string) => w.replace(/_/g, ' ')),
          accept: (spec.accept as string[]).map((a) => a.split(' ').map((w) => w.replace(/_/g, ' '))),
          end: spec.end ?? '.',
          explanation: spec.explanation ?? set.explanation ?? '',
        } as OrderItem);
      } else if (spec.type === 'free-writing') {
        add({
          id: nextId(),
          type: 'free-writing',
          concepts,
          instruction,
          prompt: spec.task,
          words: spec.words,
          checklist: spec.checklist,
          model: spec.model,
          minSentences: spec.minSentences ?? 3,
          detect: spec.detect,
        } as WritingItem);
      } else if (spec.type === 'gaps') {
        add({ id: nextId(), type: 'gaps', concepts, instruction, sentence: spec.sentence, gaps: spec.gaps, explanation: spec.explanation ?? set.explanation ?? '' } as GapsItem);
      } else {
        throw new Error(`Unknown practice item type "${spec.type}" in set "${set.id}".`);
      }
    }
    sets.push({ id: set.id, title: set.title, shuffle: set.shuffle ?? true, count: set.count, itemIds: ids, kind: set.kind });
  }

  const { practice: _practice, ...rest } = raw;
  void _practice;
  return { ...rest, kind: 'lesson', verbs, sets, items } as LessonTraining;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function parseTraining(yamlText: string): Training {
  const raw = parse(yamlText);
  return raw.kind === 'lesson' ? expandLesson(raw) : expandPerfekt(raw);
}
