import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { SubscriptionTier } from '@dastiyor/types';
import { Text } from '@/components/AppText';
import { api } from '@/lib/api-client';
import { useTheme } from '@/contexts/ThemeContext';

const PLAN_NAMES: Record<SubscriptionTier, string> = { pro: 'PRO', pro_plus: 'PRO+', business: 'BUSINESS' };

interface CurrentSubscription { plan: string; isCurrentlyActive: boolean; endDate: string }

/**
 * The provider's active plan, read-only, for where the plans screen is not
 * reachable (Android, which cannot sell): a plan bought on the iPhone or the
 * website still shows here. Renders nothing on FREE.
 *
 * Deliberately no price, button or link: Google Play (and Apple) forbid
 * pointing users to a payment outside the store from inside the app.
 */
export function CurrentPlanCard({ labels: l }: { labels: { current: string; until: string } }) {
  const { colors } = useTheme();
  const [plan, setPlan] = useState<CurrentSubscription | null>(null);

  useEffect(() => {
    api.get<{ subscription: CurrentSubscription | null }>('/api/subscription')
      .then((r) => setPlan(r?.subscription?.isCurrentlyActive ? r.subscription : null))
      .catch(() => {});
  }, []);

  if (!plan) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {`${l.current}: ${PLAN_NAMES[plan.plan as SubscriptionTier] ?? plan.plan}`}
      </Text>
      <Text style={{ color: colors.textSecondary }}>{`${l.until} ${new Date(plan.endDate).toLocaleDateString()}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 4, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
});
