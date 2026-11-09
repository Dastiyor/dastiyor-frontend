import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import type { SubscriptionTier } from '@dastiyor/types';

/** Badge text and colors per plan; the text is the same in every language. */
const BADGES: Record<SubscriptionTier, { text: string; bg: string; fg: string }> = {
  business: { text: 'TOP', bg: '#B45309', fg: '#FFFFFF' },
  pro_plus: { text: 'PRO+', bg: '#7C3AED', fg: '#FFFFFF' },
  pro: { text: 'PRO', bg: '#2563EB', fg: '#FFFFFF' },
};

/** PRO, PRO+ or TOP. Renders nothing for FREE (tier is null while subscriptions are off) or an unknown tier. */
export function TierBadge({ tier }: { tier: SubscriptionTier | null }) {
  const badge = tier ? BADGES[tier] : undefined;
  if (!badge) return null;
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Icon name="ribbon" size={12} color={badge.fg} />
      <Text style={[styles.text, { color: badge.fg }]}>{badge.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'center' },
  text: { fontSize: 12, fontWeight: '700' },
});
