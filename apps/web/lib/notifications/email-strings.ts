import { asLocale, type NotificationLocale } from './strings';

/**
 * Email copy in the recipient's language.
 *
 * Same reasoning as push: these are sent because of someone else's action, so
 * the language comes from the stored User.locale rather than the request.
 * Values are plain text -- emailLayout() escapes anything interpolated into
 * HTML, so nothing here should contain markup.
 */
type T = {
    subject: (a: Record<string, string>) => string;
    heading: string;
    preview: (a: Record<string, string>) => string;
    body: (a: Record<string, string>) => string[];
    cta: string;
    text: (a: Record<string, string>) => string;
};

type Templates = {
    passwordReset: T; passwordResetCode: T; taskResponse: T; offerAccepted: T;
    taskCompleted: T; offerRejected: T; newMessage: T; newReview: T;
    welcome: T; paymentReceipt: T; taskCancelled: T;
};

const ru: Templates = {
    passwordReset: {
        subject: () => 'Сброс пароля — Dastiyor', heading: 'Сброс пароля',
        preview: () => 'Ссылка для сброса пароля действительна 1 час.',
        body: () => ['Вы запросили сброс пароля. Нажмите кнопку ниже, чтобы задать новый.', 'Ссылка действительна 1 час. Если вы не запрашивали сброс, просто проигнорируйте письмо.'],
        cta: 'Сбросить пароль', text: (a) => `Сброс пароля: ${a.link}`,
    },
    passwordResetCode: {
        subject: () => 'Код для сброса пароля — Dastiyor', heading: 'Код подтверждения',
        preview: (a) => `Ваш код: ${a.code}`,
        body: (a) => [`Ваш код для сброса пароля: ${a.code}`, 'Код действителен 15 минут. Если вы не запрашивали сброс, проигнорируйте письмо.'],
        cta: '', text: (a) => `Код для сброса пароля: ${a.code}`,
    },
    taskResponse: {
        subject: (a) => `Новое предложение на задание "${a.task}"`, heading: 'Новое предложение',
        preview: (a) => `${a.provider} предложил ${a.price} с.`,
        body: (a) => [`На ваше задание «${a.task}» поступило новое предложение от ${a.provider}.`, `Предложенная цена: ${a.price} с.`],
        cta: 'Посмотреть предложение', text: (a) => `Новое предложение на "${a.task}" от ${a.provider}. Цена: ${a.price} с. Ссылка: ${a.link}`,
    },
    offerAccepted: {
        subject: (a) => `Ваш отклик принят — "${a.task}"`, heading: 'Отклик принят!',
        preview: (a) => `Вас выбрали исполнителем задания "${a.task}".`,
        body: (a) => [`Вас выбрали исполнителем задания «${a.task}».`, 'Свяжитесь с заказчиком, чтобы обсудить детали.'],
        cta: 'Открыть задание', text: (a) => `Ваш отклик на "${a.task}" принят. Ссылка: ${a.link}`,
    },
    taskCompleted: {
        subject: (a) => `Задание выполнено — "${a.task}"`, heading: 'Задание выполнено',
        preview: (a) => `Заказчик подтвердил выполнение задания "${a.task}".`,
        body: (a) => [`Заказчик подтвердил выполнение задания «${a.task}».`, a.earnings ? `Ваш баланс пополнен на ${a.earnings} с.` : ''].filter(Boolean),
        cta: 'Открыть задание', text: (a) => `Задание "${a.task}" выполнено.${a.earnings ? ` Баланс пополнен на ${a.earnings} с.` : ''} Ссылка: ${a.link}`,
    },
    offerRejected: {
        subject: (a) => `Отклик отклонён — "${a.task}"`, heading: 'Отклик отклонён',
        preview: (a) => `Ваш отклик на "${a.task}" отклонён.`,
        body: (a) => [`Ваш отклик на задание «${a.task}» был отклонён заказчиком.`, 'Не расстраивайтесь — на площадке много других заданий.'],
        cta: 'Найти задания', text: (a) => `Ваш отклик на "${a.task}" отклонён. Ссылка: ${a.link}`,
    },
    newMessage: {
        subject: (a) => `Новое сообщение от ${a.sender}`, heading: 'Новое сообщение',
        preview: (a) => `${a.sender}: ${a.excerpt}`,
        body: (a) => [`${a.sender} написал вам:`, a.excerpt],
        cta: 'Ответить', text: (a) => `${a.sender}: ${a.excerpt} — ${a.link}`,
    },
    newReview: {
        subject: () => 'Вы получили новый отзыв', heading: 'Новый отзыв',
        preview: (a) => `Оценка: ${a.rating}/5`,
        body: (a) => [`${a.reviewer} оставил вам отзыв: ${a.rating}/5.`, a.comment || ''].filter(Boolean),
        cta: 'Посмотреть отзыв', text: (a) => `Новый отзыв ${a.rating}/5 от ${a.reviewer}. Ссылка: ${a.link}`,
    },
    welcome: {
        subject: () => 'Добро пожаловать в Dastiyor!', heading: 'Добро пожаловать!',
        preview: () => 'Ваш аккаунт создан.',
        body: (a) => [`Здравствуйте, ${a.name}! Ваш аккаунт создан.`, 'Разместите задание или найдите работу — всё в одном месте.'],
        cta: 'Открыть Dastiyor', text: (a) => `Добро пожаловать, ${a.name}! ${a.link}`,
    },
    paymentReceipt: {
        subject: () => 'Оплата получена — Dastiyor', heading: 'Оплата получена',
        preview: (a) => `Сумма: ${a.amount} с.`,
        body: (a) => [`Мы получили вашу оплату на сумму ${a.amount} с.`, a.plan ? `Тариф: ${a.plan}.` : ''].filter(Boolean),
        cta: 'Открыть профиль', text: (a) => `Оплата ${a.amount} с. получена. ${a.link}`,
    },
    taskCancelled: {
        subject: (a) => `Задание отменено — "${a.task}"`, heading: 'Задание отменено',
        preview: (a) => `Заказчик отменил задание "${a.task}".`,
        body: (a) => [`Заказчик отменил задание «${a.task}».`, 'Посмотрите другие доступные задания.'],
        cta: 'Найти задания', text: (a) => `Задание "${a.task}" отменено. ${a.link}`,
    },
};

