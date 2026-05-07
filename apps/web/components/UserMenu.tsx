'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import NotificationBell from './NotificationBell';
import { User, ClipboardList, MessageSquare, Star, LogOut, LayoutDashboard } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

type UserMenuProps = {
    user: {
        fullName: string;
        role: string;
    } | null;
};

export default function UserMenu({ user }: UserMenuProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.refresh(); // Refresh server components
            window.location.href = '/login'; // Hard redirect to ensure state clear
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    if (!user) {
        return (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Link href="/login" className="btn btn-outline" style={{ border: 'none', padding: '8px 16px' }}>
                    {t('common.logIn')}
                </Link>
                <Link href="/register" className="btn btn-primary">
                    {t('common.signUp')}
                </Link>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Notification Bell */}
            <NotificationBell />

            {/* User Menu */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        padding: '6px 12px 6px 6px',
                        borderRadius: '50px',
                        transition: 'all 0.2s ease',
                        backgroundColor: isOpen ? 'var(--secondary)' : 'transparent'
                    }}
                >
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                    }}>
                        {user.fullName[0].toUpperCase()}
                    </div>
                    <div style={{ textAlign: 'left', marginLeft: '8px' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.fullName}</div>
                    </div>
                </button>

                {isOpen && (
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 12px)',
                        right: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        border: '1px solid var(--border)',
                        minWidth: '220px',
                        padding: '8px',
                        zIndex: 100,
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{ padding: '0 12px 8px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '8px' }}>{t('common.signedInAs')}</p>
                            <p style={{ fontWeight: '600', color: 'var(--text)' }}>{user.fullName}</p>
                        </div>

                        <Link
                            href={user.role === 'PROVIDER' ? '/provider' : '/customer'}
                            onClick={() => setIsOpen(false)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                color: 'var(--primary)',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                transition: 'background 0.2s',
                                backgroundColor: '#DBEAFE'
                            }}
                            className="hover:bg-gray-100"
                        >
                            <LayoutDashboard size={18} /> {t('common.dashboard')}
                        </Link>
                        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '8px 0' }} />
                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '10px 12px',
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                            className="hover:bg-red-50"
                        >
                            <LogOut size={18} /> {t('common.logOut')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

