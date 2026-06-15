import type { Locale } from './i18n';

/**
 * App locale codes are not all valid BCP-47 tags ('tj' is not — Tajik is 'tg').
 * Passing an invalid tag to Intl / toLocale*String throws RangeError on strict
 * engines and can crash hot-path date rendering (chat, reviews). Map to valid
 * tags and always fall back safely.
 */
const INTL_LOCALE: Record<Locale, string> = {
  ru: 'ru-RU',
  tj: 'tg-TJ',
  en: 'en-US',
};

export function toIntlLocale(locale: Locale | string | undefined): string {
  return INTL_LOCALE[(locale ?? 'ru') as Locale] ?? 'en-US';
}

export function formatTime(
  iso: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  try {
    return date.toLocaleTimeString(toIntlLocale(locale), options);
  } catch {
    return date.toLocaleTimeString('en-US', options);
  }
}

export function formatDate(
  iso: string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  try {
    return date.toLocaleDateString(toIntlLocale(locale), options);
  } catch {
    return date.toLocaleDateString('en-US', options);
  }
}
