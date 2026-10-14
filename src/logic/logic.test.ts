import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import type { BoxesItem, BuildItem, ChoiceItem, ConvertItem, LessonTraining, OrderItem, PerfektTraining, Training } from '../content/types';
import { articleOptions, bilingualProblems, formOptions, localize, mergeOverlay, parseParts, parseTraining, partsArrangement, possibleStarts } from '../content/expand';
import { parseRich, richProblems, stripRich } from '../content/rich';
import { strings } from '../i18n/strings';
import { roleTokens, isParticiple } from './german';
import { validateTraining } from '../content/validate';
import { boxesSentence, buildSentenceText, checkBoxes, checkBuild, checkChoice, checkConvert, checkOrder, glued, matchSentenceBuild, sentenceText, checkShortAnswer } from './check';
import { emptyProgress, recordResult } from './progress';
import { pickQuickPractice, priority } from './practice';
import { defaultPrefs, ZOOMS } from './prefs';
import { todayInGerman } from './today';

// Helpers that tell TypeScript which kind of training a file is.
const perfektOf = (yamlText: string, overlay?: string, problems: string[] = []): PerfektTraining => {
  const t = parseTraining(yamlText, overlay, problems);
  if (t.kind !== 'perfekt') throw new Error('not a perfekt training');
  return t;
};
const lessonOf = (file: string, lang: 'en' | 'de' = 'en'): LessonTraining => {
  const t = parseTraining(readFileSync(`content/trainings/${file}`, 'utf8'), undefined, [], lang);
  if (t.kind !== 'lesson') throw new Error('not a lesson training');
  return t;
};

const build: BuildItem = { id: 'b', type: 'build-from-pieces', concepts: ['x'], verb: 'machen', verbType: 'reg', pieces: ['ge', 'mach', 't'], roles: ['ge', 'stem', 'end'], extras: ['en'], hint: '', example: '' };
const choice: ChoiceItem = { id: 'c', type: 'binary-choice', concepts: ['x'], verb: 'gehen', answer: 'sein', example: '', explanation: '' };
const order: OrderItem = { id: 'o', type: 'sentence-order', concepts: ['x'], words: ['ich', 'habe', 'gestern', 'gespielt'], accept: [['ich', 'habe', 'gestern', 'gespielt'], ['gestern', 'habe', 'ich', 'gespielt']], end: '.', explanation: '' };

describe('answer checking', () => {
  it('checks built words', () => {
    expect(checkBuild(build, ['ge', 'mach', 't'])).toBe(true);
    expect(checkBuild(build, ['ge', 'mach', 'en'])).toBe(false);
    expect(checkBuild(build, [])).toBe(false);
  });
  it('checks haben/sein', () => {
    expect(checkChoice(choice, 'sein')).toBe(true);
    expect(checkChoice(choice, 'haben')).toBe(false);
  });
  it('accepts every listed word order and nothing else', () => {
    expect(checkOrder(order, ['gestern', 'habe', 'ich', 'gespielt'])).toBe(true);
    expect(checkOrder(order, ['ich', 'gestern', 'habe', 'gespielt'])).toBe(false);
    expect(checkOrder(order, ['ich', 'habe'])).toBe(false);
  });
  it('writes the sentence with capital and end mark', () => {
    expect(sentenceText(['gestern', 'habe', 'ich', 'Fußball', 'gespielt'], '.')).toBe('Gestern habe ich Fußball gespielt.');
  });
});

describe('progress and practice', () => {
  it('scores first try 2, retry 1, wrong 0', () => {
    let p = recordResult(emptyProgress(), 'a', 'first-try');
    p = recordResult(p, 'b', 'after-retry');
    p = recordResult(p, 'c', 'wrong');
    expect(p.points).toBe(3);
    expect(p.items.c).toMatchObject({ right: 0, wrong: 1 });
  });
  it('practises mistakes before things that are known', () => {
    const now = Date.now();
    let p = recordResult(emptyProgress(), 'known', 'first-try', now);
    p = recordResult(p, 'weak', 'wrong', now);
    expect(priority(p, 'weak', now)).toBeGreaterThan(priority(p, 'known', now));
    expect(priority(p, 'new', now)).toBeGreaterThan(priority(p, 'known', now));
  });
  it('picks the requested number of items', () => {
    const t = { items: [build, choice, order] } as Training;
    expect(pickQuickPractice([t], emptyProgress(), 2)).toHaveLength(2);
  });
});

