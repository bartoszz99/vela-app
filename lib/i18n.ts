import AsyncStorage from '@react-native-async-storage/async-storage';
import pl from '../locales/pl.json';
import en from '../locales/en.json';

export const LANG_KEY = '@vela_language';
export type Lang = 'pl' | 'en';

const TRANSLATIONS: Record<Lang, Record<string, unknown>> = { pl, en };

function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, key) => {
    if (cur !== null && typeof cur === 'object') {
      return (cur as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function translate(lang: Lang, key: string, opts?: Record<string, unknown>): unknown {
  const val = get(TRANSLATIONS[lang], key) ?? get(TRANSLATIONS['pl'], key);
  if (val === undefined) return key;
  if (typeof val !== 'string') return val;
  if (!opts) return val;
  return val.replace(/%\{(\w+)\}/g, (_, k) => String(opts[k] ?? `%{${k}}`));
}

export async function loadSavedLanguage(): Promise<Lang> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved === 'pl' || saved === 'en') return saved;
  } catch {}
  return 'pl';
}

export async function saveLanguage(lang: Lang): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang);
}
