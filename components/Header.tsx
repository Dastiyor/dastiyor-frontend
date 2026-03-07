import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import UserMenu from './UserMenu';
import LanguageSwitcher from './LanguageSwitcher';
import { LogIn, Heart } from 'lucide-react';

export default async function Header() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    let user = null;

    if (token) {
        const payload = await verifyJWT(token);
        if (payload && payload.id) {
            const { prisma } = await import('@/lib/prisma');
            const dbUser = await prisma.user.findUnique({
                where: { id: payload.id as string },
                select: { fullName: true, role: true }
            });
            if (dbUser) {
                user = dbUser;
            }
        }
    }

    return (
        <header style={{
            height: '80px',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>
            <div className="container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 20px'
            }}>
                {/* Logo Section */}
                <Link href="/" style={{
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: 'none'
                }}>
                    <Image
                        src="/logo-blue-white.svg"
                        alt="Dastiyor"
                        width={150}
                        height={50}
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </Link>

                {/* Center Navigation */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <Link href="/how-it-works" style={{
                        fontWeight: '500',
                        color: '#374151',
                        fontSize: '0.9rem',
                        transition: 'color 0.2s',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap'
                    }}>
                        Как это работает
                    </Link>
                    <Link href="/tasks" style={{
                        fontWeight: '500',
                        color: '#374151',
                        fontSize: '0.9rem',
                        transition: 'color 0.2s',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap'
                    }}>
                        Найти задания
                    </Link>
                    {(!user || user.role !== 'PROVIDER') && (
                        <Link href="/register?type=provider" style={{
                            fontWeight: '600',
                            color: '#4F46E5',
                            fontSize: '0.9rem',
                            borderBottom: '2px solid #4F46E5',
                            paddingBottom: '2px',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap'
                        }}>
                            Стать исполнителем
                        </Link>
                    )}
                </nav>

                {/* Right Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {user && user.role === 'CUSTOMER' && (
                        <Link href="/create-task/template" style={{
                            backgroundColor: '#F3F4F6',
                            color: '#374151',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            transition: 'background-color 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #E5E7EB',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap'
                        }}>
                            Шаблоны
                        </Link>
                    )}

                    {(!user || user.role === 'CUSTOMER') && (
                        <Link href={user ? "/customer/create-task" : "/create-task"} style={{
                            backgroundColor: '#6366F1',
                            color: 'white',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            transition: 'background-color 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap'
                        }}>
                            Создать задание
                        </Link>
                    )}

                    <LanguageSwitcher />

                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user.role === 'PROVIDER' && (
                                <Link href="/favorites" className="favorites-link" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    color: '#6B7280',
                                    textDecoration: 'none',
                                    border: '1px solid #E5E7EB'
                                }} title="Избранное">
                                    <Heart size={20} />
                                </Link>
                            )}
                            <UserMenu user={user} />
                        </div>
                    ) : (
                        <Link href="/login" style={{
                            backgroundColor: '#F3F4F6',
                            color: '#111827',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            border: '1px solid #E5E7EB',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap'
                        }}>
                            <LogIn size={16} />
                            Войти
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
