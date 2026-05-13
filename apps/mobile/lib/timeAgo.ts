import type { Locale } from './i18n';

const L = {
  en: {
    justNow: 'just now',
    min: (n: number) => `${n}m ago`,
    h: (n: number) => `${n}h ago`,
    yesterday: 'yesterday',
    d: (n: number) => `${n}d ago`,
    w: (n: number) => `${n}w ago`,
    mo: (n: number) => `${n}mo ago`,
    y: (n: number) => `${n}y ago`,
  },
  ru: {
    justNow: 'только что',
    min: (n: number) => `${n} мин. назад`,
    h: (n: number) => `${n} ч. назад`,
    yesterday: 'вчера',
    d: (n: number) => `${n} дн. назад`,
    w: (n: number) => `${n} нед. назад`,
    mo: (n: number) => `${n} мес. назад`,
    y: (n: number) => `${n} г. назад`,
  },
  tj: {
    justNow: 'ҳозир',
    min: (n: number) => `${n} дақ. пеш`,
    h: (n: number) => `${n} с. пеш`,
    yesterday: 'дирӯз',
    d: (n: number) => `${n} р. пеш`,
    w: (n: number) => `${n} ҳ. пеш`,
    mo: (n: number) => `${n} м. пеш`,
    y: (n: number) => `${n} й. пеш`,
  },
};

export function timeAgo(dateStr: string, locale: Locale = 'ru'): string {
  if (!dateStr) return '';
  const l = L[locale];
  let date: Date;

  // Parse "DD.MM.YYYY" (ru-RU locale format from API)
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('.').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) return dateStr;

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (mins < 1) return l.justNow;
  if (mins < 60) return l.min(mins);
  if (hours < 24) return l.h(hours);
  if (days === 1) return l.yesterday;
  if (days < 7) return l.d(days);
  if (weeks < 5) return l.w(weeks);
  if (months < 12) return l.mo(months);
  return l.y(Math.floor(months / 12));
}
