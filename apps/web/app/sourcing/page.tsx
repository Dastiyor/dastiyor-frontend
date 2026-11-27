import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { verifyJWTWithVersion } from '@/lib/auth';
import { getCategories } from '@/lib/categories';
import { CITIES } from '@/lib/config-fallback';
import { getServerTranslation } from '@/lib/i18n/server';
import SourcingForm from './SourcingForm';

export const metadata: Metadata = { alternates: { canonical: '/sourcing' } };

export default async function SourcingPage() {
    const token = (await cookies()).get('token')?.value;
    const payload = token ? await verifyJWTWithVersion(token) : null;

    const [{ t }, categories] = await Promise.all([getServerTranslation(), getCategories()]);

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '900px' }}>
                <h1 className="heading-lg" style={{ marginBottom: '8px' }}>{t('sourcing.title')}</h1>
                <p style={{ color: 'var(--text-light)', marginBottom: '24px', maxWidth: '65ch' }}>{t('sourcing.subtitle')}</p>
                {/* The offer is public; sending a request needs an account to answer to. */}
                {payload ? (
                    <SourcingForm categories={categories} cities={CITIES} />
                ) : (
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '32px' }}>
                        <ol style={{ margin: '0 0 24px', paddingLeft: '20px', lineHeight: 1.9 }}>
                            <li>{t('sourcing.step1')}</li>
                            <li>{t('sourcing.step2')}</li>
                            <li>{t('sourcing.step3')}</li>
                        </ol>
                        <Link href="/login?redirect=/sourcing" className="btn btn-primary">{t('sourcing.signIn')}</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
