import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                fullName: true,
                bio: true,
                skills: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const [completedCount, reviews] = await Promise.all([
            prisma.task.count({ where: { assignedUserId: id, status: 'COMPLETED' } }),
            prisma.review.findMany({
                where: { reviewedId: id },
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    createdAt: true,
                    reviewer: { select: { id: true, fullName: true } },
                    task: { select: { id: true, title: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
        ]);

        const avgRating =
            reviews.length > 0
                ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                : 0;

        return NextResponse.json({
            user: {
                ...user,
                completedCount,
                avgRating: parseFloat(avgRating.toFixed(1)),
                reviewCount: reviews.length,
                reviews,
            },
        });
    } catch (error) {
        console.error('Get User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
