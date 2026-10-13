import type { BoxesItem, BuildItem, ChoiceItem, ConvertItem, OrderItem, SentenceBuildItem } from '../content/types';

export const checkBuild = (item: BuildItem, picked: string[]) => picked.join('') === item.pieces.join('');

export const checkChoice = (item: ChoiceItem, answer: string) => answer === item.answer;

// The first word of a sentence is written in lower case in the content files,
// so we compare the words as they are.
export const checkOrder = (item: OrderItem, picked: string[]) =>
  item.accept.some((a) => a.length === picked.length && a.every((w, i) => w === picked[i]));

export const checkConvert = (item: ConvertItem, answer: string) => answer === item.right;

export const sentenceText = (words: string[], end: string) => {
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + end;
};

export const participleOf = (item: BuildItem) => item.pieces.join('');

export function shuffle<T>(a: T[], rnd: () => number = Math.random): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// Does the learner's arrangement match one of the accepted solutions?
export function checkBoxes(item: BoxesItem, mine: string[][]): boolean {
  return item.solutions.some((sol) => sol.length === mine.length && sol.every((box, b) => box.length === mine[b].length && box.every((c, i) => c === mine[b][i])));
}
// The finished sentence, with the verb marked.
export function boxesSentence(item: BoxesItem, mine: string[][]): string {
  const flat: string[] = [];
  mine.forEach((box, b) =>
    box.forEach((c) => flat.push(b === 1 ? `<v>${c}</v>` : item.markLast && b === mine.length - 1 ? `<s>${c}</s>` : c)),
  );
  const joined = flat.join(' ');
  return (joined.startsWith('<') ? joined.replace(/^(<v>)(.)/, (_m, t, c) => t + c.toUpperCase()) : joined.charAt(0).toUpperCase() + joined.slice(1)) + item.end;
}


/* ---- sentence building ---- */
export interface BuildWord {
  pieces: string[];
  tag?: string;
}

// "ich <v>steh|e</v> früh <s>auf</s>" → words with their pieces and optional marking tag.
export function parseBuildSolution(solution: string): BuildWord[] {
  return solution
    .split(' ')
    .filter(Boolean)
    .map((w) => {
      const m = w.match(/^<(\w+)>(.*)<\/\1>$/);
      // an underscore joins the words of one tile: um_sieben_Uhr → "um sieben Uhr"
      return { pieces: (m ? m[2] : w).split('|').map((x) => x.replace(/_/g, ' ')), tag: m?.[1] };
    });
}
export const buildPieces = (words: BuildWord[]) => words.flatMap((w) => w.pieces);

// The accepted solution that the learner's pieces match, or null.
export function matchSentenceBuild(item: SentenceBuildItem, picked: string[]): BuildWord[] | null {
  for (const sol of item.accept) {
    const words = parseBuildSolution(sol);
    const pieces = buildPieces(words);
    if (pieces.length === picked.length && pieces.every((p, i) => p === picked[i])) return words;
  }
  return null;
}

// Should two neighbouring tiles touch (parts of one word) or have a space between them?
export function glued(item: SentenceBuildItem, a: string, b: string): boolean {
  return item.accept.some((sol) => parseBuildSolution(sol).some((w) => w.pieces.some((p, i) => p === a && w.pieces[i + 1] === b)));
}

// The finished sentence as lesson markup: pieces joined to words, first letter capital.
export function buildSentenceText(words: BuildWord[], end: string): string {
  const text = words.map((w) => (w.tag ? `<${w.tag}>${w.pieces.join('')}</${w.tag}>` : w.pieces.join(''))).join(' ');
  return text.replace(/^((?:<\w+>)?)(.)/, (_m, t: string, c: string) => t + c.toUpperCase()) + end;
}

// Short answers: ignore case, spaces and punctuation at the end. An accepted entry that starts with ~ is a keyword;
// an answer is also right when it contains all keywords.
export const normalizeAnswer = (a: string) => a.toLowerCase().replace(/[.,;:!?„“"»«]/g, ' ').replace(/\s+/g, ' ').trim();
export function checkShortAnswer(accept: string[], answer: string): boolean {
  const a = normalizeAnswer(answer);
  if (!a) return false;
  const exact = accept.filter((x) => !x.startsWith('~')).map(normalizeAnswer);
  const keys = accept.filter((x) => x.startsWith('~')).map((x) => normalizeAnswer(x.slice(1)));
  return exact.includes(a) || (keys.length > 0 && keys.every((k) => a.includes(k)));
}