describe('German helpers', () => {
  it('marks the helper verb and the Partizip II', () => {
    const r = roleTokens('Ich habe gestern Fußball gespielt.');
    expect(r.find((x) => x.role === 'aux')?.t).toBe('habe');
    expect(r.find((x) => x.role === 'part')?.t).toBe('gespielt.');
  });
  it('recognises typical participle shapes', () => {
    for (const w of ['gemacht', 'gegangen', 'aufgestanden', 'besucht', 'telefoniert', 'vergessen']) expect(isParticiple(w)).toBe(true);
    expect(isParticiple('gestern')).toBe(false);
    expect(isParticiple('Fußball')).toBe(false);
  });
  it('checks convert answers', () => {
    const c: ConvertItem = { id: 'x', type: 'multiple-choice', concepts: ['x'], prompt: 'a', right: 'r', wrong: ['w1', 'w2'], explanation: '' };
    expect(checkConvert(c, 'r')).toBe(true);
    expect(checkConvert(c, 'w1')).toBe(false);
  });
});

describe('German-only version', () => {
  const main = readFileSync('content/trainings/perfekt.yaml', 'utf8');
  const de = readFileSync('content/trainings/de/perfekt.yaml', 'utf8');
  const concepts = parse(readFileSync('content/concepts.yaml', 'utf8'));
  it('has no keys that are missing in the main file', () => {
    const problems: string[] = [];
    parseTraining(main, de, problems);
    expect(problems).toEqual([]);
  });
  it('passes the content check and keeps the same ids', () => {
    const en = perfektOf(main);
    const g = perfektOf(main, de);
    expect(validateTraining(g, concepts)).toEqual([]);
    expect(g.items.map((i) => i.id)).toEqual(en.items.map((i) => i.id));
  });
  it('translates explanations, hints and rules', () => {
    const en = perfektOf(main);
    const g = perfektOf(main, de);
    expect(g.canDo).not.toEqual(en.canDo);
    expect(g.klammer.rulePos2).toContain('Hauptsatz');
    expect(g.subKlammer.rule).toContain('Nebensatz');
    const enChoice = en.items.find((i) => i.id === 'perfekt-aux-gehen');
    const deChoice = g.items.find((i) => i.id === 'perfekt-aux-gehen');
    expect(enChoice && 'explanation' in enChoice && enChoice.explanation).toContain('Change of place');
    expect(deChoice && 'explanation' in deChoice && deChoice.explanation).toContain('Ortswechsel');
  });
  it('reports typos in a translation file', () => {
    const problems: string[] = [];
    mergeOverlay({ a: { b: 'x' } }, { a: { c: 'y' } }, '', problems);
    expect(problems.join(' ')).toContain('a.c');
  });
  it('has a German text for every interface string', () => {
    expect(Object.keys(strings.de).sort()).toEqual(Object.keys(strings.en).sort());
  });
});

describe('content files', () => {
  const concepts = parse(readFileSync('content/concepts.yaml', 'utf8'));
  const files = readdirSync('content/trainings').filter((x) => x.endsWith('.yaml'));
  for (const f of files) {
    for (const lang of ['en', 'de'] as const) {
      it(`${f} passes the content check (${lang})`, () => {
        const main = readFileSync(`content/trainings/${f}`, 'utf8');
        const deFile = `content/trainings/de/${f}`;
        const overlay = lang === 'de' && existsSync(deFile) ? readFileSync(deFile, 'utf8') : undefined;
        expect(validateTraining(parseTraining(main, overlay, [], lang), concepts)).toEqual([]);
      });
    }
  }
  it('the Perfekt training has the full verb list and exercises', () => {
    const t = perfektOf(readFileSync('content/trainings/perfekt.yaml', 'utf8'));
    expect(t.verbs.length).toBe(52);
    expect(t.items.filter((i) => i.type === 'sentence-order')).toHaveLength(16);
    expect(t.items.filter((i) => i.type === 'multiple-choice')).toHaveLength(14);
    expect(t.items.filter((i) => i.type === 'binary-choice')).toHaveLength(52);
  });
  it('the checker finds a wrong word order list', () => {
    const t = perfektOf(readFileSync('content/trainings/perfekt.yaml', 'utf8'));
    const bad = { ...t, items: [{ ...order, accept: [['ich', 'habe']] }] } as Training;
    expect(validateTraining(bad, { x: 'x' }).join(' ')).toContain('same words');
  });
  it('the checker finds a wrong form that is secretly right', () => {
    const t = perfektOf(readFileSync('content/trainings/perfekt.yaml', 'utf8'));
    t.verbs[0].fakes = [t.verbs[0].part, 'x'];
    expect(validateTraining(t, concepts).join(' ')).toContain('actually the right answer');
  });
});

