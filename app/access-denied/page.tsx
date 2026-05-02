'use client';

import Link from 'next/link';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function AccessDeniedPage() {
    const { t } = useTranslation();
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '500px'
            }}>
                <div style={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: '#FEE2E2',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 32px',
                    border: '4px solid #FECACA'
                }}>
                    <ShieldX size={56} color="#DC2626" />
                </div>

                <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    marginBottom: '16px',
                    color: '#991B1B'
                }}>
                    {t('systemPages.accessDeniedTitle')}
                </h1>

                <p style={{
                    color: '#B91C1C',
                    fontSize: '1.1rem',
                    marginBottom: '32px',
                    lineHeight: '1.6'
                }}>
                    {t('systemPages.accessDeniedText')}
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: '#DC2626',
                            color: 'white',
                            padding: '14px 28px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            textDecoration: 'none',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        <Home size={18} />
                        {t('common.goHome')}
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: 'white',
                            color: '#DC2626',
                            padding: '14px 28px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            border: '2px solid #DC2626',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ArrowLeft size={18} />
                        {t('common.back')}
                    </button>
                </div>

                <div style={{
                    marginTop: '48px',
                    padding: '24px',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #FECACA'
                }}>
                    <p style={{ fontWeight: '600', marginBottom: '12px', color: '#991B1B' }}>
                        {t('systemPages.possibleReasons')}
                    </p>
                    <ul style={{
                        textAlign: 'left',
                        color: '#B91C1C',
                        listStyle: 'none',
                        padding: 0,
                        margin: 0
                    }}>
                        <li style={{ padding: '8px 0', borderBottom: '1px solid #FEE2E2' }}>
                            🔐 {t('systemPages.notAuthorized')}
                        </li>
                        <li style={{ padding: '8px 0', borderBottom: '1px solid #FEE2E2' }}>
                            👤 {t('systemPages.insufficientRights')}
                        </li>
                        <li style={{ padding: '8px 0' }}>
                            ⏰ {t('systemPages.sessionExpired')}
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
