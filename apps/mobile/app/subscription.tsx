import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubscriptionPlans } from '@/components/SubscriptionPlans';
import { PromotionCard } from '@/components/PromotionCard';
import { initPurchases } from '@/lib/purchases';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function SubscriptionScreen() {
  const { t, tr, locale } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = t.subscription;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
      {/* Paid plans only; renders nothing on FREE */}
      <PromotionCard labels={{ ...t.promotions, error: t.common.error }} tr={tr} />
      <SubscriptionPlans
        storeReady={initPurchases()}
        locale={locale}
        labels={{
          features: s.features, free: s.free, usage: s.usage, usageUnlimited: s.usageUnlimited, rules: s.rules, buy: s.buy, current: s.current, until: s.until, restore: s.restore,
          manage: s.manage, success: s.success, unavailable: s.unavailable, terms: s.terms, privacy: s.privacy,
          error: t.common.error, ok: t.common.ok,
        }}
      />
    </ScrollView>
  );
}
