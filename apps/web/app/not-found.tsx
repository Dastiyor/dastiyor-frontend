import Link from 'next/link';
import { getServerTranslation } from '@/lib/i18n/server';

export async function generateMetadata() {
    const { t } = await getServerTranslation();
    return {
        title: `${t('systemPages.notFoundTitle')} | Dastiyor`,
    };
}

export default async function NotFound() {
    const { t } = await getServerTranslation();
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)'
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '500px'
            }}>
                <div style={{
                    fontSize: '8rem',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '16px'
                }}>
                    404
                </div>

                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    marginBottom: '16px',
                    color: 'var(--text)'
                }}>
                    {t('systemPages.notFoundTitle')}
                </h1>

                <p style={{
                    color: 'var(--text-light)',
                    fontSize: '1.1rem',
                    marginBottom: '32px',
                    lineHeight: '1.6'
                }}>
                    {t('systemPages.notFoundText')}
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/" className="btn btn-primary">
                        {t('systemPages.goHome')}
                    </Link>
                    <Link href="/tasks" className="btn btn-outline">
                        {t('systemPages.browseTasks')}
                    </Link>
                </div>

                <div style={{
                    marginTop: '48px',
                    padding: '24px',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                }}>
                    <p style={{ fontWeight: '600', marginBottom: '12px' }}>{t('systemPages.lookingFor')}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Link href="/tasks" style={{ color: 'var(--primary)' }}>
                            📋 {t('systemPages.findTasks')}
                        </Link>
                        <Link href="/create-task" style={{ color: 'var(--primary)' }}>
                            ➕ {t('systemPages.postTask')}
                        </Link>
                        <Link href="/how-it-works" style={{ color: 'var(--primary)' }}>
                            ❓ {t('systemPages.howItWorks')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
