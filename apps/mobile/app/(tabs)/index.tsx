import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { timeAgo } from '@/lib/timeAgo';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FilterSheet, DEFAULT_FILTERS, hasActiveFilters } from '@/components/FilterSheet';
import { TaskCardSkeleton, FeaturedCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import type { FilterState } from '@/components/FilterSheet';
import type { FeedTask } from '@dastiyor/types';
import { useConfig } from '@/lib/useConfig';
import { useTheme } from '@/contexts/ThemeContext';
import { CATEGORY_ICONS } from '@/lib/categoryIcons';

const CARD_COLORS = ['#2563EB', '#1E293B', '#7C3AED', '#0F766E'];

const URGENCY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  normal: '#F59E0B',
  low: '#10B981',
};

interface TasksResponse {
  tasks: FeedTask[];
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const { config } = useConfig();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [tasks, setTasks] = useState<FeedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const welcomeText = firstName
    ? t.home.welcomeName.replace('{name}', firstName)
    : t.home.welcome;

  async function loadData() {
    const notifPromise: Promise<{ unreadCount: number }> = user
      ? api.get<{ unreadCount: number }>('/api/notifications')
      : Promise.resolve({ unreadCount: 0 });
    const [tasksRes, notifRes] = await Promise.allSettled([
      api.get<TasksResponse>('/api/tasks?page=1&limit=10'),
      notifPromise,
    ] as [Promise<TasksResponse>, Promise<{ unreadCount: number }>]);
    if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.tasks);
    if (notifRes.status === 'fulfilled') setUnreadCount(notifRes.value.unreadCount ?? 0);
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().catch(() => toast.show(t.home.loadError, 'error')).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData().catch(() => {});
    setRefreshing(false);
  }

  const featured = tasks.slice(0, 1);
  const popular = tasks.slice(1);
  const categories = [
    { name: t.categories.all, value: '' },
    ...config.categories.map((c) => ({ name: c, value: c })),
  ];


  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t.tabs.home} unreadCount={unreadCount} onNotificationsOpen={() => setUnreadCount(0)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>{welcomeText}</Text>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>{t.home.headline}</Text>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t.home.search}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                router.push({ pathname: '/(tabs)/tasks', params: { query: searchQuery.trim() } });
              }
            }}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setFilterVisible(true)}>
              <Ionicons
                name="options-outline"
                size={18}
                color={hasActiveFilters(filters) ? '#2563EB' : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <View style={styles.catOuter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catList}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value === '' ? '__all__' : cat.value}
                style={[styles.catChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/tasks',
                    params: { category: cat.value },
                  })
                }
              >
                <Text style={[styles.catChipText, { color: colors.text }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <>
            <View style={styles.sectionRow}>
              <View style={{ width: 140, height: 18, backgroundColor: colors.border, borderRadius: 8 }} />
            </View>
            <FeaturedCardSkeleton />
            <View style={[styles.sectionRow, { marginTop: 24 }]}>
              <View style={{ width: 160, height: 18, backgroundColor: colors.border, borderRadius: 8 }} />
            </View>
            {[1, 2, 3].map((i) => <TaskCardSkeleton key={i} />)}
          </>
        ) : (
          <>
            {/* Featured horizontal scroll */}
            {featured.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.home.featured}</Text>
                </View>

                {featured.map((task, i) => {
                  const iconName = CATEGORY_ICONS[task.category] ?? 'briefcase-outline';
                  const bgColor = CARD_COLORS[i % CARD_COLORS.length];
                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={[styles.featCard, { backgroundColor: bgColor }]}
                      onPress={() => router.push(`/task/${task.id}`)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.featCardTop}>
                        <View style={styles.featIconCircle}>
                          <Ionicons name={iconName} size={16} color="#fff" />
                        </View>
                        <View style={styles.featBadge}>
                          <Text style={styles.featBadgeText}>
                            {task.urgency === 'urgent' ? t.urgency.urgent : task.category}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.featTitle} numberOfLines={2}>{task.title}</Text>
                      {task.city ? (
                        <View style={styles.featLocation}>
                          <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.75)" />
                          <Text style={styles.featLocationText}>{task.city}</Text>
                        </View>
                      ) : null}
                      <View style={styles.featTags}>
                        <View style={styles.featTag}>
                          <Text style={styles.featTagText}>{task.category}</Text>
                        </View>
                        <View style={styles.featTag}>
                          <Text style={styles.featTagText}>{task.budget}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Popular vertical list */}
            {popular.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.home.popular}</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
                    <Text style={styles.seeAll}>{t.home.seeAll}</Text>
                  </TouchableOpacity>
                </View>

                {popular.map((task) => {
                  const iconName = CATEGORY_ICONS[task.category] ?? 'briefcase-outline';
                  const urgencyColor = URGENCY_COLORS[task.urgency] ?? '#6B7280';
                  const urgencyLabel = t.urgency[task.urgency as keyof typeof t.urgency] ?? task.urgency;
                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={[styles.popCard, { backgroundColor: colors.surface }]}
                      onPress={() => router.push(`/task/${task.id}`)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.popIconBox, { backgroundColor: colors.iconBg }]}>
                        <Ionicons name={iconName} size={22} color="#2563EB" />
                      </View>
                      <View style={styles.popBody}>
                        <View style={styles.popTopRow}>
                          <Text style={[styles.popCategory, { color: colors.textTertiary }]} numberOfLines={1}>{task.category}</Text>
                          <View style={[styles.popBadge, { backgroundColor: urgencyColor + '22' }]}>
                            <Text style={[styles.popBadgeText, { color: urgencyColor }]}>{urgencyLabel}</Text>
                          </View>
                        </View>
                        <Text style={[styles.popTitle, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                        {task.description ? (
                          <Text style={[styles.popDesc, { color: colors.textSecondary }]} numberOfLines={1}>{task.description}</Text>
                        ) : null}
                        {task.city ? (
                          <View style={styles.popLocation}>
                            <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
                            <Text style={[styles.popLocationText, { color: colors.textTertiary }]}>{task.city}</Text>
                          </View>
                        ) : null}
                        <View style={styles.popFooter}>
                          <Text style={styles.popBudget}>{task.budget}</Text>
                          <Text style={[styles.popMeta, { color: colors.textTertiary }]}>{timeAgo(task.postedAt, locale)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {tasks.length === 0 && (
              <EmptyState
                icon="search-outline"
                title={t.home.empty}
                subtitle={t.task.noTasksHint}
              />
            )}
          </>
        )}
      </ScrollView>

      <FilterSheet
        visible={filterVisible}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterVisible(false)}
        locale={locale}
        categories={config.categories}
        onApply={(f) => {
          setFilterVisible(false);
          router.push({
            pathname: '/(tabs)/tasks',
            params: {
              ...(f.category ? { category: f.category } : {}),
              ...(f.urgency ? { urgency: f.urgency } : {}),
              ...(f.city ? { city: f.city } : {}),
              ...(f.minBudget ? { minBudget: f.minBudget } : {}),
              ...(f.maxBudget ? { maxBudget: f.maxBudget } : {}),
              ...(f.sort !== 'newest' ? { sort: f.sort } : {}),
              ...(searchQuery.trim() ? { query: searchQuery.trim() } : {}),
            },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },


  scroll: {},

  welcomeSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  welcomeSub: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: '#111827', lineHeight: 32 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 20, marginTop: 16,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },

  catOuter: {
    height: 54,
    justifyContent: 'center',
  },
  catList: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    marginRight: 8,
  },
  catChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },

  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 14, fontWeight: '600', color: '#2563EB' },

  /* Featured card */
  featCard: {
    borderRadius: 20, padding: 18, marginHorizontal: 20,
    minHeight: 190, justifyContent: 'space-between',
  },
  featCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  featIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  featBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  featBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  featTitle: { fontSize: 16, fontWeight: '700', color: '#fff', lineHeight: 22, flex: 1 },
  featLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  featLocationText: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  featTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  featTag: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  featTagText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  /* Popular cards — same design as tasks page */
  popCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginHorizontal: 20, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  popIconBox: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12,
  },
  popBody: { flex: 1, minWidth: 0 },
  popTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  popCategory: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, flex: 1, marginRight: 6 },
  popBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  popBadgeText: { fontSize: 10, fontWeight: '700' },
  popTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  popDesc: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  popLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  popLocationText: { fontSize: 11, color: '#9CA3AF' },
  popFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  popBudget: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  popMeta: { fontSize: 11, color: '#9CA3AF' },

  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 15 },
});
