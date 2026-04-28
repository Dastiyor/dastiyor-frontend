import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { validateTaskInput } from '@/lib/validation';
import { logAction, getRequestIP } from '@/lib/audit';

const TASKS_PER_PAGE = 20;

/** GET - Public paginated task list for feed / lazy loading */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const query = searchParams.get('query');
        const city = searchParams.get('city');
        const minBudget = searchParams.get('minBudget');
        const maxBudget = searchParams.get('maxBudget');
        const urgency = searchParams.get('urgency');
        const sort = searchParams.get('sort') || 'newest';
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || String(TASKS_PER_PAGE), 10), 50));
        const skip = (page - 1) * limit;

        const where: any = { status: 'OPEN' };
        if (category) where.category = category;
        if (city) where.city = { contains: city, mode: 'insensitive' };
        if (urgency) {
            const values = urgency.split(',').filter(Boolean);
            if (values.length) where.urgency = { in: values };
        }
        if (query) {
            where.OR = [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ];
        }
        if (minBudget || maxBudget) {
            where.AND = where.AND || [];
            where.AND.push({
                OR: [
                    { budgetType: 'negotiable' },
                    {
                        budgetType: 'fixed',
                        budgetAmountNum: {
                            ...(minBudget ? { gte: parseInt(minBudget, 10) } : {}),
                            ...(maxBudget ? { lte: parseInt(maxBudget, 10) } : {}),
                        },
                    },
                ],
            });
        }

        let orderBy: any = { createdAt: 'desc' };
        if (sort === 'budget-high') orderBy = [{ budgetAmountNum: 'desc' }, { createdAt: 'desc' }];
        else if (sort === 'budget-low') orderBy = [{ budgetAmountNum: 'asc' }, { createdAt: 'desc' }];

        const [tasksForPage, total] = await Promise.all([
            prisma.task.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    _count: { select: { responses: true } },
                    user: { select: { fullName: true } },
                    // TODO: Re-enable subscription include for premium sorting when payment gateway is ready
                    // responses: { include: { user: { include: { subscription: true } } } },
                },
            }),
            prisma.task.count({ where }),
        ]);

        // TODO: Re-enable premium-first sorting when payment gateway is ready
        const tasks = tasksForPage.map((task: any) => ({
            id: task.id,
            title: task.title,
            category: task.category,
            budget: task.budgetType === 'fixed' ? `${task.budgetAmount} TJS` : 'Договорная',
            city: task.city,
            postedAt: new Date(task.createdAt).toLocaleDateString('ru-RU'),
            description: task.description,
            urgency: task.urgency,
            responseCount: task._count.responses,
            status: task.status,
            hasPremiumResponse: false, // TODO: Re-enable when payment gateway is ready
        }));

        return NextResponse.json({
            tasks,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        });
    } catch (error: any) {
        logger.error('Tasks list error', { error: error.message });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // 1. Authenticate Request
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        logger.debug('API /tasks request', { hasToken: !!token });

        if (!token) {
            return NextResponse.json(
                { error: `Unauthorized: Please log in. Cookies: ${cookieStore.getAll().map(c => c.name).join(', ')}` },
                { status: 401 }
            );
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid token' },
                { status: 401 }
            );
        }

        // Apply Rate Limiting
        const clientIP = getClientIP(request);
        const rateLimitCheck = checkRateLimit(clientIP, 'api');
        if (!rateLimitCheck.allowed) {
            return rateLimitExceededResponse(rateLimitCheck.resetIn);
        }

        // 2. Parse Body
        const body = await request.json();
        const {
            title,
            description,
            category,
            subcategory,
            budget,
            amount,
            city,
            address,
            images,
            dueDate,
            urgency
        } = body;

        // Validate Request using pre-defined schema
        const validation = validateTaskInput({ title, description, category, city, budgetAmount: amount });
        if (!validation.isValid) {
            return NextResponse.json(
                { error: validation.errors.join(', ') },
                { status: 400 }
            );
        }

        // 3. Create Task
        const amountNum = amount != null && amount !== '' ? parseInt(String(amount), 10) : null;
        const task = await prisma.task.create({
            data: {
                title,
                description,
                category,
                subcategory: subcategory || null,
                budgetType: String(budget),
                budgetAmount: amount ? String(amount) : null,
                budgetAmountNum: amountNum != null && !isNaN(amountNum) ? amountNum : null,
                city,
                address,
                userId: payload.id as string,
                images: images ? JSON.stringify(images) : undefined,
                dueDate: dueDate ? new Date(dueDate) : null,
                urgency: urgency || 'normal',
            },
        });

        logAction({
            action: 'CREATE_TASK',
            userId: payload.id as string,
            entity: 'Task',
            entityId: task.id,
            details: { title, category, city },
            ipAddress: clientIP,
        });

        return NextResponse.json(
            { message: 'Task created successfully', task },
            { status: 201 }
        );

    } catch (error: any) {
        logger.error('Task Creation Error', { error: error.message, stack: error.stack });
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }

}
