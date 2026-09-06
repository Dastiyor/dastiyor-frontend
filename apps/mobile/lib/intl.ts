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

  // A plain date in ru/tj is DD.MM.YYYY. Hermes' ICU data varies by platform and
  // 'tg-TJ' in particular falls through to the en-US branch below, which renders
  // 5 September as the ambiguous "9/5/2026". Build it directly instead; callers
  // that pass options want a specific shape and still go through Intl.
  if (!options && locale !== 'en') {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }

  try {
    return date.toLocaleDateString(toIntlLocale(locale), options);
  } catch {
    return date.toLocaleDateString('en-US', options);
  }
}

/**
 * Group thousands with a non-breaking space. Mirrors formatMoney in
 * apps/web/lib/format-budget.ts -- the server formats task budgets, the client
 * formats response prices, and they must look the same on one screen.
 */
export function formatMoney(value: string | number | null | undefined): string {
  if (value == null || String(value).trim() === '') return '';
  const digits = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(digits)) return digits;
  const [whole, fraction] = digits.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/**
 * Plural form for a count. Russian needs three forms, Tajik has no numeric
 * agreement (one form), English two -- so `forms` is [one, few, many] and the
 * locales that need fewer just repeat.
 */
export function plural(count: number, locale: Locale, forms: readonly [string, string, string]): string {
  if (locale !== 'ru') return count === 1 ? forms[0] : forms[2];
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
