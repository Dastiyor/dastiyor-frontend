import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import ConversationLink from '@/components/chat/ConversationLink';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function MessagesPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        redirect('/login');
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
        redirect('/login');
    }

    const userId = payload.id as string;
    const { t } = await getServerTranslation();

    // Get all conversations
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

        if (msg.receiverId === userId && !msg.isRead) {
            const conv = conversationsMap.get(key);
            conv.unreadCount++;
        }
    });

    const conversations = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container">
                <h1 className="heading-lg" style={{ marginBottom: '32px' }}>{t('common.messages')}</h1>

                <div className="messages-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: '320px 1fr',
                    gap: '24px',
                    height: 'calc(100vh - 200px)',
                    minHeight: '500px'
                }}>
                    {/* Conversations List */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border)',
                            fontWeight: '600'
                        }}>
                            {t('chat.conversations')} ({conversations.length})
                        </div>

                        <div style={{ overflowY: 'auto', height: 'calc(100% - 60px)' }}>
                            {conversations.length === 0 ? (
                                <div style={{
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                    color: 'var(--text-light)'
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
                                    <p>{t('chat.noConversations')}</p>
                                    <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                                        {t('chat.noConversationsDesc')}
                                    </p>
                                </div>
                            ) : (
                                conversations.map((conv) => (
                                    <ConversationLink key={conv.id} conversation={conv} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Interface */}
                    <Suspense fallback={
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-light)'
                        }}>
                            <div>{t('chat.loadingChat')}</div>
                        </div>
                    }>
                        <ChatInterface currentUserId={userId} />
                    </Suspense>
                </div>
            </div>
        <style>{`
            @media (max-width: 768px) {
                .messages-grid { grid-template-columns: 1fr !important; height: auto !important; min-height: 0 !important; }
                .messages-grid > div:first-child { height: 300px !important; }
            }
        `}</style>
        </div>
    );
}
