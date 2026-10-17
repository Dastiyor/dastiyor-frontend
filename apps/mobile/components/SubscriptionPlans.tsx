import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import type { SubscriptionTier } from '@dastiyor/types';
import { api } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { isUserCancel } from '@/lib/purchases';
import { openPrivacyPolicy, openTermsOfService } from '@/lib/legal';
import { useTheme } from '@/contexts/ThemeContext';

const ORDER: SubscriptionTier[] = ['basic', 'standard', 'premium'];

interface CurrentSubscription { plan: string; isCurrentlyActive: boolean; endDate: string; source: 'web' | 'store' }

export interface SubscriptionLabels {
  tiers: Record<SubscriptionTier, string>;
  features: Record<SubscriptionTier, readonly string[]>;
  buy: string; current: string; until: string; restore: string; manage: string; success: string;
  unavailable: string; terms: string; privacy: string; error: string; ok: string;
}

/** Store product ids follow dastiyor_<plan>_<period>; the plan is read from there. */
const planOf = (p: PurchasesPackage) => ORDER.find((tier) => p.product.identifier.startsWith(`dastiyor_${tier}_`));

/** Plans from the App Store / Google Play (prices from the store), purchase, restore and manage. */
export function SubscriptionPlans({ labels: l, storeReady }: { labels: SubscriptionLabels; storeReady: boolean }) {
  const { colors } = useTheme();
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [packages, setPackages] = useState<{ plan: SubscriptionTier; pkg: PurchasesPackage }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ subscription: CurrentSubscription | null }>('/api/subscription').then((r) => setCurrent(r.subscription)).catch(() => {}),
      storeReady
        ? Purchases.getOfferings().then((o) => {
            const list = (o.current?.availablePackages ?? [])
              .map((pkg) => ({ plan: planOf(pkg), pkg }))
              .filter((x): x is { plan: SubscriptionTier; pkg: PurchasesPackage } => !!x.plan)
              .sort((a, b) => ORDER.indexOf(a.plan) - ORDER.indexOf(b.plan));
            setPackages(list);
          }).catch(() => {})
        : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [storeReady]);

  async function sync() {
    const res = await api.post<{ subscription: CurrentSubscription | null }>('/api/subscription/sync');
    setCurrent(res.subscription);
    return res.subscription;
  }

  async function buy(pkg: PurchasesPackage) {
    setBusy(true);
    try {
      await Purchases.purchasePackage(pkg);
      const sub = await sync();
      Alert.alert(l.success, sub ? `${l.tiers[sub.plan as SubscriptionTier] ?? sub.plan}` : '');
    } catch (e) {
      if (!isUserCancel(e)) Alert.alert(l.error, (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    try {
      await Purchases.restorePurchases();
      await sync();
    } catch (e) {
      Alert.alert(l.error, (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ActivityIndicator color="#2563EB" style={{ marginTop: 32 }} />;

  const active = current?.isCurrentlyActive ? current : null;

  return (
    <View style={{ gap: 12 }}>
      {active && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{`${l.current}: ${l.tiers[active.plan as SubscriptionTier] ?? active.plan}`}</Text>
          <Text style={{ color: colors.textSecondary }}>{`${l.until} ${new Date(active.endDate).toLocaleDateString()}`}</Text>
          {active.source === 'store' && (
            <TouchableOpacity onPress={() => Purchases.showManageSubscriptions()} accessibilityRole="button">
              <Text style={styles.link}>{l.manage}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {packages.length === 0 ? (
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 24 }}>{l.unavailable}</Text>
      ) : packages.map(({ plan, pkg }) => (
        <View key={pkg.identifier} style={[styles.card, { backgroundColor: colors.surface, borderColor: active?.plan === plan ? '#2563EB' : colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.title, { color: colors.text }]}>{l.tiers[plan]}</Text>
            <Text style={[styles.price, { color: colors.text }]}>{pkg.product.priceString}</Text>
          </View>
          {l.features[plan].map((f) => <Text key={f} style={{ color: colors.textSecondary }}>{`• ${f}`}</Text>)}
          <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => buy(pkg)} accessibilityRole="button">
            <Text style={styles.btnText}>{l.buy}</Text>
          </TouchableOpacity>
        </View>
      ))}

      {storeReady && (
        <TouchableOpacity onPress={restore} disabled={busy} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={styles.link}>{l.restore}</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.row, { justifyContent: 'center', gap: 16 }]}>
        <TouchableOpacity onPress={openTermsOfService} accessibilityRole="link"><Text style={styles.small}>{l.terms}</Text></TouchableOpacity>
        <TouchableOpacity onPress={openPrivacyPolicy} accessibilityRole="link"><Text style={styles.small}>{l.privacy}</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700' },
  price: { fontSize: 18, fontWeight: '800' },
  btn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  link: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  small: { color: '#6B7280', fontSize: 12, textDecorationLine: 'underline' },
});
