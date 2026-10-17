import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJWTWithVersion } from '@/lib/auth';
import { getCategories } from '@/lib/categories';
import { CITIES } from '@/lib/config-fallback';
import { getServerTranslation } from '@/lib/i18n/server';
import SourcingForm from './SourcingForm';

export default async function SourcingPage() {
    const token = (await cookies()).get('token')?.value;
    const payload = token ? await verifyJWTWithVersion(token) : null;
    if (!payload) redirect('/login?redirect=/sourcing');

    const [{ t }, categories] = await Promise.all([getServerTranslation(), getCategories()]);

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '900px' }}>
                <h1 className="heading-lg" style={{ marginBottom: '8px' }}>{t('sourcing.title')}</h1>
                <p style={{ color: 'var(--text-light)', marginBottom: '24px', maxWidth: '65ch' }}>{t('sourcing.subtitle')}</p>
                <SourcingForm categories={categories} cities={CITIES} />
            </div>
        </div>
    );
}
