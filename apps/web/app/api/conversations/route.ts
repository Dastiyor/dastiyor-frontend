import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { logAction, getRequestIP } from '@/lib/audit';

// GET - Fetch all conversations for the current user
export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = payload.id as string;

        // Limit to most recent 500 messages to bound memory usage
        const messages = await prisma.message.findMany({
            where: {
                // Hide conversations this user deleted; messages sent after the
                // delete are unmarked, so the thread reappears with just those.
                OR: [
                    { senderId: userId, deletedBySender: false },
                    { receiverId: userId, deletedByReceiver: false }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
            include: {
                sender: {
                    select: { id: true, fullName: true, role: true, skills: true, avatar: true }
                },
                receiver: {
                    select: { id: true, fullName: true, role: true, skills: true, avatar: true }
                },
                task: {
                    select: { id: true, title: true, category: true }
                }
            }
        });

        // Group by conversation partner
        type Conversation = {
            id: string;
            partnerId: string;
            partnerName: string;
            partnerAvatar: string | null;
            partnerRole: string | null;
            taskId: string | null;
            taskTitle: string | null;
            taskCategory: string | null;
            lastMessage: string;
            lastMessageAt: Date;
            unreadCount: number;
        };
        const conversationsMap = new Map<string, Conversation>();

        messages.forEach(msg => {
            const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            const partner = msg.senderId === userId ? msg.receiver : msg.sender;

            // Create a unique key combining partner and task
            const key = msg.taskId ? `${partnerId}-${msg.taskId}` : partnerId;

            if (!conversationsMap.has(key)) {
                const partnerSkills = partner.skills;
                const firstSkill = partnerSkills ? partnerSkills.split(',')[0].trim() : null;
                const badge = msg.task?.category || firstSkill || null;
                conversationsMap.set(key, {
                    id: key,
                    partnerId,
                    partnerName: partner.fullName,
                    partnerAvatar: partner.avatar ?? null,
                    partnerRole: badge,
                    taskId: msg.taskId,
                    taskTitle: msg.task?.title || null,
                    taskCategory: msg.task?.category || null,
                    lastMessage: msg.content,
                    lastMessageAt: msg.createdAt,
                    unreadCount: 0
                });
            }

            // Count unread messages
            if (msg.receiverId === userId && !msg.isRead) {
                const conv = conversationsMap.get(key);
                if (conv) conv.unreadCount++;
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

// DELETE - Remove one conversation from the caller's view only. The other
// participant keeps their copy; nothing is erased from the database.
export async function DELETE(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = payload.id as string;
        const { searchParams } = new URL(request.url);
        const partnerId = searchParams.get('userId');
        const taskIdParam = searchParams.get('taskId');

        if (!partnerId) {
            return NextResponse.json({ error: 'Не указан параметр userId' }, { status: 400 });
        }
        if (partnerId === userId) {
            return NextResponse.json({ error: 'Нельзя удалить переписку с самим собой' }, { status: 400 });
        }

        // Conversations are keyed by partner + task, so scope the delete the
        // same way: an absent taskId means the task-less thread, not all of them.
        const taskScope = { taskId: taskIdParam ? taskIdParam : null };

        const [sent, received] = await prisma.$transaction([
            prisma.message.updateMany({
                where: { senderId: userId, receiverId: partnerId, ...taskScope },
                data: { deletedBySender: true },
            }),
            prisma.message.updateMany({
                where: { senderId: partnerId, receiverId: userId, ...taskScope },
                data: { deletedByReceiver: true },
            }),
        ]);

        const deleted = sent.count + received.count;
        if (deleted === 0) {
            return NextResponse.json({ error: 'Переписка не найдена' }, { status: 404 });
        }

        logAction({
            action: 'DELETE_CONVERSATION',
            userId,
            entity: 'Message',
            entityId: partnerId,
            details: { partnerId, taskId: taskIdParam ?? null, messagesHidden: deleted },
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({ message: 'Conversation deleted', count: deleted });

    } catch (error) {
        console.error('Delete Conversation Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
