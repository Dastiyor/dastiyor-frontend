/**
 * Fallback category/city lists, shared by the client and `/api/config`.
 *
 * Categories are managed in the admin dashboard (dastiyor-admin → Categories),
 * which writes to the shared `Category` table; `/api/config` serves that table
 * and drops back to this list when it is empty or unreachable. Client
 * components use it as the first-paint value before the fetch resolves.
 *
 * Lives here rather than in the route because the route imports Prisma, and
 * client components must not pull that into the browser bundle.
 *
 * Cities have no table and stay static — edit here and redeploy to change them.
 */
export const CATEGORIES = [
    'Ремонт',
    'Уборка',
    'Доставка',
    'Сантехника',
    'Электрик',
    'IT и Веб',
    'Компьютерная помощь',
    'Ремонт техники',
    'Обучение',
    'Дизайн',
    'Красота',
    'Фото и видео',
    'Мероприятия',
    'Юридические услуги',
    'Виртуальный помощник',
];

export const CITIES = [
    'Душанбе',
    'Худжанд',
    'Бохтар',
    'Кӯлоб',
    'Истаравшан',
    'Турсунзода',
    'Вахш',
    'Онлайн',
];

/**
 * Preset durations for a response's `estimatedTime`.
 *
 * This used to be a free-text box. Providers typed whatever came to mind --
 * "2", "1 hour", "2 hours" -- so customers saw a bare number with no unit, and
 * anything typed in English stayed English for a Russian or Tajik reader.
 * Canonical Russian like the category/city values, localized for display only
 * through `localizeTerm`.
 *
 * Not enforced server-side on purpose: already-shipped app versions still post
 * free text, and rejecting it would break responses from every phone that has
 * not updated. Older values simply pass through `localizeTerm` unchanged.
 */
export const ESTIMATED_TIMES = [
    'До 1 часа',
    '1-2 часа',
    '2-4 часа',
    'До 1 дня',
    '1-2 дня',
    '3-5 дней',
    'Более недели',
];
