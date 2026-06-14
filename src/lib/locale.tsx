import { createContext, useContext, useState, type ReactNode } from "react";
import { setLocale as paraglideSetLocale, getLocale, locales } from "../paraglide/runtime.js";
import * as m from "../paraglide/messages.js";

type Locale = (typeof locales)[number];

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getLocale);

  function changeLocale(next: Locale) {
    void paraglideSetLocale(next, { reload: false });
    setLocaleState(next);
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale: changeLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within <LocaleProvider>");
  return ctx;
}

// Use this in components that only need translated strings (not setLocale).
// Calling it subscribes the component to locale changes so m.*() calls re-render correctly.
export function useTranslation() {
  useLocale();
  return m;
}
