import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PortfolioManager from '@/components/provider/PortfolioManager';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function ProviderPortfolioPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        redirect('/login');
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
        redirect('/login');
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id as string }
    });

    if (!user || user.role !== 'PROVIDER') {
        redirect('/access-denied');
    }

    const { t } = await getServerTranslation();

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '900px' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 className="heading-lg">{t('provider.portfolio')}</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>
                        {t('provider.portfolioDesc')}
                    </p>
                </div>
                <PortfolioManager />
            </div>
        </div>
    );
}
