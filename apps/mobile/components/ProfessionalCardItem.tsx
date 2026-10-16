import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ProfessionalCard } from '@dastiyor/types';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar } from '@/components/Avatar';
import { TierBadge } from '@/components/TierBadge';

export function ProfessionalCardItem({ pro, labels, tr }: {
  pro: ProfessionalCard;
  labels: { reviews: string; completed: string; tiers: Record<'basic' | 'standard' | 'premium', string> };
  tr: (v: string) => string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: '/provider/[id]', params: { id: pro.id, name: pro.fullName } })}
      accessibilityRole="button"
    >
      <Avatar name={pro.fullName} avatarUrl={pro.avatar} size={52} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{pro.fullName}</Text>
          {pro.isVerified && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
        </View>
        <View style={styles.row}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={styles.rating}>{pro.avgRating != null ? pro.avgRating.toFixed(1) : '—'}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{`${pro.reviewCount} ${labels.reviews} · ${pro.completedCount} ${labels.completed}`}</Text>
        </View>
        {pro.city && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{tr(pro.city)}</Text>
          </View>
        )}
        {pro.categories.length > 0 && (
          <View style={styles.chips}>
            {pro.categories.slice(0, 3).map((c) => (
              <View key={c} style={[styles.chip, { backgroundColor: colors.iconBg }]}>
                <Text style={[styles.chipText, { color: colors.accent }]}>{tr(c)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.side}>
        <TierBadge tier={pro.tier} label={pro.tier ? labels.tiers[pro.tier] : ''} />
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  body: { flex: 1, gap: 4, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  rating: { fontSize: 13, fontWeight: '700', color: '#B45309' },
  meta: { fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 11, fontWeight: '600' },
  side: { alignItems: 'flex-end', justifyContent: 'space-between' },
});
