import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // 1. Clean up existing data (optional, be careful in prod)
    // await prisma.response.deleteMany();
    // await prisma.task.deleteMany();
    // await prisma.user.deleteMany();

    // 2. Create Users
    const customerPassword = await bcrypt.hash('password123', 10);
    const providerPassword = await bcrypt.hash('password123', 10);

    const customer = await prisma.user.upsert({
        where: { email: 'customer@example.com' },
        update: {},
        create: {
            email: 'customer@example.com',
            fullName: 'John Customer',
            password: customerPassword,
            role: 'CUSTOMER',
            phone: '+992900000001',
        },
    });

    const provider = await prisma.user.upsert({
        where: { email: 'provider@example.com' },
        update: {},
        create: {
            email: 'provider@example.com',
            fullName: 'Master Handyman',
            password: providerPassword,
            role: 'PROVIDER',
            bio: 'Professional handyman with 10 years of experience in plumbing and electrical work.',
            skills: 'Plumbing, Electrical, Carpentry',
            phone: '+992900000002',
            isVerified: true,
        },
    });

    console.log({ customer, provider });

    // 3. Create Tasks (sample data so /tasks feed is not empty)
    const tasksData = [
        {
            title: 'Fix Leaking Faucet',
            description: 'Kitchen faucet is dripping constantly. Need a plumber to fix or replace it.',
            category: 'Ремонт',
            budgetType: 'fixed',
            budgetAmount: '150',
            budgetAmountNum: 150,
            city: 'Dushanbe',
            urgency: 'normal',
            status: 'OPEN',
        },
        {
            title: 'House Cleaning',
            description: 'Need full house cleaning for a 3-bedroom apartment.',
            category: 'Уборка',
            budgetType: 'negotiable',
            city: 'Khujand',
            urgency: 'urgent',
            status: 'OPEN',
        },
        {
            title: 'Deliver Package to Airport',
            description: 'Small package needs to be delivered to the airport cargo terminal.',
            category: 'Доставка',
            budgetType: 'fixed',
            budgetAmount: '50',
            budgetAmountNum: 50,
            city: 'Dushanbe',
            urgency: 'urgent',
            status: 'OPEN',
        },
        {
            title: 'Website Development',
            description: 'Need a simple landing page for my small business.',
            category: 'IT и Веб',
            budgetType: 'negotiable',
            city: 'Remote',
            urgency: 'normal',
            status: 'OPEN',
        },
        {
            title: 'Генеральная уборка 3-х комнатной квартиры после ремонта',
            description: 'Требуется качественная уборка после ремонта: мытьё окон, полов, стен, санузла. Площадь около 80 м².',
            category: 'Уборка',
            budgetType: 'fixed',
            budgetAmount: '450',
            budgetAmountNum: 450,
            city: 'Душанбе, Центр',
            urgency: 'normal',
            status: 'OPEN',
        },
        {
            title: 'Заменить смеситель в ванной и починить розетку',
            description: 'Нужен сантехник и электрик: замена смесителя, ремонт розетки в ванной.',
            category: 'Сантехника',
            budgetType: 'fixed',
            budgetAmount: '150',
            budgetAmountNum: 150,
            city: 'Душанбе, 46 мкр',
            urgency: 'normal',
            status: 'OPEN',
        },
        {
            title: 'Нужен репетитор по английскому языку для ребенка',
            description: 'Ищем репетитора английского для ребёнка 10 лет. Занятия онлайн 2–3 раза в неделю.',
            category: 'Обучение',
            budgetType: 'fixed',
            budgetAmount: '80',
            budgetAmountNum: 80,
            city: 'Онлайн',
            urgency: 'low',
            status: 'OPEN',
        },
    ];

    let seeded = 0;
    for (const t of tasksData) {
        const exists = await prisma.task.findFirst({ where: { title: t.title, userId: customer.id } });
        if (!exists) {
            await prisma.task.create({ data: { ...t, userId: customer.id } });
            seeded++;
        }
    }

    console.log(`Seeded ${seeded} new tasks (${tasksData.length - seeded} already existed).`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
