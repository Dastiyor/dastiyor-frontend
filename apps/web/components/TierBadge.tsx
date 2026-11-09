import { Award } from 'lucide-react';
import type { SubscriptionTier } from '@dastiyor/types';
import { PLANS } from '@/lib/plans';

const COLORS: Record<SubscriptionTier, { bg: string; fg: string }> = {
    business: { bg: '#B45309', fg: '#FFFFFF' },
    pro_plus: { bg: '#7C3AED', fg: '#FFFFFF' },
    pro: { bg: '#2563EB', fg: '#FFFFFF' },
};

/** PRO, PRO+ or TOP. Renders nothing for FREE (and while subscriptions are off, tier is null). */
export default function TierBadge({ tier, size = 'md' }: { tier: SubscriptionTier | null; size?: 'sm' | 'md' }) {
    if (!tier || !COLORS[tier]) return null;
    const { bg, fg } = COLORS[tier];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: bg, color: fg, borderRadius: 999,
            padding: size === 'sm' ? '2px 8px' : '4px 12px', fontSize: size === 'sm' ? '0.75rem' : '0.85rem', fontWeight: 700,
            whiteSpace: 'nowrap',
        }}>
            <Award size={size === 'sm' ? 12 : 14} aria-hidden />
            {PLANS[tier].badge}
        </span>
    );
}

/**
 * Directory card highlight: PRO+ is highlighted in the provider directory,
 * BUSINESS gets the stronger highlight in search results.
 */
export function tierCardStyle(tier: SubscriptionTier | null): React.CSSProperties | undefined {
    if (tier === 'business') return { border: '2px solid #F59E0B', backgroundColor: '#FFFBEB' };
    if (tier === 'pro_plus') return { border: '2px solid #A78BFA' };
    return undefined;
}
