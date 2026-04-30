import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import UserMenu from './UserMenu';
import LanguageSwitcher from './LanguageSwitcher';
import MobileMenu from './MobileMenu';
import HeaderNav from './HeaderNav';
import HeaderActions from './HeaderActions';
import { Heart } from 'lucide-react';

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

                {/* Center Navigation — i18n client component, hidden on mobile */}
                <HeaderNav userRole={user?.role} />

                {/* Right Actions */}
                <div className="desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <HeaderActions userRole={user?.role} />

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
                    ) : null}
                </div>

                {/* Hamburger — mobile only */}
                <MobileMenu user={user} />
            </div>
        </header>
    );
}
