import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatBudget } from '@/lib/format-budget';

const TASKS_PER_PAGE = 20;

/**
 * The public feed of open tasks: filters, sort, paging and the response shape,
 * shared by GET /api/tasks (web "load more" and the mobile app) and by the
 * server render of /tasks, so the two cannot disagree. With `userId`, each task
 * also says whether that person has saved it.
 */
export async function getTaskFeed(searchParams: URLSearchParams, userId?: string) {
    const category = searchParams.get('category');
    const query = searchParams.get('query');
    const city = searchParams.get('city');
    // A budget bound that is not a number is no bound at all.
    const minBudget = Number.isNaN(parseInt(searchParams.get('minBudget') ?? '', 10)) ? null : searchParams.get('minBudget');
    const maxBudget = Number.isNaN(parseInt(searchParams.get('maxBudget') ?? '', 10)) ? null : searchParams.get('maxBudget');
    const urgency = searchParams.get('urgency');
    const featuredOnly = searchParams.get('featured') === 'true';
    const sort = searchParams.get('sort') || 'newest';
    // `|| default`: parseInt of a non-number is NaN, which Math.max/min pass
    // straight through to Prisma's skip/take, and that is a 500.
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || String(TASKS_PER_PAGE), 10) || TASKS_PER_PAGE, 50));
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = { status: 'OPEN' };
    if (featuredOnly) where.featured = true;
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

    // Promoted tasks lead every feed, newest promotion first; the chosen sort
    // orders the rest. Secondary createdAt keeps pagination stable so a
    // featured task shown on page 1 never reappears further down.
    const featuredFirst: Prisma.TaskOrderByWithRelationInput[] = [
        { featured: 'desc' },
        { featuredAt: { sort: 'desc', nulls: 'last' } },
    ];
    let orderBy: Prisma.TaskOrderByWithRelationInput[] = [...featuredFirst, { createdAt: 'desc' }];
    if (sort === 'budget-high') orderBy = [...featuredFirst, { budgetAmountNum: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
    else if (sort === 'budget-low') orderBy = [...featuredFirst, { budgetAmountNum: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];

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
    const favorites = userId && tasksForPage.length
        ? new Set((await prisma.taskFavorite.findMany({
            where: { userId, taskId: { in: tasksForPage.map((task) => task.id) } },
            select: { taskId: true },
        })).map((row) => row.taskId))
        : null;

    const tasks = tasksForPage.map((task) => ({
        id: task.id,
        title: task.title,
        category: task.category,
        budget: formatBudget(task.budgetType, task.budgetAmount),
        budgetType: task.budgetType,
        city: task.city,
        postedAt: task.createdAt.toISOString(),
        description: task.description,
        urgency: task.urgency,
        responseCount: task._count.responses,
        status: task.status,
        featured: task.featured,
        hasPremiumResponse: false, // TODO: Re-enable when payment gateway is ready
        // Only for a signed-in caller, so a guest's response carries no such field.
        ...(favorites ? { isFavorite: favorites.has(task.id) } : {}),
    }));

    return {
        tasks,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
        },
    };
}