const tj: Templates = {
    passwordReset: {
        subject: () => 'Барқарорсозии парол — Dastiyor', heading: 'Барқарорсозии парол',
        preview: () => 'Пайванд 1 соат эътибор дорад.',
        body: () => ['Шумо барқарорсозии паролро дархост кардед. Барои гузоштани пароли нав тугмаро пахш кунед.', 'Пайванд 1 соат эътибор дорад. Агар шумо дархост накарда бошед, ин номаро нодида гиред.'],
        cta: 'Барқарорсозии парол', text: (a) => `Барқарорсозии парол: ${a.link}`,
    },
    passwordResetCode: {
        subject: () => 'Рамзи барқарорсозии парол — Dastiyor', heading: 'Рамзи тасдиқ',
        preview: (a) => `Рамзи шумо: ${a.code}`,
        body: (a) => [`Рамзи шумо барои барқарорсозии парол: ${a.code}`, 'Рамз 15 дақиқа эътибор дорад. Агар дархост накарда бошед, нодида гиред.'],
        cta: '', text: (a) => `Рамзи барқарорсозии парол: ${a.code}`,
    },
    taskResponse: {
        subject: (a) => `Пешниҳоди нав ба супориши "${a.task}"`, heading: 'Пешниҳоди нав',
        preview: (a) => `${a.provider} ${a.price} с. пешниҳод кард.`,
        body: (a) => [`Ба супориши «${a.task}» аз ${a.provider} пешниҳоди нав омад.`, `Нархи пешниҳодшуда: ${a.price} с.`],
        cta: 'Дидани пешниҳод', text: (a) => `Пешниҳоди нав ба "${a.task}" аз ${a.provider}. Нарх: ${a.price} с. Пайванд: ${a.link}`,
    },
    offerAccepted: {
        subject: (a) => `Посухи шумо қабул шуд — "${a.task}"`, heading: 'Посух қабул шуд!',
        preview: (a) => `Шуморо иҷрокунандаи "${a.task}" интихоб карданд.`,
        body: (a) => [`Шуморо иҷрокунандаи супориши «${a.task}» интихоб карданд.`, 'Барои муҳокимаи тафсилот бо фармоишгар тамос гиред.'],
        cta: 'Кушодани супориш', text: (a) => `Посухи шумо ба "${a.task}" қабул шуд. Пайванд: ${a.link}`,
    },
    taskCompleted: {
        subject: (a) => `Супориш иҷро шуд — "${a.task}"`, heading: 'Супориш иҷро шуд',
        preview: (a) => `Фармоишгар иҷрои "${a.task}"-ро тасдиқ кард.`,
        body: (a) => [`Фармоишгар иҷрои супориши «${a.task}»-ро тасдиқ кард.`, a.earnings ? `Ба ҳисоби шумо ${a.earnings} с. илова шуд.` : ''].filter(Boolean),
        cta: 'Кушодани супориш', text: (a) => `Супориши "${a.task}" иҷро шуд.${a.earnings ? ` Ба ҳисоб ${a.earnings} с. илова шуд.` : ''} Пайванд: ${a.link}`,
    },
    offerRejected: {
        subject: (a) => `Посух рад шуд — "${a.task}"`, heading: 'Посух рад шуд',
        preview: (a) => `Посухи шумо ба "${a.task}" рад шуд.`,
        body: (a) => [`Посухи шумо ба супориши «${a.task}» аз ҷониби фармоишгар рад карда шуд.`, 'Ғам нахӯред — дар платформа супоришҳои дигар бисёранд.'],
        cta: 'Ёфтани супоришҳо', text: (a) => `Посухи шумо ба "${a.task}" рад шуд. Пайванд: ${a.link}`,
    },
    newMessage: {
        subject: (a) => `Паёми нав аз ${a.sender}`, heading: 'Паёми нав',
        preview: (a) => `${a.sender}: ${a.excerpt}`,
        body: (a) => [`${a.sender} ба шумо навишт:`, a.excerpt],
        cta: 'Ҷавоб додан', text: (a) => `${a.sender}: ${a.excerpt} — ${a.link}`,
    },
    newReview: {
        subject: () => 'Шумо шарҳи нав гирифтед', heading: 'Шарҳи нав',
        preview: (a) => `Баҳо: ${a.rating}/5`,
        body: (a) => [`${a.reviewer} ба шумо шарҳ гузошт: ${a.rating}/5.`, a.comment || ''].filter(Boolean),
        cta: 'Дидани шарҳ', text: (a) => `Шарҳи нав ${a.rating}/5 аз ${a.reviewer}. Пайванд: ${a.link}`,
    },
    welcome: {
        subject: () => 'Хуш омадед ба Dastiyor!', heading: 'Хуш омадед!',
        preview: () => 'Аккаунти шумо сохта шуд.',
        body: (a) => [`Салом, ${a.name}! Аккаунти шумо сохта шуд.`, 'Супориш ҷойгир кунед ё кор ёбед — ҳама дар як ҷо.'],
        cta: 'Кушодани Dastiyor', text: (a) => `Хуш омадед, ${a.name}! ${a.link}`,
    },
    paymentReceipt: {
        subject: () => 'Пардохт қабул шуд — Dastiyor', heading: 'Пардохт қабул шуд',
        preview: (a) => `Маблағ: ${a.amount} с.`,
        body: (a) => [`Мо пардохти шуморо ба маблағи ${a.amount} с. гирифтем.`, a.plan ? `Таъриф: ${a.plan}.` : ''].filter(Boolean),
        cta: 'Кушодани профил', text: (a) => `Пардохти ${a.amount} с. қабул шуд. ${a.link}`,
    },
    taskCancelled: {
        subject: (a) => `Супориш бекор карда шуд — "${a.task}"`, heading: 'Супориш бекор шуд',
        preview: (a) => `Фармоишгар супориши "${a.task}"-ро бекор кард.`,
        body: (a) => [`Фармоишгар супориши «${a.task}»-ро бекор кард.`, 'Супоришҳои дигари дастрасро бинед.'],
        cta: 'Ёфтани супоришҳо', text: (a) => `Супориши "${a.task}" бекор шуд. ${a.link}`,
    },
};

