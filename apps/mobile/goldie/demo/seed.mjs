// Demo data for the store screenshots. Run against the throwaway local
// database only (see goldie/README.md); it refuses any other host.
//
//   POSTGRES_PRISMA_URL=postgresql://e2e:e2e@localhost:54329/dastiyor_e2e?schema=public node goldie/demo/seed.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../web/package.json'));
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const url = new URL(process.env.POSTGRES_PRISMA_URL ?? '');
if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error(`Demo data only goes into a local database, not ${url.hostname}`);
}

const prisma = new PrismaClient();
// The flows in .argent/flows sign in with these.
export const DEMO_DOMAIN = '@e2e.dastiyor.test';
export const DEMO_PASSWORD = 'Demo-Passw0rd!';

const minutesAgo = m => new Date(Date.now() - m * 60_000);
const password = await bcrypt.hash(DEMO_PASSWORD, 4);
let phoneSeq = 100000;

async function user(key, fullName, role, extra = {}) {
    return prisma.user.create({
        data: {
            // Fixed ids: the flows open screens by deep link.
            id: `demo-${key}`,
            email: `demo-${key}${DEMO_DOMAIN}`,
            phone: `+992000${phoneSeq++}`,
            fullName,
            role,
            password,
            phoneVerified: true,
            ...(role === 'PROVIDER'
                ? { subscription: { create: { plan: 'standard', endDate: new Date(Date.now() + 365 * 864e5) } } }
                : {}),
            ...extra,
        },
    });
}

async function task(owner, title, description, category, city, amount, ago, extra = {}) {
    return prisma.task.create({
        data: {
            title, description, category, city,
            budgetType: amount ? 'fixed' : 'negotiable',
            budgetAmount: amount ? String(amount) : 'negotiable',
            budgetAmountNum: amount || null,
            userId: owner.id,
            createdAt: minutesAgo(ago),
            ...extra,
        },
    });
}

async function offer(t, provider, price, message, estimatedTime, ago, status = 'PENDING') {
    return prisma.response.create({
        data: {
            taskId: t.id, userId: provider.id, price: String(price), priceNum: price,
            message, estimatedTime, status, createdAt: minutesAgo(ago),
        },
    });
}

await prisma.$transaction([
    prisma.notification.deleteMany(), prisma.message.deleteMany(), prisma.review.deleteMany(),
    prisma.response.deleteMany(), prisma.taskFavorite.deleteMany(), prisma.task.deleteMany(),
    prisma.subscription.deleteMany(), prisma.user.deleteMany(),
]);

// These two are the accounts the flows sign in as; their addresses show on the Profile tab.
const farhod = await user('customer', 'Фарход Рахимов', 'CUSTOMER', { email: 'farhod@example.com' });
const madina = await user('madina', 'Мадина Каримова', 'CUSTOMER');
const shahnoza = await user('shahnoza', 'Шахноза Назарова', 'CUSTOMER');
const rustam = await user('rustam', 'Рустам Сафаров', 'CUSTOMER');

const daler = await user('provider', 'Далер Шарипов', 'PROVIDER', {
    email: 'daler@example.com',
    isVerified: true,
    skills: 'Сантехника, Электрика, Мелкий ремонт',
    bio: 'Мастер с опытом 9 лет. Сантехника и электрика под ключ: от замены смесителя до разводки по квартире. Работаю аккуратно, со своим инструментом, даю гарантию.',
    balance: 1840,
});
const zarina = await user('zarina', 'Зарина Мирзоева', 'PROVIDER', {
    isVerified: true, skills: 'Уборка, Химчистка мебели',
    bio: 'Генеральная и поддерживающая уборка квартир и офисов. Свои средства и оборудование.',
});
const bakhtiyor = await user('bakhtiyor', 'Бахтиёр Одинаев', 'PROVIDER', {
    isVerified: true, skills: 'Ремонт, Сборка мебели, Плитка',
    bio: 'Ремонт квартир и сборка мебели. Бригада из трёх человек, 12 лет в деле.',
});
const suhrob = await user('suhrob', 'Сухроб Холов', 'PROVIDER', {
    skills: 'Компьютеры, Wi-Fi, Сайты',
    bio: 'Настройка компьютеров и сетей, установка программ, сайты для малого бизнеса.',
});

