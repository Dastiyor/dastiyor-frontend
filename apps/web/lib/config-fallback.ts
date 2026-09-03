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
