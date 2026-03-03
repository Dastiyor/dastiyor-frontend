import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Advanced search with full-text search
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const category = searchParams.get('category');
        const city = searchParams.get('city');
        const minBudget = searchParams.get('minBudget');
        const maxBudget = searchParams.get('maxBudget');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const skip = (page - 1) * limit;

        if (!query || query.trim().length < 2) {
            return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
        }

        const where: any = {
            status: 'OPEN',
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } },
                { subcategory: { contains: query, mode: 'insensitive' } }
            ]
        };

        if (category) {
            where.category = category;
        }

        if (city) {
            where.city = { contains: city, mode: 'insensitive' };
        }

        if (minBudget || maxBudget) {
            const min = minBudget ? parseInt(minBudget, 10) : undefined;
            const max = maxBudget ? parseInt(maxBudget, 10) : undefined;
            where.AND = where.AND || [];
            where.AND.push({
                OR: [
                    { budgetType: 'negotiable' },
                    {
                        budgetType: 'fixed',
                        budgetAmountNum: {
                            ...(min != null && !isNaN(min) ? { gte: min } : {}),
                            ...(max != null && !isNaN(max) ? { lte: max } : {}),
                        },
                    },
                ],
            });
        }

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { responses: true }
                    },
                    user: {
                        select: { fullName: true }
                    }
                }
            }),
            prisma.task.count({ where })
        ]);

        return NextResponse.json({
            tasks,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: 'Search failed', details: error.message },
            { status: 500 }
        );
    }
}
