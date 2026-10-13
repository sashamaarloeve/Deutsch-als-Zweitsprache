import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { Lang } from '../content/load';
import { strings, type Strings } from './strings';

interface Ctx {
  lang: Lang;
  s: Strings;
  setLang: (l: Lang) => void;
}
const LangContext = createContext<Ctx>({ lang: 'de', s: strings.de, setLang: () => {} });

// The app is German only. The English texts stay in strings.tsx for now (the type needs them) but are never shown.
export function LangProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ lang: 'de' as Lang, s: strings.de, setLang: () => {} }), []);
  useEffect(() => {
    document.documentElement.lang = 'de';
  }, []);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
