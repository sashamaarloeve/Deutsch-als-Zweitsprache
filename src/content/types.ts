export type Level = 'A0' | 'A1' | 'A2' | 'B1'; // A0 = overviews without a CEFR level
export type Skill = 'grammar' | 'reading' | 'vocabulary' | 'listening' | 'writing' | 'speaking';
export type PartType = 'reg' | 'irr' | 'trenn' | 'ohne';
export type Tone = 'der' | 'die' | 'das' | 'pl'; // article colours
export type Gender = 'm' | 'f' | 'n' | 'pl';
export type CaseId = 'nom' | 'akk' | 'dat' | 'gen';
/** Articles by case; each list is [masculine, feminine, neuter, plural]. */
export interface ArticleSet {
  label: string;
  nom: string[];
  akk: string[];
  dat?: string[];
  gen?: string[];
}
export type Articles = Record<string, ArticleSet>;
export type PieceRole = 'pre' | 'ge' | 'stem' | 'end' | 'alt'; // alt = changed vowel stem (du sprichst)
export type WhyKey = 'move' | 'change' | 'exc' | 'event';

/* ---- items (what the exercise runner plays) ---- */
export interface ItemBase {
  id: string;
  concepts: string[];
  textId?: string; // reading trainings: the text that is shown above the exercise
}
export interface BuildItem extends ItemBase {
  type: 'build-from-pieces';
  /** 'form' = build a present-tense verb form; default = build the Partizip II */
  promptKind?: 'participle' | 'form';
  verb: string;
  verbType?: PartType;
  pieces: string[];
  roles: PieceRole[];
  extras: string[]; // pool of wrong tiles; the exercise picks 2 that are not real pieces
  hint: string;
  example: string;
}
export interface ChoiceItem extends ItemBase {
  type: 'binary-choice';
  verb: string;
  answer: 'haben' | 'sein';
  example: string;
  explanation: string;
}
export interface ConvertItem extends ItemBase {
  type: 'multiple-choice';
  prompt: string; // the Präsens sentence
  right: string;
  wrong: string[];
  explanation: string;
}
export interface OrderItem extends ItemBase {
  type: 'sentence-order';
  instruction?: string; // default: the Perfekt instruction
  words: string[];
  accept: string[][];
  end: '.' | '?' | '!';
  explanation: string;
}
/** Pick one option, optionally inside a sentence with a gap (___). */
export interface PickItem extends ItemBase {
  type: 'pick';
  instruction: string;
  prompt: string;
  sentence?: string;
  options: string[];
  answer: string;
  explanation: string;
  example?: string; // shown in the feedback; supports <v>…</v> markup
  tone?: Tone; // colour of the answer in the feedback (article gender)
  inText?: boolean; // every option is a sentence quoted from the reading text (checked by the content checker)
}
/** Reading: write a short answer found in the text. Matching ignores case, spaces and end punctuation. */
export interface ShortAnswerItem extends ItemBase {
  type: 'short-answer';
  instruction: string;
  prompt: string; // the question
  accept: string[]; // valid answers; an entry starting with ~ is a keyword: all keywords must appear in the answer
  explanation: string; // shows the model answer
}
/** Match each left word with its partner on the right. */
export interface PairsItem extends ItemBase {
  type: 'pairs';
  instruction: string;
  pairs: [string, string][];
  explanation?: string;
}
/** Put words into labelled boxes (Position 1, Verb, Subject, Rest). */
export interface BoxesItem extends ItemBase {
  type: 'boxes';
  instruction: string;
  boxes: string[];
  chunks: string[];
  solutions: string[][][]; // each solution: one list of chunks per box
  end: '.' | '?' | '!';
  markLast?: boolean; // mark the last box (second verb part) in the finished sentence
  roles?: string[]; // one sentence-part code per chunk (S, V, A, D, T, L, Q, E)
  roleLabels?: Record<string, string>; // what each code means
  explanation: string;
}
/**
 * Build a whole sentence from pieces (stem + ending, prefix, other words).
 * Solutions are written like: "ich <v>steh|e</v> früh <s>auf</s>" – spaces separate words,
 * "|" separates the pieces of one word, "_" joins the words of one tile (um_sieben_Uhr),
 * tags only mark words in the finished sentence.
 */