describe('inline markup', () => {
  it('splits text into marked and plain parts', () => {
    expect(parseRich('Ich <v>bin</v> müde.')).toEqual([{ text: 'Ich ' }, { text: 'bin', tag: 'v' }, { text: ' müde.' }]);
    expect(stripRich('<p>Heute</p> <v>spiele</v> ich')).toBe('Heute spiele ich');
  });
  it('reports unknown or unclosed tags', () => {
    expect(richProblems('Ich <v>bin</v> müde.')).toEqual([]);
    expect(richProblems('Ich <b>bin</b> müde.')).not.toEqual([]);
    expect(richProblems('Ich <v>bin müde.')).not.toEqual([]);
  });
});

describe('English and German side by side', () => {
  it('picks one language', () => {
    const x = { a: { en: 'Hello', de: 'Hallo' }, b: [{ en: 'x', de: 'y' }, 'same'] };
    expect(localize(x, 'de')).toEqual({ a: 'Hallo', b: ['y', 'same'] });
    expect(localize(x, 'en')).toEqual({ a: 'Hello', b: ['x', 'same'] });
  });
  it('finds texts that exist in only one language', () => {
    expect(bilingualProblems({ title: { en: 'x' } }).join(' ')).toContain('both');
    expect(bilingualProblems({ title: 'only English' }).join(' ')).toContain('en:');
    expect(bilingualProblems({ title: { en: 'x', de: 'y' } })).toEqual([]);
  });
});

