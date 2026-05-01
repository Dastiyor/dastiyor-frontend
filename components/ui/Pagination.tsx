'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    baseUrl: string;
    searchParams: Record<string, string | undefined>;
}

export default function Pagination({ currentPage, totalPages, baseUrl, searchParams }: PaginationProps) {
    const { t } = useTranslation();
    const createUrl = (page: number) => {
        const params = new URLSearchParams();
        Object.entries(searchParams).forEach(([key, value]) => {
            if (value && key !== 'page') {
                params.set(key, value);
            }
        });
        if (page > 1) {
            params.set('page', page.toString());
        }
        const queryString = params.toString();
        return `${baseUrl}${queryString ? `?${queryString}` : ''}`;
    };

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentPage > 1 && (
                <Link
                    href={createUrl(currentPage - 1)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'white',
                        color: 'var(--text)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                    }}
                >
                    <ChevronLeft size={16} />
                    {t('ui.prevPage')}
                </Link>
            )}

            {startPage > 1 && (
                <>
                    <Link
                        href={createUrl(1)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'white',
                            color: 'var(--text)',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: '500'
                        }}
                    >
                        1
                    </Link>
                    {startPage > 2 && <span style={{ color: 'var(--text-light)' }}>...</span>}
                </>
            )}

            {pages.map((page) => (
                <Link
                    key={page}
                    href={createUrl(page)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: page === currentPage ? 'var(--primary)' : 'white',
                        color: page === currentPage ? 'white' : 'var(--text)',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontWeight: page === currentPage ? '600' : '500',
                        minWidth: '40px',
                        textAlign: 'center'
                    }}
                >
                    {page}
                </Link>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span style={{ color: 'var(--text-light)' }}>...</span>}
                    <Link
                        href={createUrl(totalPages)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'white',
                            color: 'var(--text)',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: '500'
                        }}
                    >
                        {totalPages}
                    </Link>
                </>
            )}

            {currentPage < totalPages && (
                <Link
                    href={createUrl(currentPage + 1)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'white',
                        color: 'var(--text)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                    }}
                >
                    {t('ui.nextPage')}
                    <ChevronRight size={16} />
                </Link>
            )}

            <div style={{ marginLeft: '16px', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                {t('ui.pageOf', { current: currentPage, total: totalPages })}
            </div>
        </div>
    );
}