const en: Templates = {
    passwordReset: {
        subject: () => 'Reset your password — Dastiyor', heading: 'Reset your password',
        preview: () => 'This link is valid for 1 hour.',
        body: () => ['You asked to reset your password. Use the button below to set a new one.', 'The link is valid for 1 hour. If this was not you, ignore this email.'],
        cta: 'Reset password', text: (a) => `Reset your password: ${a.link}`,
    },
    passwordResetCode: {
        subject: () => 'Your password reset code — Dastiyor', heading: 'Verification code',
        preview: (a) => `Your code: ${a.code}`,
        body: (a) => [`Your password reset code is ${a.code}`, 'The code is valid for 15 minutes. If this was not you, ignore this email.'],
        cta: '', text: (a) => `Password reset code: ${a.code}`,
    },
    taskResponse: {
        subject: (a) => `New offer on "${a.task}"`, heading: 'New offer',
        preview: (a) => `${a.provider} offered ${a.price} TJS.`,
        body: (a) => [`Your task "${a.task}" received a new offer from ${a.provider}.`, `Offered price: ${a.price} TJS.`],
        cta: 'View offer', text: (a) => `New offer on "${a.task}" from ${a.provider}. Price: ${a.price} TJS. Link: ${a.link}`,
    },
    offerAccepted: {
        subject: (a) => `Your offer was accepted — "${a.task}"`, heading: 'Offer accepted!',
        preview: (a) => `You were chosen for "${a.task}".`,
        body: (a) => [`You were chosen to carry out "${a.task}".`, 'Get in touch with the customer to agree the details.'],
        cta: 'Open task', text: (a) => `Your offer on "${a.task}" was accepted. Link: ${a.link}`,
    },
    taskCompleted: {
        subject: (a) => `Task completed — "${a.task}"`, heading: 'Task completed',
        preview: (a) => `The customer confirmed "${a.task}" is done.`,
        body: (a) => [`The customer confirmed that "${a.task}" is done.`, a.earnings ? `${a.earnings} TJS has been added to your balance.` : ''].filter(Boolean),
        cta: 'Open task', text: (a) => `"${a.task}" is complete.${a.earnings ? ` ${a.earnings} TJS added to your balance.` : ''} Link: ${a.link}`,
    },
    offerRejected: {
        subject: (a) => `Offer declined — "${a.task}"`, heading: 'Offer declined',
        preview: (a) => `Your offer on "${a.task}" was declined.`,
        body: (a) => [`Your offer on "${a.task}" was declined by the customer.`, 'There are plenty of other tasks waiting.'],
        cta: 'Browse tasks', text: (a) => `Your offer on "${a.task}" was declined. Link: ${a.link}`,
    },
    newMessage: {
        subject: (a) => `New message from ${a.sender}`, heading: 'New message',
        preview: (a) => `${a.sender}: ${a.excerpt}`,
        body: (a) => [`${a.sender} wrote:`, a.excerpt],
        cta: 'Reply', text: (a) => `${a.sender}: ${a.excerpt} — ${a.link}`,
    },
    newReview: {
        subject: () => 'You received a new review', heading: 'New review',
        preview: (a) => `Rating: ${a.rating}/5`,
        body: (a) => [`${a.reviewer} left you a review: ${a.rating}/5.`, a.comment || ''].filter(Boolean),
        cta: 'View review', text: (a) => `New review ${a.rating}/5 from ${a.reviewer}. Link: ${a.link}`,
    },
    welcome: {
        subject: () => 'Welcome to Dastiyor!', heading: 'Welcome!',
        preview: () => 'Your account is ready.',
        body: (a) => [`Hello ${a.name}, your account is ready.`, 'Post a task or find work — all in one place.'],
        cta: 'Open Dastiyor', text: (a) => `Welcome, ${a.name}! ${a.link}`,
    },
    paymentReceipt: {
        subject: () => 'Payment received — Dastiyor', heading: 'Payment received',
        preview: (a) => `Amount: ${a.amount} TJS`,
        body: (a) => [`We received your payment of ${a.amount} TJS.`, a.plan ? `Plan: ${a.plan}.` : ''].filter(Boolean),
        cta: 'Open profile', text: (a) => `Payment of ${a.amount} TJS received. ${a.link}`,
    },
    taskCancelled: {
        subject: (a) => `Task cancelled — "${a.task}"`, heading: 'Task cancelled',
        preview: (a) => `The customer cancelled "${a.task}".`,
        body: (a) => [`The customer cancelled "${a.task}".`, 'Have a look at the other tasks available.'],
        cta: 'Browse tasks', text: (a) => `"${a.task}" was cancelled. ${a.link}`,
    },
};