describe('A1 lesson trainings', () => {
  const hs = lessonOf('haben-sein-present.yaml');
  const reg = lessonOf('regular-verbs-present.yaml');
  const sat = lessonOf('sentence-structure-a1.yaml');

  it('offers up to 4 different forms, with the right one included', () => {
    expect(formOptions(['bin', 'bist', 'ist', 'sind', 'seid', 'sind'], 3).sort()).toEqual(['bin', 'bist', 'seid', 'sind']);
    for (const v of [...hs.verbs, ...reg.verbs]) {
      for (let p = 0; p < 6; p++) {
        const o = formOptions(v.forms, p);
        expect(o).toContain(v.forms[p]);
        expect(new Set(o).size).toBe(o.length);
      }
    }
  });
  it('writes every regular form as stem + ending', () => {
    const spielen = reg.verbs.find((v) => v.inf === 'spielen')!;
    expect(spielen.forms).toEqual(['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen']);
    expect(reg.verbs.find((v) => v.inf === 'arbeiten')!.forms[1]).toBe('arbeitest');
    expect(reg.verbs.find((v) => v.inf === 'tanzen')!.forms[1]).toBe('tanzt');
    expect(reg.verbs.find((v) => v.inf === 'heißen')!.forms[1]).toBe('heißt');
  });
  it('the build items assemble to the real form', () => {
    for (const i of reg.items) {
      if (i.type !== 'build-from-pieces') continue;
      const inf = i.verb.split(' → ')[1];
      const p = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'].indexOf(i.verb.split(' → ')[0]);
      expect(i.pieces.join('')).toBe(reg.verbs.find((v) => v.inf === inf)!.forms[p]);
      expect(checkBuild(i, i.pieces)).toBe(true);
    }
  });
  it('every pick item has exactly one right option', () => {
    for (const t of [hs, reg, sat]) {
      for (const i of t.items) {
        if (i.type !== 'pick') continue;
        expect(i.options.filter((o) => o === i.answer)).toHaveLength(1);
      }
    }
  });
  it('has a practice set with items for every set', () => {
    for (const t of [hs, reg, sat]) {
      expect(t.sets.length).toBeGreaterThan(3);
      for (const s of t.sets) expect(s.itemIds.length).toBeGreaterThan(0);
    }
  });
  it('gives the German version different texts', () => {
    const de = lessonOf('haben-sein-present.yaml', 'de');
    expect(de.title).toBe('haben und sein');
    expect(hs.title).toBe('haben and sein');
    expect(de.canDo[0]).toContain('Ich kann');
    expect(hs.canDo[0]).toContain('I can');
    expect(de.items.map((i) => i.id)).toEqual(hs.items.map((i) => i.id));
  });
  it('checks boxes and builds the finished sentence', () => {
    const item: BoxesItem = { id: 'b', type: 'boxes', concepts: ['x'], instruction: '', boxes: ['P1', 'V', 'S', 'R'], chunks: ['heute', 'spiele', 'ich', 'Fußball'], solutions: [[['heute'], ['spiele'], ['ich'], ['Fußball']]], end: '.', explanation: '' };
    expect(checkBoxes(item, [['heute'], ['spiele'], ['ich'], ['Fußball']])).toBe(true);
    expect(checkBoxes(item, [['ich'], ['spiele'], [], ['heute', 'Fußball']])).toBe(false);
    expect(boxesSentence(item, [['heute'], ['spiele'], ['ich'], ['Fußball']])).toBe('Heute <v>spiele</v> ich Fußball.');
    expect(boxesSentence({ ...item, end: '?' }, [[], ['spielst'], ['du'], ['Fußball']])).toBe('<v>Spielst</v> du Fußball?');
  });
  it('the sentence-structure boxes accept both valid orders', () => {
    const b = sat.items.find((i): i is BoxesItem => i.type === 'boxes' && i.chunks.join(' ') === 'ich wohne in Berlin')!;
    expect(checkBoxes(b, [['ich'], ['wohne'], [], ['in Berlin']])).toBe(true);
    expect(checkBoxes(b, [['in Berlin'], ['wohne'], ['ich'], []])).toBe(true);
    expect(checkBoxes(b, [['wohne'], ['ich'], [], ['in Berlin']])).toBe(false);
  });
  it('the checker catches mistakes in a lesson', () => {
    const concepts = parse(readFileSync('content/concepts.yaml', 'utf8'));
    const bad = lessonOf('haben-sein-present.yaml');
    const pick = bad.items.find((i) => i.type === 'pick')!;
    if (pick.type === 'pick') pick.answer = 'nicht da';
    expect(validateTraining(bad, concepts).join(' ')).toContain('not among the options');
  });
});

