'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { MapPin, Clock, MessageCircle, Zap, Heart, Share2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useTranslation } from '@/lib/i18n';

export type Task = {
    id: string;
    title: string;
    category: string;
    budget: string;
    budgetType?: string;
    city: string;
    postedAt: string;
    description: string;
    urgency?: string;
    responseCount?: number;
    status?: string;
    hasPremiumResponse?: boolean;
};

const urgencyColors: Record<string, { color: string; bg: string }> = {
    urgent: { color: '#DC2626', bg: '#FEE2E2' },
    normal: { color: '#059669', bg: '#D1FAE5' },
    low: { color: '#6B7280', bg: '#F3F4F6' },
};

const statusColors: Record<string, { bg: string; text: string }> = {
    'IN_PROGRESS': { bg: '#fff3e0', text: '#f57c00' },
    'COMPLETED': { bg: '#e3f2fd', text: '#1976d2' },
    'CANCELLED': { bg: '#ffebee', text: '#c62828' },
    'OPEN': { bg: '#e8f5e9', text: '#2e7d32' },
};

export default function TaskCard({ task }: { task: Task }) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation();

    const urgencyLabels: Record<string, string> = {
        urgent: t('tasks.urgent'),
        normal: t('tasks.normal'),
        low: t('tasks.urgencyFlexible'),
    };
    const statusLabels: Record<string, string> = {
        'OPEN': t('tasks.open').toUpperCase(),
        'IN_PROGRESS': t('tasks.inProgress').toUpperCase(),
        'COMPLETED': t('tasks.completed').toUpperCase(),
        'CANCELLED': t('tasks.cancelled').toUpperCase(),
    };

    const urgencyKey = task.urgency || 'normal';
    const urgencyColors_ = urgencyColors[urgencyKey] || urgencyColors.normal;
    const urgencyLabel = urgencyLabels[urgencyKey] || urgencyLabels.normal;
    const isNegotiable = task.budgetType === 'negotiable';
    const status = task.status || 'OPEN';
    const statusColor = statusColors[status] || statusColors['OPEN'];
    const statusLabel = statusLabels[status] || statusLabels['OPEN'];
    const showPremium = task.hasPremiumResponse && status === 'OPEN';

    useEffect(() => {
        // Check if task is favorited
        fetch(`/api/tasks/favorite?taskId=${task.id}`)
            .then(res => res.json())
            .then(data => setIsFavorite(data.isFavorite || false))
            .catch(() => { });
    }, [task.id]);

    const handleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsLoading(true);
        try {
            const res = await fetch('/api/tasks/favorite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: task.id })
            });
            if (res.status === 401) {
                toast.error(t('tasks.favoriteLoginRequired'));
                return;
            }
            if (!res.ok) {
                toast.error(t('tasks.favoriteError'));
                return;
            }
            const data = await res.json();
            setIsFavorite(data.isFavorite);
            toast.success(data.isFavorite ? t('tasks.favoriteAdded') : t('tasks.favoriteRemoved'));
        } catch (err) {
            toast.error(t('common.error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/tasks/${task.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: task.title,
                    text: task.description.substring(0, 100),
                    url: url
                });
                toast.success(t('tasks.taskShared'));
            } catch (err) {
                // User cancelled or error
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(url);
            toast.success(t('tasks.linkCopied'));
        }
    };

    return (
        <div style={{
            backgroundColor: 'var(--white)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border)',
            position: 'relative',
        }}>
        <div className="task-card-inner">
            {/* Main content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: '800',
                        color: 'var(--text)',
                        margin: 0,
                    }}>
                        {task.title}
                    </h3>
                    {task.category && (
                        <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#E0F2FE',
                            color: '#0369A1',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                        }}>
                            {task.category}
                        </span>
                    )}
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: urgencyColors_.bg,
                        color: urgencyColors_.color,
                        fontSize: '0.75rem',
                        fontWeight: '600',
                    }}>
                        {urgencyLabel}
                    </span>
                    <button
                        type="button"
                        onClick={handleFavorite}
                        disabled={isLoading}
                        aria-label="Favorite"
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: isLoading ? 'wait' : 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Heart size={20} color="#EF4444" fill={isFavorite ? '#EF4444' : 'none'} />
                    </button>
                    <button
                        type="button"
                        onClick={handleShare}
                        aria-label="Share"
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Share2 size={20} color="var(--text-light)" />
                    </button>
                </div>

                <p style={{
                    color: 'var(--text-light)',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    marginBottom: '20px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    fontWeight: '500'
                }}>
                    {task.description}
                </p>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '600' }}>
                        <MapPin size={18} /> {task.city || 'Remote'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '600' }}>
                        <Clock size={18} /> {task.postedAt}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '600' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        {t('tasks.responseCountLabel', { count: task.responseCount ?? 0 })}
                    </div>
                </div>
            </div>

            {/* Right side information & Action */}
            <div className="task-card-right">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {showPremium && (
                        <div style={{
                            backgroundColor: 'var(--primary)',
                            color: 'var(--white)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '4px'
                        }}>
                            <span style={{ fontSize: '12px' }}>★</span> PREMIUM
                        </div>
                    )}
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '900',
                        color: 'var(--text)',
                        lineHeight: '1.2'
                    }}>
                        {task.budget}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '700' }}>
                        {isNegotiable ? t('common.negotiable') : t('tasks.fixedPrice')}
                    </div>
                </div>

                <Link
                    href={`/tasks/${task.id}`}
                    style={{
                        backgroundColor: isPremium ? 'var(--primary)' : 'var(--secondary)',
                        color: isPremium ? 'var(--white)' : 'var(--text-light)',
                        padding: '12px 24px',
                        borderRadius: '10px',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        width: '100%',
                        textAlign: 'center',
                        border: 'none'
                    }}
                >
                    {t('tasks.viewDetails')}
                </Link>
            </div>
        </div>
        </div>
    );
}

// Helper to determine if a task is "premium" for styling purposes
const isPremium = true; // In the mockup, some show blue buttons, others gray. I'll stick to blue for primary action.
