import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubscriptionPlans } from '@/components/SubscriptionPlans';
import { initPurchases } from '@/lib/purchases';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function SubscriptionScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = t.subscription;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
      <SubscriptionPlans
        storeReady={initPurchases()}
        labels={{
          tiers: s.tiers, features: s.features, buy: s.buy, current: s.current, until: s.until, restore: s.restore,
          manage: s.manage, success: s.success, unavailable: s.unavailable, terms: s.terms, privacy: s.privacy,
          error: t.common.error, ok: t.common.ok,
        }}
      />
    </ScrollView>
  );
}
