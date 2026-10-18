import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import type { SubscriptionTier } from '@dastiyor/types';

const COLORS: Record<SubscriptionTier, { bg: string; fg: string }> = {
  premium: { bg: '#7C3AED', fg: '#FFFFFF' },
  standard: { bg: '#2563EB', fg: '#FFFFFF' },
  basic: { bg: '#E0E7FF', fg: '#3730A3' },
};

/** Paid-plan badge. Renders nothing for free accounts (tier is null while subscriptions are off). */
export function TierBadge({ tier, label }: { tier: SubscriptionTier | null; label: string }) {
  if (!tier) return null;
  const { bg, fg } = COLORS[tier];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Icon name="ribbon" size={12} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'center' },
  text: { fontSize: 12, fontWeight: '700' },
});
