import { prisma } from '@/lib/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SubscriptionPlans from '@/components/subscription/SubscriptionPlans';
import CurrentPlan from '@/components/subscription/CurrentPlan';
import { getServerTranslation } from '@/lib/i18n/server';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';
import { activePlan, getResponseAllowance } from '@/lib/response-allowance';

/** Provider plans. Public: signed-out visitors see the plans with a sign-in link. */
export default async function SubscriptionPage() {
    // Subscriptions are temporarily hidden — see lib/features.ts
    if (!SUBSCRIPTIONS_ENABLED) redirect('/');

    const token = (await cookies()).get('token')?.value;
    const payload = token ? await verifyJWTWithVersion(token) : null;
    const user = payload?.id
        ? await prisma.user.findUnique({ where: { id: payload.id as string }, include: { subscription: true } })
        : null;

    const { t } = await getServerTranslation();
    const plan = activePlan(user?.subscription ?? null);
    const usage = user?.role === 'PROVIDER' ? await getResponseAllowance(user.id) : null;

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '60px 0' }}>
            <div className="container" style={{ maxWidth: '1200px' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h1 className="heading-lg" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
                        {t('subscriptionPage.title')}
                    </h1>
                    <p style={{ color: 'var(--text-light)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                        {t('subscriptionPage.subtitle')}
                    </p>
                </div>

                {usage && <CurrentPlan plan={plan} endDate={user?.subscription?.endDate ?? null} usage={usage} />}

                <SubscriptionPlans currentPlan={plan} signedIn={!!user} />
            </div>
        </div>
    );
}
