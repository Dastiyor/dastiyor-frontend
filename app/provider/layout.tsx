import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Wifi,
    FileText,
    User,
    CreditCard,
    Search,
    Bell,
    Settings
} from 'lucide-react';
import UserMenu from '@/components/UserMenu';
import ProviderSidebarNav from './ProviderSidebarNav';

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
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
            {/* Left Sidebar - Light Theme */}
            <aside style={{
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

                {/* TODO: Re-enable current plan badge when payment gateway is ready */}
                {/* <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                    {user.subscription && user.subscription.isActive && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>
                                CURRENT PLAN
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1E293B' }}>{planName} Plan</span>
                                <span style={{ fontSize: '0.8rem', color: accentColor, fontWeight: '600' }}>{daysLeft} days left</span>
                            </div>
                        </div>
                    )}
                </div> */}
                <div style={{ marginTop: 'auto', paddingTop: '16px' }} />
            </aside>

            {/* Main Content */}
            <div style={{ flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column' }}>
                {/* Top Header */}
                <header style={{
                    backgroundColor: 'white',
                    padding: '16px 32px',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 40
                }}>
                    <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* UserMenu handles Bell, Profile, and Logout */}
                        <UserMenu user={user} />
                    </div>
                </header>

                {/* Page Content */}
                <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
