/* eslint-disable import/no-named-as-default-member */
import enTranslation from '@/locales/en/translation.json';
import hrTranslation from '@/locales/hr/translation.json';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const LANGUAGES = {
  HR: 'hr',
  EN: 'en',
};

const resources = {
  [LANGUAGES.EN]: {
    translation: enTranslation
  },
  [LANGUAGES.HR]: {
    translation: hrTranslation
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getLocales()[0]?.languageCode === LANGUAGES.HR ? LANGUAGES.HR : LANGUAGES.EN,
    fallbackLng: LANGUAGES.EN,
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;