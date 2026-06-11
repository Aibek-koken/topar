import 'intl-pluralrules';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import kk from '@/locales/kk.json';
import ru from '@/locales/ru.json';
import type { Lang, LocalizedText } from './types';

const LANG_KEY = 'topar.lang';

function deviceLang(): Lang {
  const code = Localization.getLocales()[0]?.languageCode ?? 'ru';
  if (code === 'kk') return 'kk';
  if (code === 'en') return 'en';
  return 'ru';
}

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    kk: { translation: kk },
    en: { translation: en },
  },
  lng: deviceLang(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

// Restore the language the user picked last time
AsyncStorage.getItem(LANG_KEY).then((saved) => {
  if (saved && saved !== i18n.language) i18n.changeLanguage(saved);
});

export async function setAppLanguage(lang: Lang) {
  await AsyncStorage.setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);
}

export function currentLang(): Lang {
  const lang = i18n.language?.slice(0, 2);
  return lang === 'kk' || lang === 'en' ? lang : 'ru';
}

/** Pick the localized variant of a JSONB text field, falling back to Russian. */
export function lt(text: LocalizedText | undefined): string {
  if (!text) return '';
  return text[currentLang()] ?? text.ru;
}

export default i18n;
