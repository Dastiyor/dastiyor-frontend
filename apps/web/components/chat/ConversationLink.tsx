'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useTranslation } from '@/lib/i18n';

type ConversationLinkProps = {
    conversation: {
        id: string;
        partnerId: string;
        partnerName: string;
        taskId: string | null;
        taskTitle: string | null;
        lastMessage: string;
        lastMessageAt: Date;
        unreadCount: number;
    };
    basePath?: string;
};

export default function ConversationLink({ conversation: conv, basePath }: ConversationLinkProps) {
    const router = useRouter();
    const { t } = useTranslation();
    const { confirm, Dialog } = useConfirm();
    const [deleting, setDeleting] = useState(false);

    async function handleDelete(e: React.MouseEvent) {
        // The row is a Link; keep the click from navigating into the chat.
        e.preventDefault();
        e.stopPropagation();

        const ok = await confirm(
            t('chat.deleteChatConfirm').replace('{name}', conv.partnerName),
            t('chat.deleteChat'),
            'danger'
        );
        if (!ok) return;

        setDeleting(true);
        try {
            const qs = new URLSearchParams({ userId: conv.partnerId });
            if (conv.taskId) qs.set('taskId', conv.taskId);
            const res = await fetch(`/api/conversations?${qs}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('failed');
            toast.success(t('chat.deleteChatDone'));
            router.refresh();
        } catch {
            toast.error(t('chat.deleteChatError'));
            setDeleting(false);
        }
    }

    return (
        <div style={{ position: 'relative' }}>
        <Link
            href={`${basePath || '/messages'}?userId=${conv.partnerId}${conv.taskId ? `&taskId=${conv.taskId}` : ''}`}
            style={{
                display: 'block',
                padding: '16px 20px',
                borderBottom: '1px solid #f3f4f6',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background-color 0.2s',
                cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600' }}>{conv.partnerName}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {conv.unreadCount > 0 && (
                    <span style={{
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 'bold'
                    }}>
                        {conv.unreadCount}
                    </span>
                )}
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    aria-label={t('chat.deleteChat')}
                    title={t('chat.deleteChat')}
                    style={{
                        background: 'none', border: 'none', padding: '2px 4px',
                        cursor: deleting ? 'default' : 'pointer', color: '#9ca3af',
                        fontSize: '1rem', lineHeight: 1, opacity: deleting ? 0.5 : 1,
                    }}
                >
                    ✕
                </button>
                </span>
            </div>
            {conv.taskTitle && (
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '4px' }}>
                    📋 {conv.taskTitle}
                </div>
            )}
            <div style={{
                fontSize: '0.9rem',
                color: 'var(--text-light)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }}>
                {conv.lastMessage}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px' }}>
                {new Date(conv.lastMessageAt).toLocaleDateString()}
            </div>
        </Link>
        <Dialog />
        </div>
    );
}
