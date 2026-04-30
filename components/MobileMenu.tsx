'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, LogIn } from 'lucide-react';

type UserInfo = { fullName: string; role: string } | null;

export default function MobileMenu({ user }: { user: UserInfo }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    const close = () => setOpen(false);

    return (
        <>
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Открыть меню"
                style={{
                    display: 'none',
                    background: 'none',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: '#374151',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                className="mobile-menu-btn"
            >
                {open ? <X size={22} /> : <Menu size={22} />}
            </button>

            {open && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                    }}
                    onClick={close}
                />
            )}

            <div
                style={{
                    position: 'fixed',
                    top: '80px',
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    borderBottom: '1px solid #E5E7EB',
                    zIndex: 1000,
                    padding: '24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transform: open ? 'translateY(0)' : 'translateY(calc(-100% - 80px))',
                    visibility: open ? 'visible' : 'hidden',
                    transition: 'transform 0.25s ease',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                }}
            >
                <Link href="/how-it-works" onClick={close} style={{ padding: '14px 16px', borderRadius: '10px', fontWeight: '600', fontSize: '1rem', color: '#374151', textDecoration: 'none', backgroundColor: '#F9FAFB' }}>
                    Как это работает
                </Link>
                <Link href="/tasks" onClick={close} style={{ padding: '14px 16px', borderRadius: '10px', fontWeight: '600', fontSize: '1rem', color: '#374151', textDecoration: 'none', backgroundColor: '#F9FAFB' }}>
                    Найти задания
                </Link>
                {(!user || user.role !== 'PROVIDER') && (
                    <Link href="/register?type=provider" onClick={close} style={{ padding: '14px 16px', borderRadius: '10px', fontWeight: '600', fontSize: '1rem', color: '#4F46E5', textDecoration: 'none', backgroundColor: '#EEF2FF' }}>
                        Стать исполнителем
                    </Link>
                )}
                {(!user || user.role === 'CUSTOMER') && (
                    <Link href={user ? '/customer/create-task' : '/create-task'} onClick={close} style={{ padding: '14px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', color: 'white', textDecoration: 'none', backgroundColor: '#6366F1' }}>
                        Создать задание
                    </Link>
                )}
                {!user && (
                    <Link href="/login" onClick={close} style={{ padding: '14px 16px', borderRadius: '10px', fontWeight: '600', fontSize: '1rem', color: '#111827', textDecoration: 'none', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LogIn size={18} /> Войти
                    </Link>
                )}
                {user && (
                    <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: '#F9FAFB', color: '#374151', fontSize: '0.95rem', fontWeight: '500' }}>
                        {user.fullName}
                    </div>
                )}
            </div>
        </>
    );
}
