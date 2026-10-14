import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { strings, type Strings } from './strings';

// The app is German only: this just hands the German interface texts to every screen.
interface Ctx {
  s: Strings;
}
const LangContext = createContext<Ctx>({ s: strings });

export function LangProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ s: strings }), []);
  useEffect(() => {
    document.documentElement.lang = 'de';
  }, []);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
