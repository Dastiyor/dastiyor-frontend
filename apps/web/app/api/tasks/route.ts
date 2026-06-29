import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { validateTaskInput, sanitizeString } from '@/lib/validation';
import { logAction, getRequestIP } from '@/lib/audit';
import { requireAuth } from '@/lib/require-auth';
import { needsPhoneVerification, PHONE_VERIFICATION_REQUIRED } from '@/lib/phone-gate';

const TASKS_PER_PAGE = 20;

/** GET - Public paginated task list for feed / lazy loading */
export async function GET(request: Request) {
    try {
        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, 'api');
        if (!rateLimit.allowed) {
            return rateLimitExceededResponse(rateLimit.resetIn);
        }

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

        const where: Prisma.TaskWhereInput = { status: 'OPEN' };
        if (category) where.category = category;
        if (city) where.city = { contains: city, mode: 'insensitive' };
        if (urgency) {
            const values = urgency.split(',').filter(Boolean);
            if (values.length) where.urgency = { in: values };
        }
        if (query) {
            where.OR = [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } },
            ];
        }
        if (minBudget || maxBudget) {
            const budgetFilter: Prisma.TaskWhereInput = {
                OR: [
                    { budgetType: 'negotiable' },
                    {
                        budgetType: 'fixed',
                        budgetAmountNum: {
                            ...(minBudget ? { gte: Math.max(0, parseInt(minBudget, 10)) } : {}),
                            ...(maxBudget ? { lte: parseInt(maxBudget, 10) } : {}),
                        },
                    },
                ],
            };
            const existing = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
            where.AND = [...existing, budgetFilter] as Prisma.TaskWhereInput[];
        }

        let orderBy: Prisma.TaskOrderByWithRelationInput | Prisma.TaskOrderByWithRelationInput[] = { createdAt: 'desc' };
        if (sort === 'budget-high') orderBy = [{ budgetAmountNum: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
        else if (sort === 'budget-low') orderBy = [{ budgetAmountNum: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];

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
        const tasks = tasksForPage.map((task) => ({
            id: task.id,
            title: task.title,
            category: task.category,
            budget: task.budgetType === 'fixed' ? `${task.budgetAmount} TJS` : 'Договорная',
            budgetType: task.budgetType,
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
    } catch (error) {
        logger.error('Tasks list error', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // 1. Authenticate Request
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Apply Rate Limiting
        const clientIP = getClientIP(request);
        const rateLimitCheck = await checkRateLimit(clientIP, 'api');
        if (!rateLimitCheck.allowed) {
            return rateLimitExceededResponse(rateLimitCheck.resetIn);
        }

        // OAuth registrants must verify a phone number before posting tasks
        const author = await prisma.user.findUnique({
            where: { id: payload.id as string },
            select: { password: true, googleId: true, appleId: true, phoneVerified: true },
        });
        if (!author) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        if (needsPhoneVerification(author)) {
            return NextResponse.json(
                { error: 'Подтвердите номер телефона, чтобы публиковать задания', code: PHONE_VERIFICATION_REQUIRED },
                { status: 403 }
            );
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
        // Normalise budget fields: accept {budget:'fixed', amount:200} or legacy {budget:200}
        let resolvedBudgetType: string;
        let resolvedAmount = amount;
        const budgetLower = typeof budget === 'string' ? budget.toLowerCase() : null;
        if (budgetLower === 'fixed' || budgetLower === 'negotiable') {
            resolvedBudgetType = budgetLower;
        } else if (typeof budget === 'number' || (typeof budget === 'string' && !isNaN(Number(budget)))) {
            resolvedBudgetType = 'fixed';
            resolvedAmount = resolvedAmount ?? budget;
        } else {
            resolvedBudgetType = 'negotiable';
        }
        const amountNum = resolvedAmount != null && resolvedAmount !== '' ? parseInt(String(resolvedAmount), 10) : null;
        const task = await prisma.task.create({
            data: {
                title: sanitizeString(title),
                description: sanitizeString(description),
                category,
                subcategory: subcategory ? sanitizeString(subcategory) : null,
                budgetType: resolvedBudgetType,
                budgetAmount: resolvedAmount ? String(resolvedAmount) : null,
                budgetAmountNum: amountNum != null && !isNaN(amountNum) ? amountNum : null,
                city: sanitizeString(city),
                address: address ? sanitizeString(address) : undefined,
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

    } catch (error) {
        logger.error('Task Creation Error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }

}
