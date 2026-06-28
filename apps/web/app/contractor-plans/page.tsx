import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getServerTranslation } from '@/lib/i18n/server';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';

export default async function ContractorPlansPage() {
    // Subscriptions are temporarily hidden — see lib/features.ts
    if (!SUBSCRIPTIONS_ENABLED) redirect('/');

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    let isPro = false;
    let isLoggedIn = false;

    if (token) {
        const payload = await verifyJWT(token);
        if (payload?.id) {
            isLoggedIn = true;
            const sub = await prisma.subscription.findFirst({
                where: { userId: payload.id as string, isActive: true }
            });
            if (sub) isPro = true;
        }
    }

    const { t } = await getServerTranslation();

    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '1000px', textAlign: 'center' }}>
            <h1 className="heading-lg">{t('contractorPlans.title')}</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-light)', marginBottom: '60px' }}>
                {t('contractorPlans.subtitle')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                {/* Basic Plan */}
                <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)' }}>
                    <h3 className="heading-md">{t('contractorPlans.basicPlanName')}</h3>
                    <div style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '24px' }}>{t('contractorPlans.free')}</div>
                    <ul style={{ textAlign: 'left', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li>✅ 5 откликов в месяц</li>
                        <li>✅ Базовый профиль</li>
                        <li>❌ Приоритетная поддержка</li>
                    </ul>
                    {isLoggedIn && !isPro ? (
                        <button className="btn btn-outline" style={{ width: '100%' }} disabled>{t('contractorPlans.currentPlan')}</button>
                    ) : isLoggedIn && isPro ? (
                        <button className="btn btn-outline" style={{ width: '100%', opacity: 0.5 }} disabled>{t('contractorPlans.basicPlanName')}</button>
                    ) : (
                        <Link href="/register?type=provider" className="btn btn-outline" style={{ width: '100%', display: 'block' }}>
                            {t('contractorPlans.register')}
                        </Link>
                    )}
                </div>

                {/* Pro Plan */}
                <div style={{ padding: '40px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '24px', transform: 'scale(1.05)' }}>
                    <h3 className="heading-md" style={{ color: 'white' }}>Pro</h3>
                    <div style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '24px' }}>349 <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>TJS</span><span style={{ fontSize: '1rem', fontWeight: 'normal' }}>{t('contractorPlans.perMonth')}</span></div>
                    <ul style={{ textAlign: 'left', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li>✅ Неограниченные отклики</li>
                        <li>✅ Значок верификации</li>
                        <li>✅ Приоритетная поддержка</li>
                    </ul>
                    {isLoggedIn && isPro ? (
                        <button className="btn" style={{ width: '100%', backgroundColor: 'white', color: 'var(--primary)' }} disabled>{t('contractorPlans.currentPlan')}</button>
                    ) : isLoggedIn ? (
                        <Link href="/provider/subscription" className="btn" style={{ width: '100%', backgroundColor: 'white', color: 'var(--primary)', display: 'block' }}>
                            {t('contractorPlans.upgradePlan')}
                        </Link>
                    ) : (
                        <Link href="/login?redirect=/contractor-plans" className="btn" style={{ width: '100%', backgroundColor: 'white', color: 'var(--primary)', display: 'block' }}>
                            {t('contractorPlans.loginToSubscribe')}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
