import en from '@/messages/en.json';
import hr from '@/messages/hr.json';

export type Locale = 'en' | 'hr';

export const locales: Locale[] = ['en', 'hr'];
export const defaultLocale: Locale = 'en';

const messages = { en, hr };

export function getMessages(locale: Locale) {
  return messages[locale] || messages[defaultLocale];
}

export type Messages = typeof en;
