import { NextResponse } from 'next/server';

export const revalidate = 3600;

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

export async function GET() {
    return NextResponse.json({ categories: CATEGORIES, cities: CITIES });
}
