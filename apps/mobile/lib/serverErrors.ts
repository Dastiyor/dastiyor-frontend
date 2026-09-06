import type { Locale } from './i18n';

/**
 * Translations for the error text the API returns.
 *
 * Every `error:` string in `apps/web/app/api/**` is a Russian literal, and the
 * client showed it verbatim — so an English or Tajik user got a dialog with an
 * English title and a Russian body. Localizing 100+ call sites server-side would
 * mean threading a locale through every route; keying off the Russian string is
 * one lookup in one place, and anything not listed falls through unchanged,
 * which is exactly the old behaviour.
 *
 * The Russian text is therefore the key: if you reword a server error, update
 * the key here too (`lib/__tests__/serverErrors.test.ts` checks the keys still
 * exist in the API routes). The Tajik column is duplicated in
 * `apps/web/lib/i18n/api-errors.ts` for the web UI — edit the two together.
 */
const ERRORS: Record<string, readonly [en: string, tj: string]> = {
    // --- auth ---
    'Неверный логин или пароль': ['Incorrect login or password', 'Логин ё парол нодуруст аст'],
    'Аккаунт временно заблокирован. Попробуйте позже.': ['Account temporarily locked. Try again later.', 'Ҳисоб муваққатан баста аст. Баъдтар кӯшиш кунед.'],
    'Заполнены не все обязательные поля': ['Some required fields are missing', 'Ҳамаи майдонҳои ҳатмӣ пур нашудаанд'],
    'Заполнены не все поля': ['Some fields are missing', 'Ҳамаи майдонҳо пур нашудаанд'],
    'Имя должно содержать минимум 2 символа': ['Name must be at least 2 characters', 'Ном бояд ҳадди аққал 2 аломат дошта бошад'],
    'Имя должно содержать от 2 до 100 символов': ['Name must be 2 to 100 characters', 'Ном бояд аз 2 то 100 аломат дошта бошад'],
    'Имя не должно превышать 100 символов': ['Name must not exceed 100 characters', 'Ном набояд аз 100 аломат зиёд бошад'],
    'Неверный формат email': ['Invalid email format', 'Формати email нодуруст аст'],
    'Введите корректный email': ['Enter a valid email', 'Email-и дурустро ворид кунед'],
    'Неверный формат номера телефона. Используйте формат +992XXXXXXXXX': ['Invalid phone number format. Use +992XXXXXXXXX', 'Формати рақами телефон нодуруст. Формати +992XXXXXXXXX-ро истифода баред'],
    'Неверный формат номера. Используйте +992XXXXXXXXX': ['Invalid number format. Use +992XXXXXXXXX', 'Формати рақам нодуруст. +992XXXXXXXXX-ро истифода баред'],
    'Пользователь с таким email уже существует': ['An account with this email already exists', 'Корбар бо ин email аллакай мавҷуд аст'],
    'Пользователь с таким номером телефона уже существует': ['An account with this phone number already exists', 'Корбар бо ин рақами телефон аллакай мавҷуд аст'],
    'Пользователь не найден': ['User not found', 'Корбар ёфт нашуд'],
    'Этот аккаунт использует вход через Google или Apple и не имеет пароля': ['This account signs in with Google or Apple and has no password', 'Ин ҳисоб тавассути Google ё Apple ворид мешавад ва парол надорад'],
    'Этот аккаунт использует вход через Google. Нажмите кнопку ниже.': ['This account signs in with Google. Use the button below.', 'Ин ҳисоб тавассути Google ворид мешавад. Тугмаи поёнро истифода баред.'],
    'Этот аккаунт использует вход через Apple. Нажмите кнопку ниже.': ['This account signs in with Apple. Use the button below.', 'Ин ҳисоб тавассути Apple ворид мешавад. Тугмаи поёнро истифода баред.'],
    'Этот аккаунт использует вход через OAuth. Нажмите кнопку ниже.': ['This account signs in with a social account. Use the button below.', 'Ин ҳисоб тавассути шабакаи иҷтимоӣ ворид мешавад. Тугмаи поёнро истифода баред.'],
    'Этот аккаунт использует вход через соцсети — email так изменить нельзя': ['This account signs in with a social account — the email cannot be changed this way', 'Ин ҳисоб тавассути шабакаҳои иҷтимоӣ ворид мешавад — email-ро ин тавр иваз кардан мумкин нест'],
    'Текущий пароль неверен': ['The current password is incorrect', 'Пароли ҷорӣ нодуруст аст'],
    'Введите текущий пароль, чтобы подтвердить смену email': ['Enter your current password to confirm the email change', 'Барои тасдиқи иваз кардани email пароли ҷориро ворид кунед'],
    'Этот email уже используется': ['This email is already in use', 'Ин email аллакай истифода мешавад'],
    'Этот номер телефона уже используется другим аккаунтом': ['This phone number is already used by another account', 'Ин рақами телефон аллакай аз ҷониби ҳисоби дигар истифода мешавад'],
    'Вход через Apple не настроен': ['Apple sign-in is not configured', 'Воридшавӣ тавассути Apple танзим нашудааст'],
    'Недействительный токен Google': ['Invalid Google token', 'Токени Google нодуруст'],
    'Неполный профиль Apple': ['Incomplete Apple profile', 'Профили Apple нопурра аст'],
    'Неполный профиль Google': ['Incomplete Google profile', 'Профили Google нопурра аст'],
    'Требуется identity token': ['An identity token is required', 'Identity token лозим аст'],
    'Требуется токен': ['A token is required', 'Токен лозим аст'],
    'Требуется токен доступа': ['An access token is required', 'Токени дастрасӣ лозим аст'],
    'Требуется endpoint': ['An endpoint is required', 'Endpoint лозим аст'],

    // --- password reset / phone verification ---
    'Укажите email': ['Enter your email', 'Email-ро ворид кунед'],
    'Укажите email или номер телефона': ['Enter your email or phone number', 'Email ё рақами телефонро ворид кунед'],
    'Укажите email или телефон и пароль': ['Enter your email or phone and your password', 'Email ё телефон ва паролро ворид кунед'],
    'Укажите email или телефон, код и пароль': ['Enter your email or phone, the code and a password', 'Email ё телефон, рамз ва паролро ворид кунед'],
    'Укажите номер телефона': ['Enter your phone number', 'Рақами телефонро ворид кунед'],
    'Укажите номер телефона и код': ['Enter your phone number and the code', 'Рақами телефон ва рамзро ворид кунед'],
    'Укажите номер телефона или email': ['Enter a phone number or an email', 'Рақами телефон ё email-ро ворид кунед'],
    'Укажите токен и пароль': ['Enter the token and a password', 'Токен ва паролро ворид кунед'],
    'Неверный или просроченный код': ['Invalid or expired code', 'Рамзи нодуруст ё мӯҳлаташ гузашта'],
    'Неверный или просроченный код. Запросите новый.': ['Invalid or expired code. Request a new one.', 'Рамзи нодуруст ё мӯҳлаташ гузашта. Рамзи нав дархост кунед.'],
    'Ссылка для сброса пароля недействительна или истекла. Запросите новую.': ['The password reset link is invalid or has expired. Request a new one.', 'Истиноди барқарорсозии парол нодуруст ё мӯҳлаташ гузашта. Истиноди нав дархост кунед.'],
    'Не удалось отправить SMS': ['Could not send the SMS', 'SMS фиристода нашуд'],
    'Слишком много запросов SMS. Попробуйте через 15 минут.': ['Too many SMS requests. Try again in 15 minutes.', 'Дархостҳои SMS аз ҳад зиёданд. Пас аз 15 дақиқа кӯшиш кунед.'],
    'Слишком много попыток подтверждения. Попробуйте через 15 минут.': ['Too many verification attempts. Try again in 15 minutes.', 'Кӯшишҳои тасдиқ аз ҳад зиёданд. Пас аз 15 дақиқа кӯшиш кунед.'],
    'Слишком много попыток. Попробуйте через 15 минут.': ['Too many attempts. Try again in 15 minutes.', 'Кӯшишҳо аз ҳад зиёданд. Пас аз 15 дақиқа кӯшиш кунед.'],
    'Подтвердите номер телефона, чтобы откликаться на задания': ['Verify your phone number to respond to tasks', 'Барои посух додан ба супоришҳо рақами телефонро тасдиқ кунед'],
    'Подтвердите номер телефона, чтобы публиковать задания': ['Verify your phone number to post tasks', 'Барои нашри супоришҳо рақами телефонро тасдиқ кунед'],

    // --- tasks ---
    'Задание не найдено': ['Task not found', 'Супориш ёфт нашуд'],
    'Задание недоступно для принятия': ['This task cannot be accepted', 'Супориш барои қабул дастрас нест'],
    'Не указан ID задания': ['Task id is missing', 'ID-и супориш нишон дода нашудааст'],
    'Некорректный ID задания': ['Invalid task id', 'ID-и супориш нодуруст аст'],
    'Публиковать задания могут только заказчики': ['Only customers can post tasks', 'Танҳо фармоишгарон супориш нашр карда метавонанд'],
    'Доступ запрещён: это не ваше задание': ['Access denied: this is not your task', 'Дастрасӣ манъ аст: ин супориши шумо нест'],
    'Доступ запрещён: вы не участник этого задания': ['Access denied: you are not part of this task', 'Дастрасӣ манъ аст: шумо иштирокчии ин супориш нестед'],
    'Завершить можно только задание в работе': ['Only a task in progress can be completed', 'Танҳо супориши дар кор бударо анҷом додан мумкин аст'],
    'Отменить задание может только его автор': ['Only the task author can cancel it', 'Супоришро танҳо муаллифи он бекор карда метавонад'],
    'Отменить можно только открытые задания. Задания в работе или завершённые отменить нельзя.': ['Only open tasks can be cancelled. Tasks in progress or completed cannot be cancelled.', 'Танҳо супоришҳои кушодаро бекор кардан мумкин аст. Супоришҳои дар кор ё анҷомёфта бекор намешаванд.'],
    'На это задание не назначен исполнитель': ['No provider is assigned to this task', 'Ба ин супориш иҷрокунанда таъин нашудааст'],
    'Этот исполнитель уже назначен': ['This provider is already assigned', 'Ин иҷрокунанда аллакай таъин шудааст'],
    'Это задание больше не принимает отклики': ['This task is no longer accepting responses', 'Ин супориш дигар посух қабул намекунад'],
    'Поисковый запрос должен содержать минимум 2 символа': ['The search query must be at least 2 characters', 'Дархости ҷустуҷӯ бояд ҳадди аққал 2 аломат дошта бошад'],
    'Не удалось выполнить поиск': ['Search failed', 'Ҷустуҷӯ иҷро нашуд'],

    // --- responses ---
    'Отклик не найден': ['Response not found', 'Посух ёфт нашуд'],
    'Не указан ID отклика': ['Response id is missing', 'ID-и посух нишон дода нашудааст'],
    'Откликаться на задания могут только исполнители': ['Only providers can respond to tasks', 'Танҳо иҷрокунандагон ба супоришҳо посух дода метавонанд'],
    'Вы уже откликнулись на это задание': ['You have already responded to this task', 'Шумо аллакай ба ин супориш посух додаед'],
    'Нельзя откликнуться на собственное задание': ['You cannot respond to your own task', 'Ба супориши худ посух додан мумкин нест'],
    'Отклонить можно только отклики в ожидании': ['Only pending responses can be rejected', 'Танҳо посухҳои дар интизорбударо рад кардан мумкин аст'],
    'Отклонять отклики может только автор задания': ['Only the task author can reject responses', 'Танҳо муаллифи супориш посухҳоро рад карда метавонад'],
    'У исполнителя нет отклика в ожидании на это задание': ['This provider has no pending response for this task', 'Иҷрокунанда ба ин супориш посухи дар интизор надорад'],
    'Для отклика нужна активная подписка': ['An active subscription is required to respond', 'Барои посух додан обунаи фаъол лозим аст'],

    // --- reviews ---
    'Оставить отзыв может только автор задания': ['Only the task author can leave a review', 'Танҳо муаллифи супориш шарҳ гузошта метавонад'],
    'Оставить отзыв можно только после завершения задания': ['A review can only be left after the task is completed', 'Шарҳро танҳо пас аз анҷоми супориш гузоштан мумкин аст'],
    'Отзыв на это задание уже оставлен': ['A review for this task already exists', 'Ба ин супориш аллакай шарҳ гузошта шудааст'],
    'Нельзя оставить отзыв самому себе': ['You cannot review yourself', 'Ба худ шарҳ гузоштан мумкин нест'],
    'Оценка должна быть целым числом от 1 до 5': ['The rating must be a whole number from 1 to 5', 'Баҳо бояд адади бутуни аз 1 то 5 бошад'],
    'Комментарий должен быть текстом': ['The comment must be text', 'Шарҳ бояд матн бошад'],
    'Комментарий не должен превышать 1000 символов': ['The comment must not exceed 1000 characters', 'Шарҳ набояд аз 1000 аломат зиёд бошад'],

    // --- messages ---
    'Не указан получатель': ['Recipient is missing', 'Гиранда нишон дода нашудааст'],
    'Получатель не найден': ['Recipient not found', 'Гиранда ёфт нашуд'],
    'Не указан параметр userId': ['The userId parameter is missing', 'Параметри userId нишон дода нашудааст'],
    'Нельзя написать самому себе': ['You cannot message yourself', 'Ба худ навиштан мумкин нест'],
    'Нельзя удалить переписку с самим собой': ['You cannot delete a conversation with yourself', 'Мукотиба бо худро нест кардан мумкин нест'],
    'Переписка не найдена': ['Conversation not found', 'Мукотиба ёфт нашуд'],
    'Сообщение должно содержать текст или изображение': ['A message must contain text or an image', 'Паём бояд матн ё сурат дошта бошад'],
    'Сообщение не должно превышать 2000 символов': ['A message must not exceed 2000 characters', 'Паём набояд аз 2000 аломат зиёд бошад'],
    'Текст сообщения должен быть строкой': ['The message text must be a string', 'Матни паём бояд сатр бошад'],
    'Некорректная ссылка на изображение': ['Invalid image link', 'Истиноди сурат нодуруст аст'],
    'Ссылка на изображение слишком длинная': ['The image link is too long', 'Истиноди сурат аз ҳад дароз аст'],

    // --- profile, uploads, push ---
    'Описание не должно превышать 500 символов': ['The description must not exceed 500 characters', 'Тавсиф набояд аз 500 аломат зиёд бошад'],
    'Навыки не должны превышать 300 символов': ['Skills must not exceed 300 characters', 'Малакаҳо набояд аз 300 аломат зиёд бошанд'],
    'Некорректная ссылка на фото профиля': ['Invalid profile photo link', 'Истиноди расми профил нодуруст аст'],
    'Файл не выбран': ['No file selected', 'Файл интихоб нашудааст'],
    'Файл слишком большой. Максимальный размер — 5 МБ.': ['The file is too large. The maximum size is 5 MB.', 'Файл аз ҳад калон аст. Ҳаҷми ниҳоӣ — 5 МБ.'],
    'Недопустимый тип файла. Разрешены только JPEG, PNG, GIF и WebP.': ['Unsupported file type. Only JPEG, PNG, GIF and WebP are allowed.', 'Навъи файл иҷозат дода нашудааст. Танҳо JPEG, PNG, GIF ва WebP мумкин аст.'],
    'Не удалось загрузить файл': ['File upload failed', 'Файл бор карда нашуд'],
    'Хранилище файлов не настроено': ['File storage is not configured', 'Анбори файлҳо танзим нашудааст'],
    'Push-уведомления не настроены': ['Push notifications are not configured', 'Огоҳиҳои push танзим нашудаанд'],
    'Недействительный push-токен': ['Invalid push token', 'Push-токени нодуруст'],
    'Проходить верификацию могут только исполнители': ['Only providers can go through verification', 'Танҳо иҷрокунандагон верификатсияро гузашта метавонанд'],
    'Требуются ссылки на документы': ['Document links are required', 'Истинодҳо ба ҳуҷҷатҳо лозиманд'],
    'Укажите хотя бы одну корректную HTTPS-ссылку на документ': ['Provide at least one valid HTTPS document link', 'Ҳадди аққал як истиноди дурусти HTTPS ба ҳуҷҷат диҳед'],

    // --- subscriptions and payments ---
    'Подписки недоступны': ['Subscriptions are unavailable', 'Обунаҳо дастрас нестанд'],
    'Подписка не найдена': ['Subscription not found', 'Обуна ёфт нашуд'],
    'Некорректные данные подписки': ['Invalid subscription data', 'Маълумоти обуна нодуруст аст'],
    'Неверный тариф': ['Invalid plan', 'Тарифи нодуруст'],
    'Платёж не найден': ['Payment not found', 'Пардохт ёфт нашуд'],
    'Не указан orderId': ['orderId is missing', 'orderId нишон дода нашудааст'],
    'Не удалось создать платёж. Попробуйте позже.': ['Could not create the payment. Try again later.', 'Пардохт эҷод нашуд. Баъдтар кӯшиш кунед.'],

    // --- validateTaskInput / validateResponseInput / validatePassword ---
    // These arrive joined with ', ', which translateServerError splits.
    'Заголовок должен содержать минимум 5 символов': ['The title must be at least 5 characters', 'Ном бояд ҳадди аққал 5 аломат дошта бошад'],
    'Заголовок не должен превышать 200 символов': ['The title must not exceed 200 characters', 'Ном набояд аз 200 аломат зиёд бошад'],
    'Описание должно содержать минимум 20 символов': ['The description must be at least 20 characters', 'Тавсиф бояд ҳадди аққал 20 аломат дошта бошад'],
    'Описание не должно превышать 5000 символов': ['The description must not exceed 5000 characters', 'Тавсиф набояд аз 5000 аломат зиёд бошад'],
    'Выберите категорию': ['Choose a category', 'Категорияро интихоб кунед'],
    'Неизвестная категория': ['Unknown category', 'Категорияи номаълум'],
    'Укажите город': ['Enter a city', 'Шаҳрро нишон диҳед'],
    'Неизвестный город': ['Unknown city', 'Шаҳри номаълум'],
    'Неизвестная срочность': ['Unknown urgency', 'Фавриятнокии номаълум'],
    'Бюджет должен быть положительным числом': ['The budget must be a positive number', 'Буҷет бояд адади мусбат бошад'],
    'Бюджет не может превышать 10,000,000': ['The budget cannot exceed 10,000,000', 'Буҷет наметавонад аз 10,000,000 зиёд бошад'],
    'Сообщение должно содержать минимум 10 символов': ['The message must be at least 10 characters', 'Паём бояд ҳадди аққал 10 аломат дошта бошад'],
    'Укажите цену': ['Enter a price', 'Нархро нишон диҳед'],
    'Цена должна быть положительным числом': ['The price must be a positive number', 'Нарх бояд адади мусбат бошад'],
    'Цена не может превышать 10,000,000': ['The price cannot exceed 10,000,000', 'Нарх наметавонад аз 10,000,000 зиёд бошад'],
    'Пароль должен содержать минимум 8 символов': ['The password must be at least 8 characters', 'Парол бояд ҳадди аққал 8 аломат дошта бошад'],
    'Пароль не должен превышать 70 символов': ['The password must not exceed 70 characters', 'Парол набояд аз 70 аломат зиёд бошад'],
    'Добавьте заглавную букву': ['Add an uppercase letter', 'Ҳарфи калон илова кунед'],
    'Добавьте строчную букву': ['Add a lowercase letter', 'Ҳарфи хурд илова кунед'],
    'Добавьте цифру': ['Add a number', 'Рақам илова кунед'],

    // --- client-side fallbacks in api-client ---
    'Ошибка сервера. Попробуйте позже.': ['Server error. Try again later.', 'Хатои сервер. Баъдтар кӯшиш кунед.'],
    'Ошибка запроса': ['Request error', 'Хатои дархост'],
};

function lookup(message: string, locale: Locale): string | undefined {
    const entry = ERRORS[message];
    if (!entry) return undefined;
    return locale === 'en' ? entry[0] : entry[1];
}

/**
 * Translate a server error message for display. Unknown text is returned as-is,
 * so a newly added or reworded server error still shows something useful.
 */
export function translateServerError(message: string, locale: Locale): string {
    if (locale === 'ru' || !message) return message;

    const direct = lookup(message, locale);
    if (direct) return direct;

    // Validation returns several errors joined together — with ', ' for task and
    // response input, '. ' for password rules. Translate the parts only when all
    // of them are known, so a message that merely contains a separator is never
    // mangled.
    for (const separator of [', ', '. ']) {
        if (!message.includes(separator)) continue;
        const parts = message.split(separator).map((part) => lookup(part, locale));
        if (parts.every(Boolean)) return parts.join(separator);
    }

    return message;
}
