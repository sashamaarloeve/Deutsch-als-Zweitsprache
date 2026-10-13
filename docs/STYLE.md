# DaZ-Alex – Look and feel (dyslexia-friendly)

- **Background:** light yellow paper (`--paper` #fff9c4), like the yellow paper many dyslexic pupils write on. A button switches to white. No grid lines, no margin line, no patterns behind text.
- **Font:** clear sans-serif already on the device (Verdana, then DejaVu Sans, Arial). No web fonts, no italics, no justified text.
- **Spacing:** line height 1.75, slightly wider letters and words. The button "Weiter Abstand" widens them further. Text size A− / A+.
- **Colour teaches, but is never alone:** der = blue, die = red, das = green, Plural = orange. Every coloured word also has an underline or label. All colours pass the axe contrast check (`npm run a11y`) on yellow and white.
- **One task at a time**, short lines, big tap targets, calm motion (off with `prefers-reduced-motion`).
- **No read-aloud, no sounds.**
