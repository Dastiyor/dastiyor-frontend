'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { MapPin, Clock, MessageCircle, Zap, Heart, Share2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export type Task = {
    id: string;
    title: string;
    category: string;
    budget: string;
    city: string;
    postedAt: string;
    description: string;
    urgency?: string;
    responseCount?: number;
    status?: string;
    hasPremiumResponse?: boolean;
};

const urgencyConfig: Record<string, { label: string; color: string; bg: string }> = {
    urgent: { label: 'Срочно', color: '#DC2626', bg: '#FEE2E2' },
    normal: { label: 'Обычная', color: '#059669', bg: '#D1FAE5' },
    low: { label: 'Гибкий', color: '#6B7280', bg: '#F3F4F6' }
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    'IN_PROGRESS': { label: 'В РАБОТЕ', bg: '#fff3e0', text: '#f57c00' },
    'COMPLETED': { label: 'ЗАВЕРШЕНО', bg: '#e3f2fd', text: '#1976d2' },
    'CANCELLED': { label: 'ОТМЕНЕНО', bg: '#ffebee', text: '#c62828' },
    'OPEN': { label: 'ОТКРЫТО', bg: '#e8f5e9', text: '#2e7d32' },
};

export default function TaskCard({ task }: { task: Task }) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const urgency = urgencyConfig[task.urgency || 'normal'] || urgencyConfig.normal;
    const isNegotiable = task.budget === 'Договорная';
    const status = task.status || 'OPEN';
    const statusInfo = statusConfig[status] || statusConfig['OPEN'];
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
                toast.error('Войдите в систему, чтобы добавить в избранное');
                return;
            }
            if (!res.ok) {
                toast.error('Ошибка при сохранении');
                return;
            }
            const data = await res.json();
            setIsFavorite(data.isFavorite);
            toast.success(data.isFavorite ? 'Добавлено в избранное' : 'Удалено из избранного');
        } catch (err) {
            toast.error('Ошибка при сохранении');
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
                toast.success('Задание поделено');
            } catch (err) {
                // User cancelled or error
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(url);
            toast.success('Ссылка скопирована в буфер обмена');
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '24px'
        }}>
            {/* Main content */}
            <div style={{ flex: 1 }}>
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
                        backgroundColor: urgency.bg,
                        color: urgency.color,
                        fontSize: '0.75rem',
                        fontWeight: '600',
                    }}>
                        {urgency.label}
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
                        {task.responseCount ?? 0} Bids received
                    </div>
                </div>
            </div>

            {/* Right side information & Action */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '16px',
                minWidth: '140px'
            }}>
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
                        {isNegotiable ? 'Договорная' : 'Фиксированная цена'}
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
                    View Details
                </Link>
            </div>
        </div>
    );
}

// Helper to determine if a task is "premium" for styling purposes
const isPremium = true; // In the mockup, some show blue buttons, others gray. I'll stick to blue for primary action.
