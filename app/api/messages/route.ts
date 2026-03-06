import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendNewMessageNotification } from '@/lib/notifications/email';

// GET - Fetch messages for a conversation (between current user and another user, optionally for a task)
export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.id as string;
        const { searchParams } = new URL(request.url);
        const otherId = searchParams.get('userId');
        const taskId = searchParams.get('taskId');

        if (!otherId) {
            return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
        }

        // Get messages between these two users (optionally filtered by task)
        const whereClause: any = {
            OR: [
                { senderId: userId, receiverId: otherId },
                { senderId: otherId, receiverId: userId }
            ]
        };

        if (taskId) {
            whereClause.taskId = taskId;
        }

        const messages = await prisma.message.findMany({
            where: whereClause,
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: { id: true, fullName: true }
                }
            }
        });

        // Mark received messages as read
        await prisma.message.updateMany({
            where: {
                receiverId: userId,
                senderId: otherId,
                isRead: false
            },
            data: { isRead: true }
        });

        return NextResponse.json({ messages });

    } catch (error) {
        console.error('Get Messages Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - Send a new message
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const senderId = payload.id as string;
        const body = await request.json();
        const { receiverId, content, taskId, imageUrl } = body;

        if (!receiverId) {
            return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 });
        }

        // Must have either content or image
        if (!content && !imageUrl) {
            return NextResponse.json({ error: 'Message must have content or image' }, { status: 400 });
        }

        if (receiverId === senderId) {
            return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
        }

        // Create the message
        const message = await prisma.message.create({
            data: {
                content: content || '',
                imageUrl: imageUrl || null,
                senderId,
                receiverId,
                taskId: taskId || null
            },
            include: {
                sender: {
                    select: { id: true, fullName: true }
                }
            }
        });

        // Send email notification to receiver (non-blocking)
        const receiver = await prisma.user.findUnique({
            where: { id: receiverId },
            select: { email: true }
        });
        if (receiver?.email && content) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
            sendNewMessageNotification(
                receiver.email,
                message.sender.fullName,
                content,
                `${baseUrl}/messages?userId=${senderId}${taskId ? `&taskId=${taskId}` : ''}`
            ).catch(err => console.error('Email notification error:', err));
        }

        return NextResponse.json({ message }, { status: 201 });

    } catch (error) {
        console.error('Send Message Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
