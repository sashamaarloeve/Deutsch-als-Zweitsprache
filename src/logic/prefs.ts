// Display settings for easier reading. Nothing is saved: every visit starts with the defaults
// (normal size, normal spacing).
export const ZOOMS = [0.9, 1, 1.15, 1.3, 1.5];

export interface Prefs { zoom: number; wide: boolean }

export const defaultPrefs = (): Prefs => ({ zoom: 1, wide: false });

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  root.dataset.spacing = p.wide ? 'wide' : 'normal';
  root.style.setProperty('--zoom', String(p.zoom));
}