// The public feed. The first three are the featured strip.
const now = new Date();
await task(madina, 'Генеральная уборка трёхкомнатной квартиры',
    'Нужна генеральная уборка после ремонта: окна, кухня, два санузла. Квартира 85 м², район Зарафшон.',
    'Уборка', 'Душанбе', 350, 12, { featured: true, featuredAt: now, urgency: 'urgent' });
await task(rustam, 'Собрать кухонный гарнитур',
    'Купили кухню 3,2 метра, нужно собрать и повесить верхние шкафы. Инструкция и крепёж есть.',
    'Ремонт', 'Душанбе', 600, 38, { id: 'demo-task-kitchen', featured: true, featuredAt: minutesAgo(5) });
await task(shahnoza, 'Сделать логотип для кафе',
    'Открываем семейное кафе, нужен логотип и вариант для вывески. Примеры того, что нравится, пришлю.',
    'Дизайн', 'Онлайн', 800, 64, { featured: true, featuredAt: minutesAgo(10) });
await task(madina, 'Доставить холодильник на 4 этаж',
    'Забрать из магазина на Рудаки и поднять на четвёртый этаж без лифта. Нужны двое.',
    'Доставка', 'Душанбе', 200, 95, { urgency: 'urgent' });
await task(rustam, 'Настроить Wi-Fi роутер и камеру',
    'Новый роутер и одна камера наблюдения. Нужно всё подключить и показать, как смотреть с телефона.',
    'Компьютерная помощь', 'Худжанд', 150, 140);
await task(shahnoza, 'Репетитор по английскому для школьника',
    '7 класс, два раза в неделю по часу. Подтянуть грамматику и разговорную речь.',
    'Обучение', 'Душанбе', 0, 190);
await task(madina, 'Починить стиральную машину',
    'Samsung, не сливает воду и выдаёт ошибку. Нужна диагностика и ремонт на месте.',
    'Ремонт техники', 'Бохтар', 250, 260);
await task(rustam, 'Фотограф на день рождения',
    'Детский праздник, 3 часа съёмки в субботу. Нужны обработанные фото в течение недели.',
    'Фото и видео', 'Душанбе', 700, 330);
await task(shahnoza, 'Заменить проводку в двух комнатах',
    'Старая алюминиевая проводка, нужно заменить на медную и поставить новые розетки.',
    'Электрик', 'Худжанд', 1200, 420);

// The signed-in customer's own tasks, one in each state.
const faucet = await task(farhod, 'Заменить смеситель на кухне',
    'Течёт старый смеситель, новый уже купил. Нужно снять старый, поставить новый и проверить подводку.',
    'Сантехника', 'Душанбе', 180, 25, { id: 'demo-task-faucet', address: 'ул. Айни, 48' });
await offer(faucet, daler, 170, 'Здравствуйте! Сделаю сегодня после 15:00, со своим инструментом. Гарантия на работу 6 месяцев.', '1-2 часа', 18);
await offer(faucet, bakhtiyor, 200, 'Добрый день. Могу приехать завтра утром, заодно проверю подводку и краны.', '2-3 часа', 14);
await offer(faucet, suhrob, 150, 'Готов выполнить, свободен в выходные.', '1 день', 9);

const sockets = await task(farhod, 'Установить четыре розетки',
    'В зале нужно добавить четыре розетки и перенести выключатель. Стены бетонные.',
    'Электрик', 'Душанбе', 400, 60 * 26, { id: 'demo-task-sockets', status: 'IN_PROGRESS', assignedUserId: daler.id });
await offer(sockets, daler, 380, 'Сделаю за один день, штроблю аккуратно, с пылесосом.', '1 день', 60 * 25, 'ACCEPTED');

const cleaning = await task(farhod, 'Уборка перед переездом',
    'Двухкомнатная квартира, нужно всё отмыть перед сдачей хозяину.',
    'Уборка', 'Душанбе', 300, 60 * 24 * 6, { status: 'COMPLETED', assignedUserId: zarina.id });
