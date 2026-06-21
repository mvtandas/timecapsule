import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { translations, type Locale } from './translations';

const STORE_KEY = '@voorcap_lang';

/** All supported locales with their native names + flags (for pickers). */
export const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

const SUPPORTED: Locale[] = LANGUAGES.map((l) => l.code);

export const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

function deviceLocale(): Locale {
  const code = getLocales()?.[0]?.languageCode;
  return code && SUPPORTED.includes(code as Locale) ? (code as Locale) : 'en';
}

const initial = deviceLocale();
i18n.locale = initial;

interface LangState {
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
  init: () => Promise<void>;
}

export const useLanguage = create<LangState>((set) => ({
  locale: initial,
  setLocale: async (l) => {
    i18n.locale = l;
    set({ locale: l });
    try {
      await AsyncStorage.setItem(STORE_KEY, l);
    } catch {
      // ignore
    }
  },
  init: async () => {
    try {
      const saved = (await AsyncStorage.getItem(STORE_KEY)) as Locale | null;
      if (saved && SUPPORTED.includes(saved)) {
        i18n.locale = saved;
        set({ locale: saved });
      }
    } catch {
      // ignore
    }
  },
}));

/** Translate with the current locale (non-reactive — for use outside components). */
export const t = (key: string, opts?: object) => i18n.t(key, opts);

/**
 * Reactive translation hook — re-renders the component when the language
 * changes. Use inside components: `const t = useT(); <Text>{t('welcome.logIn')}</Text>`.
 */
export function useT() {
  const locale = useLanguage((s) => s.locale);
  return (key: string, opts?: object) => i18n.t(key, { locale, ...opts });
}

export { SUPPORTED };
