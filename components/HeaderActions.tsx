'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { LogIn } from 'lucide-react';

export default function HeaderActions({ userRole }: { userRole?: string | null }) {
    const { t } = useTranslation();

    if (!userRole) {
        return (
            <>
                <Link href="/create-task" style={{
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
                    {t('header.createTask')}
                </Link>
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
                    {t('common.login')}
                </Link>
            </>
        );
    }

    if (userRole === 'CUSTOMER') {
        return (
            <>
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
                    {t('header.templates')}
                </Link>
                <Link href="/customer/create-task" style={{
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
                    {t('header.createTask')}
                </Link>
            </>
        );
    }

    return null;
}
