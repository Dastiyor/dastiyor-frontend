'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function HeaderNav({ userRole }: { userRole?: string | null }) {
    const { t } = useTranslation();

    return (
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="/how-it-works" style={{
                fontWeight: '500',
                color: '#374151',
                fontSize: '0.9rem',
                transition: 'color 0.2s',
                textDecoration: 'none',
                whiteSpace: 'nowrap'
            }}>
                {t('header.howItWorks')}
            </Link>
            <Link href="/tasks" style={{
                fontWeight: '500',
                color: '#374151',
                fontSize: '0.9rem',
                transition: 'color 0.2s',
                textDecoration: 'none',
                whiteSpace: 'nowrap'
            }}>
                {t('header.findTasks')}
            </Link>
            {!userRole && (
                <Link href="/register?type=provider" style={{
                    fontWeight: '600',
                    color: '#4F46E5',
                    fontSize: '0.9rem',
                    borderBottom: '2px solid #4F46E5',
                    paddingBottom: '2px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap'
                }}>
                    {t('header.becomeProvider')}
                </Link>
            )}
        </nav>
    );
}
