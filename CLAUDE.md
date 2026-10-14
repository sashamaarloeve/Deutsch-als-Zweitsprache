# CLAUDE.md – Project rules for DaZ-Alex

DaZ-Alex is a small web app for the owner's German tutoring (Nachhilfe). Pupils: 5th graders at an international primary school; fluent in English, some in other languages; German about B1+/B2 with gaps in grammar and vocabulary. In school they use *D wie Deutsch 5*; the owner practises with classic DaF/DaZ material. The owner is present in every session, so the app is for **doing exercises together**, not for self-study.

It started as a copy of the owner's other project A12B1 (adult self-learners) and keeps its engine: Vite + React + TypeScript, YAML content, the same exercise types. Content and look are being adapted step by step.

## Who you are working with

The owner is a German teacher (DaZ) and **not a programmer**. Explain in plain language, work in small steps, say what to click or run. Ask before adding a library, paid service or account. Never ask for secret keys in chat. If German teaching content is unclear, ask or list it in a docs file; do not guess.

## Product rules

- **App language is German only** (simple German, children aged about 10). No English switch. Learning content is German too. All texts, in `src/i18n/strings.tsx` and in `content/trainings/*.yaml`, are plain German (no English or `{en, de}` pairs). Trainings are single files without a translation.
- **No accounts, no saving, no tracking.** Nothing is written to localStorage, IndexedDB or cookies. Results exist only in memory while the page is open. Display settings (text size, wide spacing) reset on every visit. The offline file cache (service worker) is fine.
- **No read-aloud, no sounds.**
- **Dyslexia-friendly** (see `docs/STYLE.md`): butter-yellow squared notebook page on a cream-white background, white cards with navy outlines, handwriting headings (Patrick Hand), clear sans-serif text (see the style guide), generous spacing, left-aligned text, short sentences, one task at a time, no italics, no time pressure, no error-hunting tasks (sentence ordering over finding mistakes), encouraging feedback only. Colour is never the only signal.
- **Tablet and phone first**, large tap targets. Accessible (axe passes).
- **Tabs:** Aktuell, Verstehen, Trainieren. "Aktuell" shows the trainings listed in `content/aktuell.yaml` (what the pupils work on right now); the owner edits that list, the ids must exist (`npm run check-content` checks it). A training with `aktuellOnly: true` appears only there, not under Verstehen, Trainieren or Quick practice. New content that the owner wants "only under Aktuell" gets this flag.
- Nothing is locked. Pupils can open any training. Levels are labels only.
- Privacy: the pupils are minors. No third-party scripts, fonts or embeds; no personal data of any kind.

## Content rules

- **Original content only.** Do not copy or closely paraphrase *D wie Deutsch*, other textbooks, exams, publishers' word lists or websites. Topics and grammar areas may follow what the pupils cover in class; the sentences, texts and word lists are written fresh. Common words and plain grammar facts are fine. **Flag possible copyright issues to the owner before use**, also for the owner's own classroom files.
- Invented names with a mix of backgrounds, no real people or brands; topics suitable for 10–11 year olds (school, friends, hobbies, animals, food, family, daily life).
- Every training starts as `status: draft`. Only the owner sets `status: reviewed`. The preview site shows drafts (`VITE_SHOW_DRAFTS=1`), the live site only reviewed trainings.
- Ids are permanent. Every exercise lists all accepted answers and a short explanation; distractors are handwritten and never accidentally correct.
- Follow `docs/PEDAGOGY.md` (article colours der blue, die red, das green, plural orange; nouns always with article; no gap texts with a word bank).
- The 20 trainings copied from A12B1 are adult-oriented **drafts** and will be replaced or rewritten for the pupils step by step.
- Content format: see `content/trainings/haben-sein-present.yaml` as the model; validated by `npm run check-content`.

## Code rules

Keep it simple and readable; match the surrounding style; few dependencies; tests for logic changes; do not hard-code lesson text in components (it belongs in `content/`); code, comments and commits in English.

## Commands

`npm install` · `npm run dev` · `npm run build` · `npm test` · `npm run check-content` · `npm run offline` · `npm run a11y` (needs Chromium; set `CHROMIUM_PATH` if not found)

## Hosting

GitHub repository `sashamaarloeve/deutsch-als-zweitsprache`, Cloudflare Pages project **daz-alex** (build command `npm run build`, output folder `dist`; for the preview branch set the variable `VITE_SHOW_DRAFTS=1`). GitHub Actions run build, tests, content check, offline check and the accessibility check.

## Working method

Develop on the branch assigned for the session. No pull request unless the owner asks. Before finishing: build, tests, content check pass; commit; push. At the end, tell the owner in plain language what changed, how to try it, and what needs a decision.
