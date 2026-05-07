'use client';

import Link from 'next/link';

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
    return (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600' }}>{conv.partnerName}</span>
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
    );
}