describe('verb tables (checked against the grammar)', () => {
  const forms = (file: string, inf: string) => lessonOf(file).verbs.find((v) => v.inf === inf)!.forms.join(' ');
  it('modal verbs', () => {
    const f = (inf: string) => forms('modal-verbs-present.yaml', inf);
    expect(f('können')).toBe('kann kannst kann können könnt können');
    expect(f('müssen')).toBe('muss musst muss müssen müsst müssen');
    expect(f('wollen')).toBe('will willst will wollen wollt wollen');
    expect(f('möchten')).toBe('möchte möchtest möchte möchten möchtet möchten');
    expect(f('dürfen')).toBe('darf darfst darf dürfen dürft dürfen');
    expect(f('sollen')).toBe('soll sollst soll sollen sollt sollen');
  });
  it('verbs with a vowel change change only du and er/sie/es', () => {
    const f = (inf: string) => forms('vowel-change-verbs.yaml', inf);
    expect(f('sprechen')).toBe('spreche sprichst spricht sprechen sprecht sprechen');
    expect(f('essen')).toBe('esse isst isst essen esst essen');
    expect(f('geben')).toBe('gebe gibst gibt geben gebt geben');
    expect(f('nehmen')).toBe('nehme nimmst nimmt nehmen nehmt nehmen');
    expect(f('helfen')).toBe('helfe hilfst hilft helfen helft helfen');
    expect(f('lesen')).toBe('lese liest liest lesen lest lesen');
    expect(f('sehen')).toBe('sehe siehst sieht sehen seht sehen');
    expect(f('fahren')).toBe('fahre fährst fährt fahren fahrt fahren');
    expect(f('schlafen')).toBe('schlafe schläfst schläft schlafen schlaft schlafen');
    expect(f('laufen')).toBe('laufe läufst läuft laufen lauft laufen');
  });
  it('separable verbs: verb part only (the prefix is stored separately)', () => {
    const t = lessonOf('separable-verbs-present.yaml');
    const f = (inf: string) => t.verbs.find((v) => v.inf === inf)!;
    expect(f('aufstehen').forms.join(' ')).toBe('stehe stehst steht stehen steht stehen');
    expect(f('aufstehen').prefix).toBe('auf');
    expect(f('fernsehen').forms.join(' ')).toBe('sehe siehst sieht sehen seht sehen');
    expect(f('einladen').forms.join(' ')).toBe('lade lädst lädt laden ladet laden');
    expect(f('anfangen').forms.join(' ')).toBe('fange fängst fängt fangen fangt fangen');
    expect(f('abholen').forms.join(' ')).toBe('hole holst holt holen holt holen');
  });
  it('builds whole sentences for separable verbs, with the prefix at the end', () => {
    const t = lessonOf('separable-verbs-present.yaml');
    const get = (id: string) => {
      const i = t.items.find((x) => x.id === id);
      if (!i || i.type !== 'sentence-build') throw new Error('missing ' + id);
      return i;
    };
    const a = get('separable-verbs-present-build-s-aufstehen-p2');
    expect(a.accept).toEqual(['er <v>steh|t</v> um_sieben_Uhr <s>auf</s>']);
    expect(matchSentenceBuild(a, ['er', 'steh', 't', 'um sieben Uhr', 'auf'])).not.toBeNull();
    expect(matchSentenceBuild(a, ['er', 'steh', 't', 'auf', 'um sieben Uhr'])).toBeNull();
    // the finished sentence is spelled correctly: parts of one word are joined, words have spaces
    const words = matchSentenceBuild(a, ['er', 'steh', 't', 'um sieben Uhr', 'auf'])!;
    expect(buildSentenceText(words, '.')).toBe('Er <v>steht</v> um sieben Uhr <s>auf</s>.');
    expect(glued(a, 'steh', 't')).toBe(true);
    expect(glued(a, 't', 'auf')).toBe(false);
    const f = get('separable-verbs-present-build-s-fernsehen-p1');
    expect(f.accept).toEqual(['du <v>sieh|st</v> abends <s>fern</s>']);
    expect(f.extras).toContain('seh');
    const e = get('separable-verbs-present-build-s-einladen-p4');
    expect(e.accept).toEqual(['ihr <v>lad|et</v> meine_Freunde <s>ein</s>']);
    const pick = t.items.find((i) => i.id === 'separable-verbs-present-pick-k-aufstehen-p0');
    expect(pick && pick.type === 'pick' && pick.answer).toBe('stehe auf');
  });
  it('the vowel-change drills offer the wrong stem as a typical mistake', () => {
    const t = lessonOf('vowel-change-verbs.yaml');
    const b = t.items.find((i) => i.id === 'vowel-change-verbs-build-b-sprechen-p1');
    expect(b && b.type === 'build-from-pieces' && b.pieces).toEqual(['sprich', 'st']);
    expect(b && b.type === 'build-from-pieces' && b.extras).toContain('sprech');
  });
  it('the bracket lab knows its verbs', () => {
    const t = lessonOf('modal-verbs-present.yaml');
    expect(t.understand.some((b) => b.type === 'bracket-lab')).toBe(true);
    const bad = lessonOf('modal-verbs-present.yaml');
    const lab = bad.understand.find((b) => b.type === 'bracket-lab');
    if (lab && lab.type === 'bracket-lab') lab.leads = ['gehen'];
    const concepts = parse(readFileSync('content/concepts.yaml', 'utf8'));
    expect(validateTraining(bad, concepts).join(' ')).toContain('not in the verb list');
  });
});


