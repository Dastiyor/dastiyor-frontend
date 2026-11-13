import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { ProfessionalCardItem } from '@/components/ProfessionalCardItem';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRecommendedProviders } from '@/lib/useRecommendedProviders';

/**
 * "Рекомендуемые исполнители" on the customer's own OPEN task: the directory
 * cards, up to six. Renders nothing while loading, on error, or when empty.
 */
export function RecommendedProviders({ taskId, enabled, refreshKey }: { taskId: string; enabled: boolean; refreshKey?: number }) {
  const { t, tr } = useLanguage();
  const { colors } = useTheme();
  const providers = useRecommendedProviders(taskId, enabled, refreshKey);
  if (!enabled || providers.length === 0) return null;

  const labels = { reviews: t.professionals.reviews, completed: t.professionals.completed };
  return (
    <View style={[styles.section, { borderTopColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t.recommended.title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.recommended.subtitle}</Text>
      {/* The card carries the directory's 16px side margin; the task screen already pads by 20. */}
      <View style={styles.cards}>
        {providers.map((pro) => <ProfessionalCardItem key={pro.id} pro={pro} labels={labels} tr={tr} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, paddingTop: 20, marginTop: 20 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  cards: { marginHorizontal: -16 },
});
