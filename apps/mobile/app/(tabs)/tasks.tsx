import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { timeAgo } from '@/lib/timeAgo';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TaskCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import { FilterSheet, DEFAULT_FILTERS, hasActiveFilters } from '@/components/FilterSheet';
import type { FilterState } from '@/components/FilterSheet';
import type { FeedTask } from '@dastiyor/types';
import { useConfig } from '@/lib/useConfig';
import { CATEGORY_ICONS } from '@/lib/categoryIcons';

const URGENCY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  normal: '#F59E0B',
  low: '#10B981',
};

interface TasksResponse {
  tasks: FeedTask[];
  pagination: { hasMore: boolean; page: number };
}

export default function TaskBrowseScreen() {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const { config } = useConfig();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{
    category?: string; query?: string; urgency?: string;
    city?: string; minBudget?: string; maxBudget?: string; sort?: string;
  }>();
  const [tasks, setTasks] = useState<FeedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [query, setQuery] = useState(params.query ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(params.query ?? '');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    category: params.category ?? '',
    urgency: params.urgency ?? '',
    city: params.city ?? '',
    minBudget: params.minBudget ?? '',
    maxBudget: params.maxBudget ?? '',
    sort: params.sort ?? 'newest',
  });
  const page = useRef(1);
  // Monotonic token: each reset (filter/search change, refresh) bumps it so a
  // load-more or stale reset still in flight is ignored when it resolves.
  const loadToken = useRef(0);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      category: params.category ?? prev.category,
      urgency: params.urgency ?? prev.urgency,
      city: params.city ?? prev.city,
      minBudget: params.minBudget ?? prev.minBudget,
      maxBudget: params.maxBudget ?? prev.maxBudget,
      sort: params.sort ?? prev.sort,
    }));
    if (params.query !== undefined) { setQuery(params.query); setDebouncedQuery(params.query); }
  }, [params.category, params.urgency, params.city, params.minBudget, params.maxBudget, params.sort, params.query]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(id);
  }, [query]);

  async function fetchTasks(reset = false) {
    const token = reset ? ++loadToken.current : loadToken.current;
    const p = reset ? 1 : page.current;
    const ps = new URLSearchParams({ page: String(p), limit: '20' });
    if (filters.category) ps.set('category', filters.category);
    if (debouncedQuery.trim()) ps.set('query', debouncedQuery.trim());
    if (filters.urgency) ps.set('urgency', filters.urgency);
    if (filters.city) ps.set('city', filters.city);
    if (filters.minBudget) ps.set('minBudget', filters.minBudget);
    if (filters.maxBudget) ps.set('maxBudget', filters.maxBudget);
    if (filters.sort && filters.sort !== 'newest') ps.set('sort', filters.sort);
    const res = await api.get<TasksResponse>(`/api/tasks?${ps}`);
    // A newer reset superseded this request — drop its result to avoid
    // appending stale pages or clobbering fresh filter results.
    if (token !== loadToken.current) return;
    if (reset) {
      setTasks(res.tasks);
      page.current = 2;
    } else {
      setTasks((prev) => [...prev, ...res.tasks]);
      page.current = p + 1;
    }
    setHasMore(res.pagination.hasMore);
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTasks(true).catch(() => toast.show(t.task.loadMoreError, 'error')).finally(() => setLoading(false));
    }, [filters, debouncedQuery])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchTasks(true).catch(() => toast.show(t.task.loadMoreError, 'error'));
    setRefreshing(false);
  }

  async function onLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchTasks(false).catch(() => toast.show(t.task.loadMoreError, 'error'));
    setLoadingMore(false);
  }

  const renderTask = useCallback(({ item }: { item: FeedTask }) => {
    const urgencyColor = URGENCY_COLORS[item.urgency] ?? '#6B7280';
    const urgencyLabel = t.urgency[item.urgency as keyof typeof t.urgency] ?? item.urgency;
    const iconName = CATEGORY_ICONS[item.category] ?? 'briefcase-outline';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => router.push(`/task/${item.id}`)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.category}, ${item.budget}`}
      >
        <View style={[styles.cardIconBox, { backgroundColor: colors.iconBg }]}>
          <Ionicons name={iconName} size={22} color="#2563EB" />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardCategory, { color: colors.textTertiary }]} numberOfLines={1}>{item.category}</Text>
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '22' }]}>
              <Text style={[styles.urgencyText, { color: urgencyColor }]}>{urgencyLabel}</Text>
            </View>
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>{item.description}</Text>
          {item.city ? (
            <View style={styles.cardLocation}>
              <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
              <Text style={[styles.cardLocationText, { color: colors.textTertiary }]}>{item.city}</Text>
            </View>
          ) : null}
          <View style={styles.cardFooter}>
            <Text style={styles.cardBudget}>{item.budget}</Text>
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{timeAgo(item.postedAt, locale)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [t, locale, colors]);

  const categories = useMemo(() => [
    { name: t.categories.all, value: '' },
    ...config.categories.map((c) => ({ name: c, value: c })),
  ], [t.categories.all, config.categories]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t.tabs.tasks} />
      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t.home.search}
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}
            >
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            style={styles.filterBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t.tabs.tasks}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={hasActiveFilters(filters) ? colors.accent : colors.textSecondary}
            />
            {hasActiveFilters(filters) && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Category chips */}
      <View style={[styles.catScroll, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catContent}
        >
          {categories.map((cat) => {
            const isActive = filters.category === cat.value;
            return (
              <TouchableOpacity
                key={cat.value === '' ? '__all__' : cat.value}
                style={[styles.catChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, isActive && styles.catChipActive]}
                onPress={() => setFilters((prev) => ({ ...prev, category: cat.value }))}
                accessibilityRole="button"
                accessibilityLabel={cat.name}
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.catChipText, { color: isActive ? '#fff' : colors.text }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FilterSheet
        visible={filterVisible}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterVisible(false)}
        categories={config.categories}
        onApply={(f) => {
          setFilters(f);
          setFilterVisible(false);
        }}
      />

      {loading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4, 5].map((i) => <TaskCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-outline"
              title={t.home.empty}
              subtitle={t.task.noTasksFilterHint}
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

  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 15, marginHorizontal: 8, padding: 0 },
  filterBtn: { marginLeft: 6, position: 'relative' },
  filterDot: {
    position: 'absolute', top: -2, right: -2,
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#2563EB',
  },

  catScroll: {
    height: 54,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  catContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  catChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  catChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },

  list: { padding: 16, paddingBottom: 24 },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
    marginRight: 6,
  },
  urgencyBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  urgencyText: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardDesc: { fontSize: 13, marginBottom: 6 },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  cardLocationText: { fontSize: 11 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBudget: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  cardMeta: { fontSize: 11 },

  center: { flex: 1, marginTop: 60 },
  skeletonList: { paddingTop: 12 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 15 },
});
