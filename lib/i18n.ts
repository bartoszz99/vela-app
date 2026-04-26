import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
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

function detectDeviceLang(): Lang {
  try {
    if (Platform.OS === 'web') {
      const locale = (navigator as Navigator).language ?? '';
      return locale.toLowerCase().startsWith('pl') ? 'pl' : 'en';
    }
    // Native: expo-localization (synchronous API)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    const locales = getLocales();
    const tag = locales?.[0]?.languageTag ?? '';
    return tag.toLowerCase().startsWith('pl') ? 'pl' : 'en';
  } catch {
    return 'en';
  }
}

export async function loadSavedLanguage(): Promise<Lang> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved === 'pl' || saved === 'en') return saved; // user's explicit choice wins
  } catch {}
  return detectDeviceLang(); // first launch: auto-detect
}

export async function saveLanguage(lang: Lang): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang);
}
