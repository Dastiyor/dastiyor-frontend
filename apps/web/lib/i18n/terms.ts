import type { Locale } from './types';

/**
 * Categories, cities and the negotiable-budget label arrive from the API as
 * canonical Russian strings and are stored/filtered that way. These maps
 * localize them for DISPLAY ONLY -- the value sent back to the API must stay
 * the canonical Russian string.
 *
 * Kept in sync with apps/mobile/lib/terms.ts.
 */
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
    'Другое': 'Дигар',
    'Душанбе': 'Душанбе',
    'Худжанд': 'Хуҷанд',
    'Бохтар': 'Бохтар',
    'Кӯлоб': 'Кӯлоб',
    'Истаравшан': 'Истаравшан',
    'Турсунзода': 'Турсунзода',
    'Вахш': 'Вахш',
    'Онлайн': 'Онлайн',
    'Договорная': 'Шартнома',
};

const MAPS: Record<Locale, Record<string, string>> = { ru: {}, tj: TJ };

/** Localize a canonical category/city/budget value. Unknown values pass through. */
export function localizeTerm(value: string, locale: Locale): string {
    return MAPS[locale]?.[value] ?? value;
}
