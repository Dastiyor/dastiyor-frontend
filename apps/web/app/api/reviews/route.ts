import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT, getBearerToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendNewReviewNotification } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';

// GET - Fetch reviews for a user
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
        }

        // Get all reviews received by this user
        const reviews = await prisma.review.findMany({
            where: { reviewedId: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                reviewer: {
                    select: { id: true, fullName: true }
                },
                task: {
                    select: { id: true, title: true, category: true }
                }
            }
        });

        // Calculate average rating
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : '0';

        // Rating breakdown
        const breakdown = {
            5: reviews.filter(r => r.rating === 5).length,
            4: reviews.filter(r => r.rating === 4).length,
            3: reviews.filter(r => r.rating === 3).length,
            2: reviews.filter(r => r.rating === 2).length,
            1: reviews.filter(r => r.rating === 1).length,
        };

        return NextResponse.json({
            reviews,
            stats: {
                totalReviews: reviews.length,
                averageRating: parseFloat(averageRating),
                breakdown
            }
        });

    } catch (error) {
        console.error('Get Reviews Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - Create a new review (only task owner can review after completion)
export async function POST(request: Request) {
    try {
        const bearerToken = getBearerToken(request);
        let token: string | undefined = bearerToken ?? undefined;
        if (!token) {
            const cookieStore = await cookies();
            token = cookieStore.get('token')?.value;
        }
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const reviewerId = payload.id as string;
        const body = await request.json();
        const { taskId, rating, comment } = body;

        if (!taskId || !rating) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const ratingNum = Number(rating);
        if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
        }

        if (comment !== undefined && comment !== null) {
            if (typeof comment !== 'string') {
                return NextResponse.json({ error: 'Comment must be a string' }, { status: 400 });
            }
            if (comment.length > 1000) {
                return NextResponse.json({ error: 'Comment must not exceed 1000 characters' }, { status: 400 });
            }
        }

        // Get the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { review: true }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Verify the reviewer is the task owner
        if (task.userId !== reviewerId) {
            return NextResponse.json({ error: 'Only task owner can leave a review' }, { status: 403 });
        }

        // Verify task is completed
        if (task.status !== 'COMPLETED') {
            return NextResponse.json({ error: 'Task must be completed before reviewing' }, { status: 400 });
        }

        // Verify there's an assigned provider
        if (!task.assignedUserId) {
            return NextResponse.json({ error: 'No provider assigned to this task' }, { status: 400 });
        }

        // Check if review already exists
        if (task.review) {
            return NextResponse.json({ error: 'Review already exists for this task' }, { status: 400 });
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
            select: { email: true }
        });
        if (reviewed?.email) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
            sendNewReviewNotification(
                reviewed.email,
                review.reviewer.fullName,
                task.title,
                ratingNum,
                (comment as string | undefined) || null,
                `${baseUrl}/provider/profile`
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