describe('cases and sentence parts', () => {
  const dat = lessonOf('dative-a2.yaml');
  const arts = dat.articles!;

  it('article tables are right for the Dativ', () => {
    expect(arts.definite.dat).toEqual(['dem', 'der', 'dem', 'den']);
    expect(arts.indefinite.dat).toEqual(['einem', 'einer', 'einem', '']);
    expect(arts.possessive.dat).toEqual(['meinem', 'meiner', 'meinem', 'meinen']);
    expect(arts.negative.dat).toEqual(['keinem', 'keiner', 'keinem', 'keinen']);
    expect(lessonOf('accusative-a1.yaml').articles!.definite.akk).toEqual(['den', 'die', 'das', 'die']);
  });

  it('article options always contain the right answer once and at most four forms', () => {
    for (const kind of ['definite', 'indefinite', 'possessive', 'negative'] as const) {
      for (const g of ['m', 'f', 'n'] as const) {
        const opts = articleOptions(arts, kind, 'dat', g);
        expect(opts.length).toBeGreaterThanOrEqual(2);
        expect(opts.length).toBeLessThanOrEqual(4);
        expect(new Set(opts).size).toBe(opts.length);
        expect(opts).toContain(arts[kind].dat![{ m: 0, f: 1, n: 2 }[g]]);
      }
    }
  });

  it('parses sentence parts and builds every valid arrangement', () => {
    const parts = parseParts('wir/S haben/V gestern/T dem_Gast/D die_Stadt/A gezeigt/E');
    expect(parts[3].t).toBe('dem Gast');
    expect(partsArrangement(parts, 'S')).toEqual([['wir'], ['haben'], ['gestern', 'dem Gast', 'die Stadt'], ['gezeigt']]);
    expect(partsArrangement(parts, 'D')).toEqual([['dem Gast'], ['haben'], ['wir', 'gestern', 'die Stadt'], ['gezeigt']]);
    expect(possibleStarts(parts)).toEqual(['S', 'T', 'D', 'A']);
  });

  it('the new trainings are valid in both languages', () => {
    for (const f of ['vocabulary-family-a1', 'vocabulary-food-a1', 'vocabulary-work-a2', 'reading-a1', 'reading-a2', 'reading-b1', 'genitive-b1', 'two-way-prepositions-a2', 'cases-overview', 'accusative-a1', 'dative-a2', 'main-clauses-a1', 'main-clauses-a2']) {
      for (const lang of ['en', 'de'] as const) {
        const t = lessonOf(`${f}.yaml`, lang);
        expect(validateTraining(t, parse(readFileSync('content/concepts.yaml', 'utf8')))).toEqual([]);
        expect(t.items.length).toBeGreaterThan(20);
      }
    }
  });

  it('main-clause boxes accept any part in position 1 and keep the verb second', () => {
    const t = lessonOf('main-clauses-a1.yaml');
    const item = t.items.find((i) => i.type === 'boxes' && i.id.includes('boxes')) as BoxesItem;
    expect(item.solutions.length).toBeGreaterThan(1);
    for (const sol of item.solutions) expect(sol[1]).toHaveLength(1);
  });
});

describe('reading', () => {
  it('short answers ignore case and end punctuation, and accept keyword answers', () => {
    expect(checkShortAnswer(['in einem Café', 'im Café'], ' Im Café. ')).toBe(true);
    expect(checkShortAnswer(['in einem Café'], 'in einem Büro')).toBe(false);
    expect(checkShortAnswer(['~name', '~formular'], 'Seinen Namen aufschreiben und ein Formular ausfüllen')).toBe(true);
    expect(checkShortAnswer(['~name', '~formular'], 'Man schreibt den Namen auf')).toBe(false);
    expect(checkShortAnswer(['zwölf'], '')).toBe(false);
  });

  it('every reading item has a text, and the find-the-sentence options are quoted from it', () => {
    for (const f of ['reading-a1', 'reading-a2', 'reading-b1']) {
      const t = lessonOf(`${f}.yaml`);
      expect(t.skill).toBe('reading');
      expect(t.texts!.length).toBe(2);
      for (const item of t.items) expect(t.texts!.some((x) => x.id === item.textId)).toBe(true);
      const kinds = new Set(t.items.map((i) => i.type));
      expect([...kinds].sort()).toEqual(['pairs', 'pick', 'short-answer']);
    }
  });
});

describe('install and offline files', () => {
  it('the manifest is complete and its icons exist', () => {
    const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(m.name).toBeTruthy();
    expect(m.display).toBe('standalone');
    expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
    for (const i of m.icons) expect(existsSync(`public/${i.src}`)).toBe(true);
    expect(existsSync('public/icons/apple-touch-icon.png')).toBe(true);
  });
  it('the service worker template has the two places the build fills in', () => {
    const sw = readFileSync('src/sw.template.js', 'utf8');
    expect(sw).toContain("'daz-alex-__VERSION__'");
    expect(sw).toContain('= __FILES__;');
  });
});

