// Tiny inline markup for lesson texts: <v>bin</v> marks a verb, <s> the second verb part
// (infinitive, prefix, participle), <p> a Position 1 element, <st> a word stem, <en> an ending, <x> a wrong example,
// <der>, <die>, <das>, <pl> an article in its gender colour (der blue, die red, das green, plural orange).
// <c> the words that are in the case being explained (highlighted).
// Everything is rendered as plain text nodes (never as HTML), so it is safe.
export const RICH_TAGS = ['v', 's', 'p', 'st', 'en', 'x', 'der', 'die', 'das', 'pl', 'c'] as const;
export interface RichSeg {
  text: string;
  tag?: (typeof RICH_TAGS)[number];
}

const PAIR = /<(v|s|p|st|en|x|der|die|das|pl|c)>(.*?)<\/\1>/g;

export function parseRich(input: string): RichSeg[] {
  const out: RichSeg[] = [];
  let last = 0;
  for (const m of input.matchAll(PAIR)) {
    if (m.index! > last) out.push({ text: input.slice(last, m.index) });
    out.push({ text: m[2], tag: m[1] as RichSeg['tag'] });
    last = m.index! + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last) });
  return out;
}

export const stripRich = (input: string) => parseRich(input).map((s) => s.text).join('');

// Plain-English problems: a "<" that is not part of a known pair of tags.
export function richProblems(input: string): string[] {
  const rest = input.replace(PAIR, (_m, _t, inner) => inner);
  return rest.includes('<') || rest.includes('>') ? [`unknown or unclosed tag in “${input}” (allowed: ${RICH_TAGS.join(', ')})`] : [];
}
