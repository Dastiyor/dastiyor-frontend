import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';
import { getServerTranslation } from '@/lib/i18n/server';
import SubscriptionPlans from '@/components/subscription/SubscriptionPlans';
import CurrentPlan from '@/components/subscription/CurrentPlan';
import { activePlan, getResponseAllowance } from '@/lib/response-allowance';
import PromotionCard from '@/components/provider/PromotionCard';
import { getPromotionStatus, pinnableCategories } from '@/lib/promotions';

/** The provider dashboard's plan page: current plan, this month's responses, and the plans to switch to. */
export default async function SubscriptionPage() {
    // Subscriptions are temporarily hidden — see lib/features.ts
    if (!SUBSCRIPTIONS_ENABLED) redirect('/provider');

    const { t } = await getServerTranslation();

    // The provider layout has already checked the session and its tokenVersion.
    const token = (await cookies()).get('token')?.value;
    const payload = token ? await verifyJWT(token) : null;
    if (!payload?.id) redirect('/login');

    const user = await prisma.user.findUnique({
        where: { id: payload.id as string },
        include: { subscription: true },
    });
    if (!user || user.role !== 'PROVIDER') redirect('/access-denied');

    const [usage, promotions] = await Promise.all([
        getResponseAllowance(user.id),
        pinnableCategories(user.categories).then(categories => getPromotionStatus(user.id, { categories })),
    ]);
    const plan = activePlan(user.subscription);

    return (
        <>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                    {t('provider.subscriptionPageTitle')}
                </h1>
                <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                    {t('provider.subscriptionPageDesc')}
                </p>
            </div>

            <CurrentPlan plan={plan} endDate={user.subscription?.endDate ?? null} usage={usage} />

            {promotions.plan && <PromotionCard initial={promotions} />}

            <SubscriptionPlans currentPlan={plan} />
        </>
    );
}