describe('vocabulary', () => {
  it('words come with article, plural or noPlural, a meaning and a marked example', () => {
    for (const f of ['vocabulary-family-a1', 'vocabulary-food-a1', 'vocabulary-work-a2']) {
      const t = lessonOf(`${f}.yaml`);
      expect(t.skill).toBe('vocabulary');
      for (const w of t.words!) {
        expect(w.ex).toMatch(/<c>.+<\/c>/);
        if (w.art && w.art !== 'pl') expect(Boolean(w.pl) || w.noPlural === true).toBe(true);
      }
    }
  });
  it('the write exercise accepts the word with and without article, and the example form', () => {
    const t = lessonOf('vocabulary-food-a1.yaml');
    const mutterLike = t.items.find((i) => i.type === 'short-answer' && i.accept.includes('das Brot'));
    expect(mutterLike && mutterLike.type === 'short-answer' && checkShortAnswer(mutterLike.accept, 'Brot')).toBe(true);
    const verb = t.items.find((i) => i.type === 'short-answer' && i.accept.includes('essen'));
    expect(verb && verb.type === 'short-answer' && checkShortAnswer(verb.accept, 'esse')).toBe(false);
  });
  it('in German mode the meaning is a German explanation', () => {
    const en = lessonOf('vocabulary-family-a1.yaml', 'en').words!.find((w) => w.id === 'mutter')!;
    const de = lessonOf('vocabulary-family-a1.yaml', 'de').words!.find((w) => w.id === 'mutter')!;
    expect(en.meaning).toBe('mother');
    expect(de.meaning).toBe('Mama');
  });
});

describe('case exercises from the owner’s teaching ideas', () => {
  const dat = lessonOf('dative-a2.yaml');
  it('the two-gap exercise has a right answer for every gap', () => {
    const gaps = dat.items.filter((i) => i.type === 'gaps');
    expect(gaps.length).toBeGreaterThanOrEqual(6);
    for (const g of gaps) if (g.type === 'gaps') for (const x of g.gaps) expect(x.options).toContain(x.answer);
  });
  it('the writing check finds Dativ and Akkusativ words', () => {
    const w = dat.items.find((i) => i.type === 'free-writing');
    expect(w && w.type === 'free-writing' && w.detect!.length).toBe(2);
    if (w && w.type === 'free-writing') {
      const [d, a] = w.detect!.map((x) => new RegExp(x.pattern, 'iu'));
      expect(d.test('Ich schenke meiner Mutter eine Blume.')).toBe(true);
      expect(a.test('Ich schenke meiner Mutter einen Ball.')).toBe(true);
      expect(d.test('Ich sehe den Hund.')).toBe(false);
    }
  });
  it('the sentence detective exists in the case and sentence trainings', () => {
    for (const f of ['accusative-a1', 'dative-a2', 'main-clauses-a1', 'main-clauses-a2']) {
      expect(lessonOf(`${f}.yaml`).understand.some((b) => b.type === 'detective')).toBe(true);
    }
  });
});

describe('flashcards, memory and display settings', () => {
  it('every vocabulary training has flashcards and a memory game built from its words', () => {
    for (const f of ['vocabulary-family-a1', 'vocabulary-food-a1', 'vocabulary-work-a2']) {
      const t = lessonOf(`${f}.yaml`);
      expect(t.sets.find((x) => x.kind === 'cards')?.itemIds).toEqual([]);
      expect(t.sets.find((x) => x.kind === 'memory')).toBeTruthy();
      expect(t.words!.length).toBeGreaterThanOrEqual(6);
    }
  });
  it('display settings start with normal size and normal spacing', () => {
    expect(defaultPrefs()).toEqual({ zoom: 1, wide: false });
    expect(ZOOMS).toContain(1);
  });
});

describe('start page whiteboard', () => {
  it('writes weekday and date in German', () => {
    expect(todayInGerman(new Date(2026, 9, 14))).toEqual({ weekday: 'Mittwoch', date: '14. Oktober 2026' });
  });
});

describe('stylesheet', () => {
  it('has balanced braces (an unclosed block silently switches off all rules after it)', () => {
    const css = readFileSync('src/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css.split('{').length).toBe(css.split('}').length);
  });
});
