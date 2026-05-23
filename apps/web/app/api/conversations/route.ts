import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT, getBearerToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function authenticate(request: Request) {
    const bearerToken = getBearerToken(request);
    let token: string | undefined = bearerToken ?? undefined;
    if (!token) {
        const cookieStore = await cookies();
        token = cookieStore.get('token')?.value;
    }
    if (!token) return null;
    const payload = await verifyJWT(token);
    return payload?.id ? payload : null;
}

// GET - Fetch all conversations for the current user
export async function GET(request: Request) {
    try {
        const payload = await authenticate(request);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = payload.id as string;

        // Limit to most recent 500 messages to bound memory usage
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
            include: {
                sender: {
                    select: { id: true, fullName: true, role: true }
                },
                receiver: {
                    select: { id: true, fullName: true, role: true }
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
                    partnerRole: partner.role,
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
