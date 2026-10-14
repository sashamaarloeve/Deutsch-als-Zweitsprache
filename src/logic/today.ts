// Weekday and date for the whiteboard on the start page, in German ("Mittwoch", "14. Oktober 2026").
// The date comes from the device clock; nothing is stored.
export function todayInGerman(now: Date = new Date()): { weekday: string; date: string } {
  return {
    weekday: now.toLocaleDateString('de-DE', { weekday: 'long' }),
    date: now.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}
