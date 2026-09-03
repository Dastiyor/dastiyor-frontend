'use client';

import { usePathname } from 'next/navigation';

/** Directory names under `app/provider/` — everything there sits behind the PROVIDER guard. */
const PROVIDER_DASHBOARD_SEGMENTS = [
    'active-tasks',
    'completed-tasks',
    'messages',
    'my-responses',
    'payment-history',
    'portfolio',
    'profile',
    'subscription',
    'task-feed',
    'tasks',
];

export default function ClientLayoutWrapper({
    header,
    footer,
    children
}: {
    header: React.ReactNode;
    footer: React.ReactNode;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    // Dashboard chrome is suppressed for the signed-in portals. `/provider/<id>` is the
    // PUBLIC provider profile (app/(public)/provider/[id]) — a customer reaches it from any
    // offer, so it keeps the site header and footer. Match the dashboard segments by name
    // rather than excluding the id, so a bare `/provider/<id>` never loses its nav.
    const isProviderDashboard =
        pathname === '/provider' ||
        PROVIDER_DASHBOARD_SEGMENTS.some((segment) => pathname?.startsWith(`/provider/${segment}`));
    const isDashboard = isProviderDashboard || pathname?.startsWith('/customer');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {!isDashboard && header}
            <main style={{ flex: 1 }}>
                {children}
            </main>
            {!isDashboard && footer}
        </div>
    );
}
