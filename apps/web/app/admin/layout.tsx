import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/auth';
import Link from 'next/link';
import { LayoutDashboard, Users, FileText, CreditCard, Settings, ShieldAlert, FolderTree, MessageSquare } from 'lucide-react';
import AdminMobileNav from './AdminMobileNav';

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

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        redirect('/login');
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
        redirect('/');
    }

    return (
        <>
        <style>{`
            @media (max-width: 768px) {
                .admin-sidebar { display: none !important; }
                .admin-main { padding: 16px !important; }
                .mobile-dash-btn { display: flex !important; }
                .admin-topbar { display: flex !important; }
            }
            @media (min-width: 769px) {
                .mobile-dash-btn { display: none !important; }
                .admin-topbar { display: none !important; }
            }
        `}</style>
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
            {/* Sidebar */}
            <aside className="admin-sidebar" style={{ width: '250px', backgroundColor: '#1f2937', color: 'white', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #374151' }}>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Админ панель</h1>
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
                                        transition: 'all 0.2s',
                                        backgroundColor: 'transparent'
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
                    <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                        ← Вернуться на сайт
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Mobile top bar */}
                <div className="admin-topbar" style={{
                    display: 'none',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: '#1f2937',
                    color: 'white',
                }}>
                    <AdminMobileNav />
                    <span style={{ fontWeight: '700', fontSize: '1rem' }}>Админ панель</span>
                </div>
                <main className="admin-main" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div>
        </>
    );
}
