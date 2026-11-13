import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { getServerTranslation } from '@/lib/i18n/server';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';
import { activePlan } from '@/lib/response-allowance';
import { getProviderAnalytics } from '@/lib/provider-analytics';
import { PLANS } from '@/lib/plans';
import { AdvancedSection, LockedSection, ProfileSection, ResponsesSection } from './AnalyticsSections';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Plan-gated provider analytics. Same data as GET /api/provider/analytics, which the app reads. */
export default async function ProviderAnalyticsPage({ searchParams }: Props) {
    // The provider layout has already checked the session and its tokenVersion.
    const token = (await cookies()).get('token')?.value;
    const payload = token ? await verifyJWT(token) : null;
    if (!payload?.id) redirect('/login');

    const user = await prisma.user.findUnique({
        where: { id: payload.id as string },
        select: { id: true, role: true, categories: true, subscription: true },
    });
    if (!user || user.role !== 'PROVIDER') redirect('/access-denied');

    const [{ t, tr }, data, params] = await Promise.all([
        getServerTranslation(),
        getProviderAnalytics(user, activePlan(user.subscription)),
        searchParams,
    ]);
    const range = params.range === '7' ? 7 : 30;
    const [y, m, d] = data.viewsTrackedSince.split('-');

    return (
        <>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>{t('analytics.title')}</h1>
                <p style={{ color: '#64748B', fontSize: '0.9rem' }}>{t('analytics.subtitle')}</p>
                <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '10px' }}>
                    {t('analytics.yourPlan', { plan: data.plan === 'free' ? 'FREE' : PLANS[data.plan].name })} · {t('analytics.basicNote')}
                </p>
                <p style={{ color: '#92400E', backgroundColor: '#FEF3C7', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', marginTop: '12px' }}>
                    {t('analytics.trackedSince', { date: `${d}.${m}.${y}` })}
                </p>
            </div>

            {data.profile && <ProfileSection data={data.profile} range={range} t={t} />}
            {data.advanced && <AdvancedSection data={data.advanced} t={t} tr={tr} />}
            {data.responses && <ResponsesSection data={data.responses} t={t} tr={tr} />}
            {data.locked.map(l => (
                <LockedSection key={l.section} section={l.section} plan={l.plan} checkoutOnWeb={SUBSCRIPTIONS_ENABLED} t={t} />
            ))}
        </>
    );
}
