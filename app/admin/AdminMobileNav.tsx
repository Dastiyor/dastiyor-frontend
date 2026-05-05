'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, LayoutDashboard, Users, FileText, CreditCard, Settings, ShieldAlert, FolderTree, MessageSquare } from 'lucide-react';
import { usePathname } from 'next/navigation';

const menuItems = [
    { name: 'Обзор', href: '/admin', icon: LayoutDashboard },
    { name: 'Пользователи', href: '/admin/users', icon: Users },
    { name: 'Задания', href: '/admin/tasks', icon: FileText },
    { name: 'Категории', href: '/admin/categories', icon: FolderTree },
    { name: 'Подписки', href: '/admin/subscriptions', icon: CreditCard },
    { name: 'Модерация', href: '/admin/moderation', icon: ShieldAlert },
    { name: 'Отзывы и жалобы', href: '/admin/reviews-complaints', icon: MessageSquare },
    { name: 'Настройки', href: '/admin/settings', icon: Settings },
];

export default function AdminMobileNav() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => { setOpen(false); }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <>
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Открыть меню"
                className="mobile-dash-btn"
                style={{
                    display: 'none',
                    background: 'none',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Menu size={22} />
            </button>

            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 998, backgroundColor: 'rgba(0,0,0,0.5)' }}
                />
            )}

            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '260px',
                height: '100vh',
                backgroundColor: '#1f2937',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 999,
                transform: open ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s ease',
                overflowY: 'auto',
            }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Админ панель</h1>
                    <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                        <X size={20} />
                    </button>
                </div>
                <nav style={{ flex: 1, padding: '24px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, gap: '8px', display: 'flex', flexDirection: 'column' }}>
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.name}>
                                    <Link href={item.href} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        color: '#9ca3af',
                                        textDecoration: 'none',
                                    }}>
                                        <Icon size={20} />
                                        {item.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                <div style={{ padding: '24px', borderTop: '1px solid #374151' }}>
                    <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>← Вернуться на сайт</Link>
                </div>
            </div>
        </>
    );
}
