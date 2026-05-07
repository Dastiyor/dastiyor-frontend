import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET - Fetch all conversations for the current user
export async function GET() {
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

        // Get all messages where user is sender or receiver
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: {
                    select: { id: true, fullName: true }
                },
                receiver: {
                    select: { id: true, fullName: true }
                },
                task: {
                    select: { id: true, title: true }
                }
            }
        });

        // Group by conversation partner
        const conversationsMap = new Map<string, any>();

        messages.forEach(msg => {
            const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            const partner = msg.senderId === userId ? msg.receiver : msg.sender;

            // Create a unique key combining partner and task
            const key = msg.taskId ? `${partnerId}-${msg.taskId}` : partnerId;

            if (!conversationsMap.has(key)) {
                conversationsMap.set(key, {
                    id: key,
                    partnerId,
                    partnerName: partner.fullName,
                    taskId: msg.taskId,
                    taskTitle: msg.task?.title || null,
                    lastMessage: msg.content,
                    lastMessageAt: msg.createdAt,
                    unreadCount: 0
                });
            }

            // Count unread messages
            if (msg.receiverId === userId && !msg.isRead) {
                const conv = conversationsMap.get(key);
                conv.unreadCount++;
            }
        });

        const conversations = Array.from(conversationsMap.values())
            .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

        return NextResponse.json({ conversations });

    } catch (error) {
        console.error('Get Conversations Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