await offer(cleaning, zarina, 300, 'Приеду со своими средствами, управлюсь за полдня.', '3-4 часа', 60 * 24 * 6 - 30, 'COMPLETED');
await prisma.review.create({
    data: { taskId: cleaning.id, reviewerId: farhod.id, reviewedId: zarina.id, rating: 5,
        comment: 'Квартира блестит, хозяин принял без вопросов. Спасибо!', createdAt: minutesAgo(60 * 24 * 5) },
});

const shelf = await task(farhod, 'Собрать и повесить книжные полки',
    'Три навесные полки из ИКЕА, стена кирпичная. Крепёж в комплекте.',
    'Ремонт', 'Душанбе', 120, 60 * 24 * 12, { status: 'COMPLETED', assignedUserId: bakhtiyor.id });
await offer(shelf, bakhtiyor, 120, 'Сделаю за час, перфоратор свой.', '1-2 часа', 60 * 24 * 12 - 15, 'COMPLETED');
await task(farhod, 'Настроить умный телевизор',
    'Новый телевизор: подключить к Wi-Fi, настроить каналы и приложения.',
    'Компьютерная помощь', 'Душанбе', 100, 60 * 5);

// Reviews that give the provider profile a rating.
const pastJobs = [
    [madina, 'Поменять трубы в ванной', 'Сантехника', 5, 'Пришёл вовремя, всё сделал чисто и быстро. Рекомендую!', 9],
    [rustam, 'Подключить электроплиту', 'Электрик', 5, 'Очень аккуратный мастер, объяснил, что и зачем делает.', 16],
    [shahnoza, 'Устранить течь под раковиной', 'Сантехника', 4, 'Хорошая работа, цена как договаривались.', 30],
    [madina, 'Повесить люстру и бра', 'Электрик', 5, 'Быстро и надёжно, обращусь ещё.', 44],
];
for (const [owner, title, category, rating, comment, days] of pastJobs) {
    const job = await task(owner, title, 'Работа выполнена.', category, 'Душанбе', 250, 60 * 24 * (days + 1),
        { status: 'COMPLETED', assignedUserId: daler.id });
    await offer(job, daler, 250, 'Сделаю в удобное для вас время.', '2-3 часа', 60 * 24 * (days + 1) - 20, 'COMPLETED');
    await prisma.review.create({
        data: { taskId: job.id, reviewerId: owner.id, reviewedId: daler.id, rating, comment, createdAt: minutesAgo(60 * 24 * days) },
    });
}

// The chat about the job in progress: yesterday evening, whenever this runs,
// so the thread never straddles midnight.
const yesterdayAt = (h, m) => { const d = new Date(Date.now() - 864e5); d.setHours(h, m, 0, 0); return d; };
const chat = [
    [farhod, daler, 'Здравствуйте, Далер! Когда сможете приехать?', yesterdayAt(18, 4)],
    [daler, farhod, 'Добрый день! Могу завтра к 10:00, вам удобно?', yesterdayAt(18, 9)],
    [farhod, daler, 'Да, отлично. Розетки и подрозетники уже купил.', yesterdayAt(18, 12)],
    [daler, farhod, 'Хорошо, кабель и гофру привезу сам. До завтра!', yesterdayAt(18, 15)],
    [farhod, daler, 'Спасибо, жду 👍', yesterdayAt(18, 16)],
];
for (const [sender, receiver, content, createdAt] of chat) {
    await prisma.message.create({
        data: { senderId: sender.id, receiverId: receiver.id, taskId: sockets.id, content, isRead: true, createdAt },
    });
}
await prisma.message.create({
    data: { senderId: zarina.id, receiverId: farhod.id, taskId: cleaning.id, content: 'Спасибо за отзыв! Обращайтесь ещё.', isRead: true, createdAt: minutesAgo(60 * 24 * 5 - 10) },
});
await prisma.message.create({
    data: { senderId: bakhtiyor.id, receiverId: farhod.id, taskId: faucet.id, content: 'Могу приехать завтра к 9 утра, подойдёт?', createdAt: minutesAgo(13) },
});

console.log('Demo data ready. Sign in as farhod@example.com (customer) or daler@example.com (provider).');
await prisma.$disconnect();
