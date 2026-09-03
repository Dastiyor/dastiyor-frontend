import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidId } from '@/lib/validation';
import { sendNewReviewNotification } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';
import { requireAuth } from '@/lib/require-auth';

// GET - Fetch reviews for a user
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Не указан параметр userId' }, { status: 400 });
        }

        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

        // Fetch page of reviews + aggregate stats in parallel — aggregate covers ALL reviews, not just this page
        const reviewFilter = { reviewedId: userId, hidden: false };
        const [reviews, stats, breakdown5, breakdown4, breakdown3, breakdown2, breakdown1] = await Promise.all([
            prisma.review.findMany({
                where: reviewFilter,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
                include: {
                    reviewer: { select: { id: true, fullName: true } },
                    task: { select: { id: true, title: true, category: true } },
                },
            }),
            prisma.review.aggregate({
                where: reviewFilter,
                _avg: { rating: true },
                _count: { rating: true },
            }),
            prisma.review.count({ where: { ...reviewFilter, rating: 5 } }),
            prisma.review.count({ where: { ...reviewFilter, rating: 4 } }),
            prisma.review.count({ where: { ...reviewFilter, rating: 3 } }),
            prisma.review.count({ where: { ...reviewFilter, rating: 2 } }),
            prisma.review.count({ where: { ...reviewFilter, rating: 1 } }),
        ]);

        const totalCount = stats._count.rating;
        const averageRating = parseFloat((stats._avg.rating ?? 0).toFixed(1));

        return NextResponse.json({
            reviews,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
            stats: {
                totalReviews: totalCount,
                averageRating,
                breakdown: { 5: breakdown5, 4: breakdown4, 3: breakdown3, 2: breakdown2, 1: breakdown1 },
            },
        });

    } catch (error) {
        console.error('Get Reviews Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - Create a new review (only task owner can review after completion)
export async function POST(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const reviewerId = payload.id as string;
        const body = await request.json();
        const { taskId, rating, comment } = body;

        if (!isValidId(taskId) || !rating) {
            return NextResponse.json({ error: 'Заполнены не все обязательные поля' }, { status: 400 });
        }

        const ratingNum = Number(rating);
        if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return NextResponse.json({ error: 'Оценка должна быть целым числом от 1 до 5' }, { status: 400 });
        }

        if (comment !== undefined && comment !== null) {
            if (typeof comment !== 'string') {
                return NextResponse.json({ error: 'Комментарий должен быть текстом' }, { status: 400 });
            }
            if (comment.length > 1000) {
                return NextResponse.json({ error: 'Комментарий не должен превышать 1000 символов' }, { status: 400 });
            }
        }

        // Get the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { review: true }
        });

        if (!task) {
            return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
        }

        // Verify the reviewer is the task owner
        if (task.userId !== reviewerId) {
            return NextResponse.json({ error: 'Оставить отзыв может только автор задания' }, { status: 403 });
        }

        // Verify task is completed
        if (task.status !== 'COMPLETED') {
            return NextResponse.json({ error: 'Оставить отзыв можно только после завершения задания' }, { status: 400 });
        }

        // Verify there's an assigned provider
        // Second line of defence for the self-review chain blocked in
        // /api/responses: never let a review point at its own author.
        if (task.assignedUserId === reviewerId) {
            return NextResponse.json(
                { error: 'Нельзя оставить отзыв самому себе' },
                { status: 403 }
            );
        }

        if (!task.assignedUserId) {
            return NextResponse.json({ error: 'На это задание не назначен исполнитель' }, { status: 400 });
        }

        // Check if review already exists
        if (task.review) {
            return NextResponse.json({ error: 'Отзыв на это задание уже оставлен' }, { status: 400 });
        }

        // Create the review
        const review = await prisma.review.create({
            data: {
                rating: ratingNum,
                comment: (comment as string | undefined) || null,
                reviewerId,
                reviewedId: task.assignedUserId,
                taskId
            },
            include: {
                reviewer: {
                    select: { id: true, fullName: true }
                }
            }
        });

        // Send email notification to reviewed provider (non-blocking)
        const reviewed = await prisma.user.findUnique({
            where: { id: task.assignedUserId },
            select: { email: true, locale: true }
        });
        if (reviewed?.email) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
            sendNewReviewNotification(
                reviewed.email,
                review.reviewer.fullName,
                task.title,
                ratingNum,
                (comment as string | undefined) || null,
                `${baseUrl}/provider/profile`,
                reviewed?.locale,
            ).catch(err => console.error('Email notification error:', err));
        }

        logAction({
            action: 'LEAVE_REVIEW',
            userId: reviewerId,
            entity: 'Review',
            entityId: review.id,
            details: { taskId, rating, reviewedId: task.assignedUserId },
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({
            message: 'Review submitted successfully',
            review
        }, { status: 201 });

    } catch (error) {
        console.error('Create Review Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
