import { Award } from 'lucide-react';
import type { SubscriptionTier } from '@dastiyor/types';

const COLORS: Record<SubscriptionTier, { bg: string; fg: string }> = {
    premium: { bg: '#7C3AED', fg: '#FFFFFF' },
    standard: { bg: '#2563EB', fg: '#FFFFFF' },
    basic: { bg: '#E0E7FF', fg: '#3730A3' },
};

/** Paid-plan badge. Renders nothing for free accounts (and while subscriptions are off, tier is null). */
export default function TierBadge({ tier, label, size = 'md' }: { tier: SubscriptionTier | null; label: string; size?: 'sm' | 'md' }) {
    if (!tier) return null;
    const { bg, fg } = COLORS[tier];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: bg, color: fg, borderRadius: 999,
            padding: size === 'sm' ? '2px 8px' : '4px 12px', fontSize: size === 'sm' ? '0.75rem' : '0.85rem', fontWeight: 600,
            whiteSpace: 'nowrap',
        }}>
            <Award size={size === 'sm' ? 12 : 14} aria-hidden />
            {label}
        </span>
    );
}
