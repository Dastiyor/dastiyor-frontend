import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatBudget } from '@/lib/format-budget';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, fullName: true, avatar: true } },
                _count: { select: { responses: true } },
                review: { select: { id: true } },
            },
        });

        if (!task) {
            return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
        }

        let images: string[] = [];
        if (task.images) {
            try {
                const parsed = JSON.parse(task.images);
                images = Array.isArray(parsed) ? parsed : [];
            } catch {
                images = [];
            }
        }

        return NextResponse.json({
            id: task.id,
            title: task.title,
            description: task.description,
            category: task.category,
            budget: formatBudget(task.budgetType, task.budgetAmount),
            city: task.city,
            address: task.address,
            images,
            urgency: task.urgency,
            dueDate: task.dueDate,
            status: task.status,
            postedAt: task.createdAt.toISOString(),
            responseCount: task._count.responses,
            customer: task.user,
            hasReview: !!task.review,
        });
    } catch (error) {
        console.error('Get Task Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
