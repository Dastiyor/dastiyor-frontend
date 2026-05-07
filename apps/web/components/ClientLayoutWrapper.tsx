'use client';

import { usePathname } from 'next/navigation';

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
    // Check if we are in the provider or customer dashboard
    const isDashboard = pathname?.startsWith('/provider') || pathname?.startsWith('/customer');

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
