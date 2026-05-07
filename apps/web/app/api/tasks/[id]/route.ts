import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
            },
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: task.id,
            title: task.title,
            description: task.description,
            category: task.category,
            budget: task.budgetType === 'fixed' ? `${task.budgetAmount} TJS` : 'Договорная',
            city: task.city,
            address: task.address,
            images: task.images ? JSON.parse(task.images) : [],
            urgency: task.urgency,
            dueDate: task.dueDate,
            status: task.status,
            postedAt: new Date(task.createdAt).toLocaleDateString('ru-RU'),
            responseCount: task._count.responses,
            customer: task.user,
        });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
