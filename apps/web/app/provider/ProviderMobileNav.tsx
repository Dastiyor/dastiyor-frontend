'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ProviderSidebarNav from './ProviderSidebarNav';

export default function ProviderMobileNav() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <>
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Open menu"
                className="mobile-dash-btn"
                style={{
                    display: 'none',
                    background: 'none',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: '#374151',
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
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 998,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                    }}
                />
            )}

            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '260px',
                height: '100vh',
                backgroundColor: '#FFFFFF',
                borderRight: '1px solid #E2E8F0',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 999,
                transform: open ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s ease',
                overflowY: 'auto',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: 'var(--primary)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <LayoutDashboard size={20} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1E293B' }}>Dastiyor</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Provider Portal</div>
                        </div>
                    </Link>
                    <button
                        onClick={() => setOpen(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex', alignItems: 'center' }}
                    >
                        <X size={20} />
                    </button>
                </div>
                <ProviderSidebarNav />
            </div>
        </>
    );
}
