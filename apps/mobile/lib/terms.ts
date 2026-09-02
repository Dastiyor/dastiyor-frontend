import type { Locale } from './i18n';

/**
 * Categories and cities arrive from /api/config as canonical Russian strings and
 * are stored/filtered that way. These maps localize them for DISPLAY ONLY — the
 * value sent back to the API must stay the canonical Russian string.
 */
const EN: Record<string, string> = {
  'Ремонт': 'Repair',
  'Уборка': 'Cleaning',
  'Доставка': 'Delivery',
  'Сантехника': 'Plumbing',
  'Электрик': 'Electrician',
  'IT и Веб': 'IT & Web',
  'Компьютерная помощь': 'Computer Help',
  'Ремонт техники': 'Appliance Repair',
  'Обучение': 'Tutoring',
  'Дизайн': 'Design',
  'Красота': 'Beauty',
  'Фото и видео': 'Photo & Video',
  'Мероприятия': 'Events',
  'Юридические услуги': 'Legal Services',
  'Виртуальный помощник': 'Virtual Assistant',
  'Душанбе': 'Dushanbe',
  'Худжанд': 'Khujand',
  'Бохтар': 'Bokhtar',
  'Кӯлоб': 'Kulob',
  'Истаравшан': 'Istaravshan',
  'Турсунзода': 'Tursunzoda',
  'Вахш': 'Vakhsh',
  'Онлайн': 'Online',
  // Budget: /api/tasks renders negotiable budgets as this Russian string.
  'Договорная': 'Negotiable',
  // Legacy category on older tasks; not in /api/config, so display-only.
  'Другое': 'Other',
};

const TJ: Record<string, string> = {
  'Ремонт': 'Таъмир',
  'Уборка': 'Тозакунӣ',
  'Доставка': 'Таҳвил',
  'Сантехника': 'Сантехника',
  'Электрик': 'Барқчӣ',
  'IT и Веб': 'IT ва Веб',
  'Компьютерная помощь': 'Кӯмаки компютерӣ',
  'Ремонт техники': 'Таъмири техника',
  'Обучение': 'Таълим',
  'Дизайн': 'Дизайн',
  'Красота': 'Зебоӣ',
  'Фото и видео': 'Акс ва видео',
  'Мероприятия': 'Чорабиниҳо',
  'Юридические услуги': 'Хизматрасонии ҳуқуқӣ',
  'Виртуальный помощник': 'Ёрдамчии виртуалӣ',
  'Душанбе': 'Душанбе',
  'Худжанд': 'Хуҷанд',
  'Бохтар': 'Бохтар',
  'Кӯлоб': 'Кӯлоб',
  'Истаравшан': 'Истаравшан',
  'Турсунзода': 'Турсунзода',
  'Вахш': 'Вахш',
  'Онлайн': 'Онлайн',
  'Договорная': 'Шартнома',
  'Другое': 'Дигар',
};

const MAPS: Record<Locale, Record<string, string>> = { ru: {}, en: EN, tj: TJ };

/** Localize a canonical category/city value. Unknown values pass through unchanged. */
export function localizeTerm(value: string, locale: Locale): string {
  return MAPS[locale][value] ?? value;
}