const ALL: Record<NotificationLocale, Templates> = { ru, tj, en };

export function emailStrings(locale: string | null | undefined): Templates {
    return ALL[asLocale(locale)];
}

/**
 * Shared header/footer chrome. Was hardcoded Russian in emailLayout(), so an
 * otherwise-English email still ended with a Russian tagline and disclaimer.
 * `lang` feeds the <html lang> attribute (screen readers, Gmail translation).
 */
type Chrome = { lang: string; tagline: string; needHelp: string; automated: string };

const CHROME: Record<NotificationLocale, Chrome> = {
    ru: {
        lang: 'ru',
        tagline: 'Dastiyor — онлайн-маркетплейс услуг в Таджикистане.',
        needHelp: 'Нужна помощь?',
        automated: 'Это автоматическое письмо — отвечать на него не нужно.',
    },
    tj: {
        lang: 'tg',
        tagline: 'Dastiyor — бозори онлайни хизматрасонӣ дар Тоҷикистон.',
        needHelp: 'Кӯмак лозим аст?',
        automated: 'Ин номаи худкор аст — ба он ҷавоб додан лозим нест.',
    },
    en: {
        lang: 'en',
        tagline: 'Dastiyor — the online services marketplace in Tajikistan.',
        needHelp: 'Need help?',
        automated: 'This is an automated email — no need to reply.',
    },
};

export function emailChrome(locale: string | null | undefined): Chrome {
    return CHROME[asLocale(locale)];
}
