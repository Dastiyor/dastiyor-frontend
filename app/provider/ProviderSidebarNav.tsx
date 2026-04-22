'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    User,
    CreditCard, // TODO: Re-enable when payment gateway is ready
} from 'lucide-react';

export default function ProviderSidebarNav() {
    const pathname = usePathname();
    const accentColor = 'var(--primary)';

    const navItems = [
        { href: '/provider', label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { href: '/provider/my-responses', label: 'My Responses', icon: FileText },
        { href: '/provider/profile', label: 'Profile', icon: User },
        // TODO: Re-enable when payment gateway is ready
        // { href: '/provider/subscription', label: 'Subscription', icon: CreditCard },
    ];

    const isActive = (href: string, exact?: boolean) => {
        if (exact) {
            return pathname === href;
        }
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            backgroundColor: active ? accentColor : 'transparent',
                            color: active ? 'white' : '#475569',
                            textDecoration: 'none',
                            fontWeight: active ? '600' : '500',
                            fontSize: '0.9rem',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Icon size={18} />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
