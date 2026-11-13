import { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/AppText';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import type { SubscriptionTier } from '@dastiyor/types';
import { api } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { isUserCancel } from '@/lib/purchases';
import { formatDate } from '@/lib/intl';
import type { Locale } from '@/lib/i18n';
import { openPrivacyPolicy, openTermsOfService } from '@/lib/legal';
import { useTheme } from '@/contexts/ThemeContext';
import { GradientButton } from '@/components/Premium';

const ORDER: SubscriptionTier[] = ['pro', 'pro_plus', 'business'];
/** Plan names are the same in every language. */
export const PLAN_NAMES: Record<SubscriptionTier, string> = { pro: 'PRO', pro_plus: 'PRO+', business: 'BUSINESS' };

interface CurrentSubscription { plan: string; isCurrentlyActive: boolean; endDate: string; source: 'web' | 'store' }
/** Responses this month; limit null = unlimited. */
interface Usage { used: number; limit: number | null }

export interface SubscriptionLabels {
  features: Record<'free' | SubscriptionTier, readonly string[]>;
  free: string; usage: string; usageUnlimited: string; rules: readonly string[];
  buy: string; current: string; until: string; restore: string; manage: string; success: string;
  unavailable: string; terms: string; privacy: string; error: string; ok: string;
}

/**
 * Store product ids follow dastiyor_<plan>_<period> (dastiyor_pro_plus_monthly);
 * the plan is everything between the prefix and the last underscore.
 */
export function planOf(p: PurchasesPackage): SubscriptionTier | undefined {
  const plan = /^dastiyor_(.+)_[^_]+$/.exec(p.product.identifier)?.[1];
  return ORDER.find((tier) => tier === plan);
}

const nameOf = (plan: string) => PLAN_NAMES[plan as SubscriptionTier] ?? plan;

/** Plans from the App Store / Google Play (prices from the store), purchase, restore and manage. */
export function SubscriptionPlans({ labels: l, storeReady, locale = 'ru' }: { labels: SubscriptionLabels; storeReady: boolean; locale?: Locale }) {
  const { colors } = useTheme();
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [packages, setPackages] = useState<{ plan: SubscriptionTier; pkg: PurchasesPackage }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ subscription: CurrentSubscription | null; usage?: Usage }>('/api/subscription')
        .then((r) => { setCurrent(r.subscription); setUsage(r.usage ?? null); }).catch(() => {}),
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
      Alert.alert(l.success, sub ? nameOf(sub.plan) : '');
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
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{`${l.current}: ${active ? nameOf(active.plan) : l.free}`}</Text>
        {active && <Text style={{ color: colors.textSecondary }}>{`${l.until} ${formatDate(active.endDate, locale)}`}</Text>}
        {usage && (
          <Text style={{ color: colors.text, fontWeight: '600' }}>
            {(usage.limit === null ? l.usageUnlimited : l.usage).replace('{used}', String(usage.used)).replace('{limit}', String(usage.limit))}
          </Text>
        )}
        {active?.source === 'store' && (
          <TouchableOpacity onPress={() => Purchases.showManageSubscriptions()} accessibilityRole="button">
            <Text style={styles.link}>{l.manage}</Text>
          </TouchableOpacity>
        )}
        {!active && l.features.free.map((f) => <Text key={f} style={{ color: colors.textSecondary }}>{`• ${f}`}</Text>)}
      </View>

      {!storeReady ? (
        // No store on this platform (Android): what each plan includes, and nothing else.
        // No price, button, link or word on where to buy -- Google Play forbids pointing
        // to a payment outside the store from inside the app.
        ORDER.map((plan) => (
          <View key={plan} style={[styles.card, { backgroundColor: colors.surface, borderColor: active?.plan === plan ? '#2563EB' : colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{PLAN_NAMES[plan]}</Text>
            {l.features[plan].map((f) => <Text key={f} style={{ color: colors.textSecondary }}>{`• ${f}`}</Text>)}
          </View>
        ))
      ) : packages.length === 0 ? (
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 24 }}>{l.unavailable}</Text>
      ) : packages.map(({ plan, pkg }) => (
        <View key={pkg.identifier} style={[styles.card, { backgroundColor: colors.surface, borderColor: active?.plan === plan ? '#2563EB' : colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.title, { color: colors.text }]}>{PLAN_NAMES[plan]}</Text>
            <Text style={[styles.price, { color: colors.text }]}>{pkg.product.priceString}</Text>
          </View>
          {l.features[plan].map((f) => <Text key={f} style={{ color: colors.textSecondary }}>{`• ${f}`}</Text>)}
          <GradientButton style={[styles.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => buy(pkg)} accessibilityRole="button">
            <Text style={styles.btnText}>{l.buy}</Text>
          </GradientButton>
        </View>
      ))}

      {storeReady && <View style={{ gap: 4 }}>
        {l.rules.map((r) => <Text key={r} style={[styles.note, { color: colors.textSecondary }]}>{`• ${r}`}</Text>)}
      </View>}

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
  note: { fontSize: 12, lineHeight: 17 },
});
