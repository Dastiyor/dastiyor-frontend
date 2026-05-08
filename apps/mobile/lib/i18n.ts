export type Locale = 'ru' | 'tj';

export const LOCALE_NAMES: Record<Locale, string> = {
  ru: 'Русский',
  tj: 'Тоҷикӣ',
};

const translations = {
  ru: {
    tabs: {
      tasks: 'Задания',
      myTasks: 'Мои задания',
      responses: 'Отклики',
      messages: 'Сообщения',
      profile: 'Профиль',
    },
    home: {
      title: 'Задания',
      search: 'Поиск...',
      empty: 'Задания не найдены',
      responses: 'откл.',
    },
    categories: {
      all: 'Все',
      repair: 'Ремонт',
      cleaning: 'Уборка',
      delivery: 'Доставка',
      plumbing: 'Сантехника',
      electrical: 'Электрик',
      it: 'IT и Веб',
      education: 'Обучение',
      design: 'Дизайн',
      beauty: 'Красота',
      photo: 'Фото и видео',
      events: 'Мероприятия',
    },
    urgency: {
      urgent: 'Срочно',
      normal: 'Обычная',
      low: 'Гибкий',
    },
    my: {
      myTasks: 'Мои задания',
      myResponses: 'Мои отклики',
      create: '+ Создать',
      noTasks: 'Нет заданий',
      createFirst: 'Создайте первое задание',
      createTask: 'Создать задание',
      noResponses: 'Нет откликов',
      browseHint: 'Откликайтесь на задания в ленте',
    },
    status: {
      OPEN: 'Открыто',
      IN_PROGRESS: 'В работе',
      COMPLETED: 'Завершено',
      CANCELLED: 'Отменено',
      PENDING: 'На рассм.',
      ACCEPTED: 'Принят',
      REJECTED: 'Отклонён',
    },
    profile: {
      email: 'Email',
      phone: 'Телефон',
      editProfile: 'Редактировать профиль',
      changePassword: 'Сменить пароль',
      logout: 'Выйти из аккаунта',
      logoutTitle: 'Выйти',
      logoutMessage: 'Вы уверены?',
      logoutCancel: 'Отмена',
      language: 'Язык',
      roles: {
        CUSTOMER: 'Заказчик',
        PROVIDER: 'Исполнитель',
        ADMIN: 'Администратор',
      },
    },
  },
  tj: {
    tabs: {
      tasks: 'Супоришҳо',
      myTasks: 'Супоришҳои ман',
      responses: 'Посухҳо',
      messages: 'Паёмҳо',
      profile: 'Профил',
    },
    home: {
      title: 'Супоришҳо',
      search: 'Ҷустуҷӯ...',
      empty: 'Супориш ёфт нашуд',
      responses: 'посух.',
    },
    categories: {
      all: 'Ҳама',
      repair: 'Таъмир',
      cleaning: 'Тозакунӣ',
      delivery: 'Таҳвил',
      plumbing: 'Сантехника',
      electrical: 'Барқ',
      it: 'IT ва Веб',
      education: 'Таълим',
      design: 'Дизайн',
      beauty: 'Зебоӣ',
      photo: 'Акс ва видео',
      events: 'Чорабиниҳо',
    },
    urgency: {
      urgent: 'Фаврӣ',
      normal: 'Одӣ',
      low: 'Чандир',
    },
    my: {
      myTasks: 'Супоришҳои ман',
      myResponses: 'Посухҳои ман',
      create: '+ Эҷод',
      noTasks: 'Супориш нест',
      createFirst: 'Аввалин супоришро эҷод кунед',
      createTask: 'Эҷоди супориш',
      noResponses: 'Посух нест',
      browseHint: 'Ба супоришҳои лента посух диҳед',
    },
    status: {
      OPEN: 'Кушода',
      IN_PROGRESS: 'Дар кор',
      COMPLETED: 'Анҷом ёфт',
      CANCELLED: 'Бекор',
      PENDING: 'Баррасӣ',
      ACCEPTED: 'Қабул',
      REJECTED: 'Рад',
    },
    profile: {
      email: 'Почтаи электронӣ',
      phone: 'Телефон',
      editProfile: 'Таҳрири профил',
      changePassword: 'Иваз кардани парол',
      logout: 'Баромадан аз ҳисоб',
      logoutTitle: 'Баромадан',
      logoutMessage: 'Шумо мутмаин ҳастед?',
      logoutCancel: 'Бекор',
      language: 'Забон',
      roles: {
        CUSTOMER: 'Фармоишгар',
        PROVIDER: 'Иҷрокунанда',
        ADMIN: 'Маъмур',
      },
    },
  },
} as const;

export type Translations = typeof translations.ru;

export function getTranslations(locale: Locale): Translations {
  return translations[locale];
}
