/**
 * Notification text in the recipient's language.
 *
 * Notifications are triggered by someone else's action -- the customer accepts,
 * the provider is told -- so the language cannot come from the request. It is
 * read from the recipient's stored `locale`.
 *
 * Message notifications are not here: their title is the sender's name and
 * their body is the message itself, both user content.
 */
export type NotificationLocale = 'ru' | 'tj' | 'en';

export function asLocale(value: string | null | undefined): NotificationLocale {
    return value === 'tj' || value === 'en' ? value : 'ru';
}

type Strings = {
    newResponseTitle: string;
    newResponseBody: (provider: string, price: string, task: string) => string;
    acceptedTitle: string;
    acceptedBody: (task: string) => string;
    completedTitle: string;
    completedBody: (task: string, credited: number) => string;
    rejectedTitle: string;
    rejectedBody: (task: string) => string;
};

const STRINGS: Record<NotificationLocale, Strings> = {
    ru: {
        newResponseTitle: 'Новое предложение',
        newResponseBody: (p, price, t) => `${p} предложил ${price} с. за "${t}"`,
        acceptedTitle: 'Отклик принят!',
        acceptedBody: (t) => `Вас выбрали исполнителем задания "${t}"`,
        completedTitle: 'Задание выполнено',
        completedBody: (t, c) =>
            `Заказчик подтвердил выполнение задания "${t}".${c > 0 ? ` Баланс пополнен на ${c} с.` : ''}`,
        rejectedTitle: 'Отклик отклонен',
        rejectedBody: (t) => `Ваш отклик на задание "${t}" был отклонен заказчиком.`,
    },
    tj: {
        newResponseTitle: 'Пешниҳоди нав',
        newResponseBody: (p, price, t) => `${p} барои "${t}" ${price} с. пешниҳод кард`,
        acceptedTitle: 'Посух қабул шуд!',
        acceptedBody: (t) => `Шуморо иҷрокунандаи супориши "${t}" интихоб карданд`,
        completedTitle: 'Супориш иҷро шуд',
        completedBody: (t, c) =>
            `Фармоишгар иҷрои супориши "${t}"-ро тасдиқ кард.${c > 0 ? ` Ба ҳисоб ${c} с. илова шуд.` : ''}`,
        rejectedTitle: 'Посух рад шуд',
        rejectedBody: (t) => `Посухи шумо ба супориши "${t}" аз ҷониби фармоишгар рад карда шуд.`,
    },
    en: {
        newResponseTitle: 'New offer',
        newResponseBody: (p, price, t) => `${p} offered ${price} TJS for "${t}"`,
        acceptedTitle: 'Offer accepted!',
        acceptedBody: (t) => `You were chosen for "${t}"`,
        completedTitle: 'Task completed',
        completedBody: (t, c) =>
            `The customer confirmed "${t}" is done.${c > 0 ? ` ${c} TJS added to your balance.` : ''}`,
        rejectedTitle: 'Offer declined',
        rejectedBody: (t) => `Your offer on "${t}" was declined by the customer.`,
    },
};

export function notificationStrings(locale: string | null | undefined): Strings {
    return STRINGS[asLocale(locale)];
}

/**
 * Notification text is written once, at the moment someone else's action fires
 * it -- so it froze in whatever language the recipient was using back then, and
 * switching the app language did nothing to the list. The ingredients are stored
 * alongside it in `Notification.params` so the read path can rebuild the text in
 * the reader's current language instead.
 *
 * Rows written before that column existed have no params: they keep the text
 * they were saved with.
 */
export type NotificationParams = {
    task?: string;
    provider?: string;
    price?: string;
    credited?: number;
};

export function notificationParams(params: NotificationParams): string {
    return JSON.stringify(params);
}

export function renderNotification(
    type: string,
    params: string | null | undefined,
    locale: string | null | undefined,
): { title: string; message: string } | null {
    if (!params) return null;

    let p: NotificationParams;
    try {
        p = JSON.parse(params) as NotificationParams;
    } catch {
        return null;
    }

    const s = notificationStrings(locale);
    switch (type) {
        case 'NEW_OFFER':
            if (!p.provider || !p.price || !p.task) return null;
            return { title: s.newResponseTitle, message: s.newResponseBody(p.provider, p.price, p.task) };
        case 'OFFER_ACCEPTED':
            if (!p.task) return null;
            return { title: s.acceptedTitle, message: s.acceptedBody(p.task) };
        case 'TASK_COMPLETED':
            if (!p.task) return null;
            return { title: s.completedTitle, message: s.completedBody(p.task, p.credited ?? 0) };
        case 'OFFER_REJECTED':
            if (!p.task) return null;
            return { title: s.rejectedTitle, message: s.rejectedBody(p.task) };
        default:
            return null;
    }
}
