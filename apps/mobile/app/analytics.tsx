import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProviderAnalytics } from '@dastiyor/types';
import { Text } from '@/components/AppText';
import { GradientButton } from '@/components/Premium';
import { ProviderAnalyticsView } from '@/components/ProviderAnalyticsView';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api-client';
import { useConfig } from '@/lib/useConfig';
import { storeKey } from '@/lib/purchases';

/** Provider analytics: GET /api/provider/analytics, sections gated by plan on the server. */
export default function AnalyticsScreen() {
  const { t, tr } = useLanguage();
  const { colors } = useTheme();
  const { config } = useConfig();
  const insets = useSafeAreaInsets();
  const l = t.analytics;
  const [data, setData] = useState<ProviderAnalytics | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setData(await api.get<ProviderAnalytics>('/api/provider/analytics'));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Same condition as the Subscription row in Profile: only where this platform's store can sell.
  const canBuy = config.subscriptionsEnabled && config.mobilePurchaseEnabled && !!storeKey();

  if (!data && !error) return <ActivityIndicator style={styles.center} size="large" color={colors.accent} />;

  if (!data) return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <Text style={{ color: colors.textSecondary }}>{l.loadError}</Text>
      <GradientButton style={styles.retry} onPress={load}>
        <Text style={styles.retryText}>{t.common.errorRetry}</Text>
      </GradientButton>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent}
        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <ProviderAnalyticsView data={data} labels={l} tr={tr} canBuy={canBuy} onOpenPlans={() => router.push('/subscription')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  retry: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
});