export interface SentenceBuildItem extends ItemBase {
  type: 'sentence-build';
  instruction: string;
  accept: string[]; // all valid solutions
  extras: string[]; // wrong tiles (typical mistakes)
  end: '.' | '?' | '!';
  hint: string;
  explanation: string;
}
/** Free writing with word chips, a checklist and an example text. */
export interface WritingItem extends ItemBase {
  type: 'free-writing';
  instruction: string;
  prompt: string;
  words: string[];
  checklist: string[];
  model: string;
  minSentences: number;
  /** after checking, each rule is ticked when the text matches (pattern is a regular expression) */
  detect?: { label: string; pattern: string; tip: string }[];
}
/** One sentence with several gaps; every gap is a choice. Gaps are written {0}, {1} … in the sentence. */
export interface GapsItem extends ItemBase {
  type: 'gaps';
  instruction: string;
  sentence: string;
  gaps: { options: string[]; answer: string }[];
  explanation: string;
}
export type Item = BuildItem | ChoiceItem | ConvertItem | OrderItem | PickItem | PairsItem | BoxesItem | SentenceBuildItem | WritingItem | ShortAnswerItem | GapsItem;

/* ---- raw training file (YAML) ---- */
export interface RawVerb {
  inf: string;
  pc: string; // pieces separated by dots, e.g. ge.mach.t
  aux: 'haben' | 'sein';
  type: PartType;
  why?: WhyKey;
  fakes: [string, string]; // two wrong forms, written by hand, for the speed round
}
export interface Verb extends RawVerb {
  pieces: { x: string; r: PieceRole }[];
  part: string; // the Partizip II, e.g. gemacht
}
export interface PartTypeInfo {
  name: string;
  formula: [string, PieceRole][];
  text: string;
  hint: string;
}
export interface TrainingMeta {
  id: string;
  title: string;
  level: Level;
  skill: Skill;
  minutes: number;
  status: 'draft' | 'reviewed';
  description: string;
  canDo: string[];
  /** Built from the data below when the file is loaded. */
  items: Item[];
}

export interface PerfektTraining extends TrainingMeta {
  kind: 'perfekt';
  intro: {
    title: string;
    lead: string;
    dialogue: { who: string; text: string }[];
    formulaText: string;
    formula: string[];
  };
  klammer: {
    title: string;
    text: string;
    persons: string[];
    personWords: string[];
    verbs: [string, string][];
    modes: string[];
    scope: string;
    rulePos2: string;
    rulePos1: string;
    ruleStart: string;
  };
  subKlammer: {
    title: string;
    text: string;
    conjunctions: string[];
    openers: Record<string, string>;
    modes: string[];
    rule: string;
    compareLabel: string;
  };
  partTypes: { title: string; text: string } & Record<PartType, PartTypeInfo>;
  auxCards: {
    title: string;
    haben: { title: string; points: string[] };
    sein: { title: string; points: string[] };
  };
  why: Record<WhyKey | 'haben', string>;
  orderRules: { main: string; question: string };
  exceptions: Record<string, string>;
  writing: { prompt: string; placeholder: string; minSentences: number; note: string };
  verbs: Verb[];
  conv: { present: string; right: string; wrong: string[]; explanation: string }[];
  puzzles: { words: string; end: '.' | '?' | '!'; accept: string[] }[];
}

