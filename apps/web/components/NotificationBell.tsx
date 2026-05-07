'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, BellOff, MessageSquare, CheckCircle, CheckSquare, Info, XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

type Notification = {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
};

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        fetchNotifications();

        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function fetchNotifications() {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }

    const markAllRead = async () => {
        try {
            await fetch('/api/notifications', { method: 'PUT' });
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark notifications as read', error);
        }
    };

    const handleOpen = () => {
        if (!isOpen && unreadCount > 0) {
            markAllRead(); // Mark as read when opening
        }
        setIsOpen(!isOpen);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'NEW_MESSAGE': return <MessageSquare size={20} color="#6366F1" />;
            case 'OFFER_ACCEPTED': return <CheckCircle size={20} color="#10B981" />;
            case 'OFFER_REJECTED': return <XCircle size={20} color="#EF4444" />;
            case 'TASK_COMPLETED': return <CheckSquare size={20} color="#3B82F6" />;
            case 'NEW_OFFER': return <MoneyIcon />;
            default: return <Info size={20} color="#6B7280" />;
        }
    };

    const MoneyIcon = () => (
        <span style={{ fontSize: '20px', lineHeight: 1 }}>💰</span>
    );

    const formatTime = (date: string) => {
        const now = new Date();
        const then = new Date(date);
        const diffMs = now.getTime() - then.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return t('notifications.justNow');
        if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
        if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
        return then.toLocaleDateString();
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={handleOpen}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.3rem',
                    padding: '8px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4B5563'
                }}
                aria-label={t('notifications.title')}
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        minWidth: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '360px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                    border: '1px solid #e5e7eb',
                    zIndex: 1000,
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #e5e7eb',
                        fontWeight: '600',
                        fontSize: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>{t('notifications.title')}</span>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{
                                padding: '40px 20px',
                                textAlign: 'center',
                                color: '#9ca3af'
                            }}>
                                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                                    <BellOff size={40} strokeWidth={1.5} />
                                </div>
                                {t('notifications.noNew')}
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <Link
                                    key={notification.id}
                                    href={notification.link || '#'}
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        display: 'flex',
                                        gap: '12px',
                                        padding: '16px 20px',
                                        borderBottom: '1px solid #f3f4f6',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        transition: 'background-color 0.2s',
                                        backgroundColor: notification.isRead ? 'transparent' : '#f0f9ff'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notification.isRead ? 'transparent' : '#f0f9ff'}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: '#F3F4F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '2px' }}>
                                            {notification.title}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', lineHeight: '1.4', color: 'var(--text-light)' }}>
                                            {notification.message}
                                        </div>
                                        <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
                                            {formatTime(notification.createdAt)}
                                        </div>
                                    </div>
                                    {!notification.isRead && (
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: '#3B82F6',
                                            marginTop: '6px'
                                        }} />
                                    )}
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
