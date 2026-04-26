import { createContext, useContext, useEffect, useState } from 'react';
import { translate, loadSavedLanguage, saveLanguage, type Lang } from '@/lib/i18n';

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  t: (key: string, opts?: Record<string, unknown>) => any;
}

const LanguageContext = createContext<LanguageCtx>({
  lang: 'pl',
  setLang: async () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('pl');

  useEffect(() => {
    loadSavedLanguage().then(setLangState);
  }, []);

  const setLang = async (l: Lang) => {
    await saveLanguage(l);
    setLangState(l);
  };

  const t = (key: string, opts?: Record<string, unknown>) =>
    translate(lang, key, opts);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
