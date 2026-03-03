/**
 * Static task data for landing page "Popular Tasks" and preview URLs (/tasks/preview-0, etc.)
 */
export const PREVIEW_TASKS = [
    {
        title: 'Генеральная уборка 3-х комнатной квартиры после ремонта',
        category: 'Уборка',
        budget: '450 TJS',
        location: 'Душанбе, Центр',
        deadline: 'Сегодня',
        timeAgo: '10 мин назад',
        description: 'Требуется качественная уборка после ремонта: мытьё окон, полов, стен, санузла. Площадь около 80 м².',
    },
    {
        title: 'Заменить смеситель в ванной и починить розетку',
        category: 'Сантехника',
        budget: '150 TJS',
        location: 'Душанбе, 46 мкр',
        deadline: 'Завтра',
        timeAgo: '25 мин назад',
        description: 'Нужен сантехник и электрик: замена смесителя, ремонт розетки в ванной.',
    },
    {
        title: 'Нужен репетитор по английскому языку для ребенка',
        category: 'Обучение',
        budget: '80 TJS / час',
        location: 'Онлайн',
        deadline: 'Гибкий график',
        timeAgo: '1 час назад',
        description: 'Ищем репетитора английского для ребёнка 10 лет. Занятия онлайн 2–3 раза в неделю.',
    },
] as const;

export type PreviewTask = (typeof PREVIEW_TASKS)[number];
