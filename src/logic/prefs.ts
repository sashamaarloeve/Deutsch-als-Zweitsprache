// Display settings for easier reading. Nothing is saved: every visit starts with the defaults
// (normal size, normal spacing, normal font, no reading aid).
export const ZOOMS = [0.9, 1, 1.15, 1.3, 1.5];

export interface Prefs {
  zoom: number;
  wide: boolean; // wider letter and line spacing
  dys: boolean; // OpenDyslexic font
  ruler: boolean; // reading aid: only one line is bright
}

export const defaultPrefs = (): Prefs => ({ zoom: 1, wide: false, dys: false, ruler: false });

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  root.dataset.spacing = p.wide ? 'wide' : 'normal';
  root.dataset.font = p.dys ? 'dys' : 'normal';
  root.style.setProperty('--zoom', String(p.zoom));
}
