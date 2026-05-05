import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Search,
} from 'lucide-react';
import UserMenu from '@/components/UserMenu';
import ProviderSidebarNav from './ProviderSidebarNav';
import ProviderMobileNav from './ProviderMobileNav';

export const dynamic = 'force-dynamic';

export default async function ProviderLayout({
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
    if (!payload || !payload.id) {
        redirect('/login');
    }

    // TODO: Re-enable subscription include when payment gateway is ready
    // const user = await prisma.user.findUnique({
    //     where: { id: payload.id as string },
    //     include: { subscription: true }
    // });
    const user = await prisma.user.findUnique({
        where: { id: payload.id as string }
    });

    if (!user || user.role !== 'PROVIDER') {
        redirect('/access-denied');
    }

    // TODO: Re-enable plan display when payment gateway is ready
    // const daysLeft = user.subscription && user.subscription.isActive
    //     ? Math.ceil((new Date(user.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    //     : 0;
    // const planName = user.subscription?.plan === 'premium' ? 'Premium' :
    //     user.subscription?.plan === 'standard' ? 'Pro' :
    //         user.subscription?.plan === 'basic' ? 'Basic' : 'Free';

    const accentColor = 'var(--primary)';

    return (
        <>
        <style>{`
            @media (max-width: 768px) {
                .dashboard-sidebar { display: none !important; }
                .dashboard-main { margin-left: 0 !important; }
                .mobile-dash-btn { display: flex !important; }
                .dashboard-search { display: none !important; }
                .mobile-dash-logo { display: flex !important; }
                .dashboard-header { padding: 12px 16px !important; }
                .dashboard-content { padding: 16px !important; }
            }
            @media (min-width: 769px) {
                .mobile-dash-btn { display: none !important; }
                .mobile-dash-logo { display: none !important; }
            }
        `}</style>
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
            {/* Left Sidebar - Light Theme */}
            <aside className="dashboard-sidebar" style={{
                width: '240px',
                backgroundColor: '#FFFFFF',
                borderRight: '1px solid #E2E8F0',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                top: 0,
                left: 0,
                height: '100vh',
                overflowY: 'auto',
                zIndex: 50
            }}>
                {/* Logo */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', marginBottom: '32px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        backgroundColor: accentColor,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <LayoutDashboard size={20} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1E293B' }}>Dastiyor</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Provider Portal</div>
                    </div>
                </Link>

                {/* Navigation - Client Component for active state */}
                <ProviderSidebarNav />

                <div style={{ marginTop: 'auto', paddingTop: '16px' }} />
            </aside>

            {/* Main Content */}
            <div className="dashboard-main" style={{ flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column' }}>
                {/* Top Header */}
                <header className="dashboard-header" style={{
                    backgroundColor: 'white',
                    padding: '16px 32px',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 40
                }}>
                    {/* Mobile: hamburger */}
                    <ProviderMobileNav />

                    {/* Mobile: logo text */}
                    <div className="mobile-dash-logo" style={{ display: 'none', fontWeight: '700', fontSize: '1rem', color: '#1E293B', flex: 1 }}>
                        Dastiyor
                    </div>

                    {/* Desktop: search */}
                    <div className="dashboard-search" style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        <input
                            type="text"
                            placeholder="Search tasks, clients, or records..."
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 40px',
                                borderRadius: '10px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#F8FAFC',
                                fontSize: '0.85rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
                        {/* UserMenu handles Bell, Profile, and Logout */}
                        <UserMenu user={user} />
                    </div>
                </header>

                {/* Page Content */}
                <main className="dashboard-content" style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div>
        </>
    );
}
