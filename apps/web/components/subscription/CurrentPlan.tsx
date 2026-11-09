import { Crown } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';
import { PLANS, type PlanId } from '@/lib/plans';
import type { ResponseAllowance } from '@/lib/response-allowance';

/** The provider's plan (FREE or paid, with its end date) and this month's responses against the limit. */
export default async function CurrentPlan({ plan, endDate, usage }: { plan: PlanId | null; endDate: Date | null; usage: ResponseAllowance }) {
    const { t } = await getServerTranslation();
    const until = plan && endDate
        ? t('plans.until', { date: endDate.toLocaleDateString('ru-RU', { timeZone: 'Asia/Dushanbe' }) })
        : null;

    return (
        <div style={{
            backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)',
            marginBottom: '32px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
        }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Crown size={24} color="white" aria-hidden />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{t('plans.currentTitle')}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {plan ? PLANS[plan].name : 'FREE'}{until && <span style={{ fontWeight: 500, fontSize: '0.95rem', color: 'var(--text-light)' }}> · {until}</span>}
                </div>
            </div>
            <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {usage.limit === null
                    ? t('plans.usageUnlimited', { used: usage.used })
                    : t('plans.usage', { used: usage.used, limit: usage.limit })}
            </div>
        </div>
    );
}
