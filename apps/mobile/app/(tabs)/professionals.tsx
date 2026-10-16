import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ProfessionalSort } from '@dastiyor/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfig } from '@/lib/useConfig';
import { useProfessionals, type ProfessionalFilters } from '@/lib/useProfessionals';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProfessionalCardItem } from '@/components/ProfessionalCardItem';

const SORTS: ProfessionalSort[] = ['rating', 'reviews', 'completed', 'newest'];

export default function ProfessionalsScreen() {
  const { t, tr } = useLanguage();
  const { colors } = useTheme();
  const { config } = useConfig();
  const insets = useSafeAreaInsets();
  const pr = t.professionals;
  const [filters, setFilters] = useState<ProfessionalFilters>({ q: '', category: '', city: '', sort: 'rating' });
  const { items, total, loading, loadingMore, error, loadMore, refresh } = useProfessionals(filters);
  const [refreshing, setRefreshing] = useState(false);

  const rows = useMemo(() => [
    { key: 'category' as const, options: [{ value: '', label: t.categories.all }, ...config.categories.map((c) => ({ value: c, label: tr(c) }))] },
    { key: 'city' as const, options: [{ value: '', label: pr.allCities }, ...config.cities.map((c) => ({ value: c, label: tr(c) }))] },
    { key: 'sort' as const, options: SORTS.map((s) => ({ value: s, label: pr.sorts[s] })) },
  ], [config, tr, t.categories.all, pr]);

  const labels = { reviews: pr.reviews, completed: pr.completed, tiers: t.provider.tiers };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={pr.title} />
      <View style={[styles.searchWrap, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={pr.searchPh}
            placeholderTextColor={colors.textTertiary}
            value={filters.q}
            onChangeText={(q) => setFilters((f) => ({ ...f, q }))}
            returnKeyType="search"
            maxLength={100}
          />
          {filters.q.length > 0 && (
            <TouchableOpacity onPress={() => setFilters((f) => ({ ...f, q: '' }))} accessibilityRole="button" accessibilityLabel={t.common.cancel}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.chipRows, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {rows.map((row) => (
          <ScrollView key={row.key} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {row.options.map((o) => {
              const active = filters[row.key] === o.value;
              return (
                <TouchableOpacity
                  key={o.value || '__all__'}
                  style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, active && styles.chipActive]}
                  onPress={() => setFilters((f) => ({ ...f, [row.key]: o.value }))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ))}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProfessionalCardItem pro={item} labels={labels} tr={tr} />}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={items.length > 0 ? <Text style={[styles.found, { color: colors.textSecondary }]}>{`${pr.found}: ${total}`}</Text> : null}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor="#2563EB"
            onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={error ?? pr.empty}
              subtitle={error ? undefined : pr.emptyHint}
              actionLabel={error ? t.common.errorRetry : undefined}
              onAction={error ? refresh : undefined}
            />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#2563EB" style={{ margin: 16 }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 15 },
  chipRows: { borderBottomWidth: 1, paddingBottom: 8 },
  chipRow: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 13, fontWeight: '600' },
  found: { fontSize: 12, marginHorizontal: 16, marginBottom: 8 },
});