/* ---- lesson trainings: built from blocks in YAML ---- */
export interface ConjVerb {
  inf: string;
  stem?: string; // forms = stem + ending
  endings?: string[];
  alt?: string; // changed stem for verbs with a vowel change (sprech- → sprich-)
  altAt?: number[]; // persons that use the changed stem (1 = du, 2 = er/sie/es)
  prefix?: string; // separable verbs: the prefix that goes to the end (auf)
  comp?: string; // the rest of an example sentence (for sentence building), e.g. "um sieben Uhr"
  forms: string[]; // six forms of the verb itself: ich, du, er/sie/es, wir, ihr, sie/Sie
}
export interface LabVerb {
  inf: string;
  comp: string; // the rest of a statement, e.g. "Fußball"
  wq: string; // question word that asks for the rest, e.g. "Was"
}
export interface LabMode {
  id: string;
  label: string;
  rule: string;
  /** one entry per box; tokens: S subject, V verb, O rest, T time word, Q question word, Z second verb part (infinitive or prefix) */
  boxes: string[][];
  end: '.' | '?';
}
export type Block =
  | { type: 'text'; title?: string; body: string[] }
  | { type: 'dialogue'; title?: string; lines: { who: string; say: string }[] }
  | { type: 'rule'; title: string; body: string[] }
  | { type: 'detective'; title: string; intro?: string; roles: Record<string, string>; sentences: { parts: { t: string; r: string; q: string }[] }[] }
  | { type: 'word-list'; title: string; intro?: string; words: string[] }
  | { type: 'table'; title: string; intro?: string; head: string[]; rows: string[][] }
  | { type: 'conjugation'; title: string; intro?: string; verbs: string[]; irregularNote?: string }
  | { type: 'article-table'; title: string; intro?: string; kinds: string[]; cases: { id: CaseId; label: string }[]; note?: string }
  | {
      type: 'case-lab';
      title: string;
      intro: string;
      kinds: string[];
      /** frame: a sentence with ___ ; a pair is [singular, plural] */
      cases: { id: CaseId; label: string; frame: string | [string, string]; rule: string }[];
      nouns: { g: Gender; noun: string; dat?: string; gen?: string }[];
    }
  | {
      type: 'parts-lab';
      title: string;
      intro: string;
      roles: Record<string, string>;
      sentences: { parts: { t: string; r: string }[]; starts: string[] }[];
    }
  | {
      /** Modal verb + infinitive, or separable verb + prefix: the verb parts form a bracket. */
      type: 'bracket-lab';
      title: string;
      intro: string;
      boxLabels: string[];
      partLabels: [string, string];
      leadLabel?: string;
      actionLabel?: string;
      leads: string[];
      actions: { lead?: string; inf?: string; comp: string }[];
      starts: string[];
      modes: LabMode[];
    }
  | {
      type: 'sentence-lab';
      title: string;
      intro: string;
      boxLabels: string[];
      verbs: LabVerb[];
      starts: string[];
      modes: LabMode[];
    };
export interface LessonSet {
  id: string;
  title: string;
  shuffle: boolean;
  count?: number;
  itemIds: string[];
  /** cards = flashcards, memory = pairs game; both are built from the words list and have no items */
  kind?: 'cards' | 'memory';
}
/** A word of a vocabulary training. ex has the word marked: Das ist meine <c>Mutter</c>. */
export interface VocabWord {
  id: string;
  art?: 'der' | 'die' | 'das' | 'pl';
  word: string; // the word without article (nouns: singular)
  pl?: string; // plural of a noun, without article
  noPlural?: boolean; // nouns without a plural (Milch, Urlaub)
  meaning: string; // English in English mode, a simple German explanation in German mode
  ex: string;
}
export interface ReadingText {
  id: string;
  heading: string;
  paragraphs: string[];
}
export interface LessonTraining extends TrainingMeta {
  kind: 'lesson';
  texts?: ReadingText[];
  words?: VocabWord[];
  understand: Block[];
  articles?: Articles;
  verbs: ConjVerb[];
  sets: LessonSet[];
}

export type Training = PerfektTraining | LessonTraining;
