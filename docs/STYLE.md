# DaZ-Alex – Look and feel

Style guide: the owner's Perfekt page (screenshot, October 2026) in a butter-yellow notebook version.

- **Page:** butter-yellow squared paper (`--paper` #fff8d1, faint grid) on a cream-white desk (`--desk` #fcf9f1). No margin line.
- **Cards and exercises:** pure white, 3 px dark-navy outline (`--ink` #1c2b4a), round corners (18 px), hard navy "sticker" shadow (3 px right, 4 px down), no soft shadows.
- **Headings:** handwriting (Patrick Hand, self-hosted), navy. The page title has a yellow highlighter band (`--hl`) behind it.
- **Text, buttons, labels:** clear sans-serif (Segoe UI, then Verdana, system font), bold on buttons. Slightly wide letter and line spacing; the button "Weiter Abstand" widens it further.
- **Buttons:** white with navy outline; the active one is yellow (`--hl`). Main actions use the dark orange button.
- **Colour teaches, but is never alone:** der = blue, die = red, das = green, Plural = orange; every coloured word also has an underline or label. All colours pass the axe contrast check (`npm run a11y`).
- **Start page:** a whiteboard with weekday and date.
- **Calm:** one task at a time, no italics, no justified text, small slide-ins and shakes only (off with `prefers-reduced-motion`). No read-aloud, no sounds.
- **Reading aids (switchable, never saved):** "Weiter Abstand", "OpenDyslexic-Schrift", "Lesehilfe" (dimmed page with one bright line that follows the finger or mouse), A−/A+.
- **Tables:** short tables (`compact: true`) stay tables; tables with long cells become one card per row on narrow screens, two cards side by side from 640 px, so no words are stacked in narrow columns.
- **Print:** "Merkblatt drucken" prints the explanation on white paper without buttons and labs.

