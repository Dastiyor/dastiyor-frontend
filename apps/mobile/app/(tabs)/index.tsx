import { useState, useCallback, useEffect, useRef } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FeedTask } from '@dastiyor/types';

const CATEGORY_VALUES = [
  { key: 'all' as const, value: '' },
  { key: 'repair' as const, value: 'Ремонт' },
  { key: 'cleaning' as const, value: 'Уборка' },
  { key: 'delivery' as const, value: 'Доставка' },
  { key: 'plumbing' as const, value: 'Сантехника' },
  { key: 'electrical' as const, value: 'Электрик' },
  { key: 'it' as const, value: 'IT и Веб' },
  { key: 'education' as const, value: 'Обучение' },
  { key: 'design' as const, value: 'Дизайн' },
  { key: 'beauty' as const, value: 'Красота' },
  { key: 'photo' as const, value: 'Фото и видео' },
  { key: 'events' as const, value: 'Мероприятия' },
];

const URGENCY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  normal: '#F59E0B',
  low: '#10B981',
};

interface TasksResponse {
  tasks: FeedTask[];
  pagination: { hasMore: boolean; page: number };
}

export default function TaskFeedScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<FeedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const page = useRef(1);

  useEffect(() => {
    if (!user) return;
    api.get<{ unreadCount: number }>('/api/notifications')
      .then((r) => setUnreadCount(r.unreadCount))
      .catch(() => {});
  }, [user]);

  async function fetchTasks(reset = false) {
    const p = reset ? 1 : page.current;
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (category) params.set('category', category);
    if (query.trim()) params.set('query', query.trim());

    const res = await api.get<TasksResponse>(`/api/tasks?${params}`);
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
      (async () => {
        setLoading(true);
        try { await fetchTasks(true); } catch {}
        setLoading(false);
      })();
    }, [category, query])
  );

  async function onRefresh() {
    setRefreshing(true);
    try { await fetchTasks(true); } catch {}
    setRefreshing(false);
  }

  async function onLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try { await fetchTasks(false); } catch {}
    setLoadingMore(false);
  }

  function renderTask({ item }: { item: FeedTask }) {
    const urgencyColor = URGENCY_COLORS[item.urgency] ?? '#6B7280';
    const urgencyLabel = t.urgency[item.urgency as keyof typeof t.urgency] ?? item.urgency;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/task/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardCategory}>{item.category}</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '20' }]}>
            <Text style={[styles.urgencyText, { color: urgencyColor }]}>{urgencyLabel}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardBudget}>{item.budget}</Text>
          <Text style={styles.cardMeta}>
            {item.city ? `${item.city} · ` : ''}{item.postedAt} · {item.responseCount} {t.home.responses}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  const categories = CATEGORY_VALUES.map((c) => ({
    name: t.categories[c.key],
    value: c.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t.home.title}</Text>
          {user ? (
            <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')}>
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
        </View>
        <TextInput
          style={styles.search}
          placeholder={t.home.search}
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value || 'all'}
            style={[styles.catChip, category === cat.value && styles.catChipActive]}
            onPress={() => setCategory(cat.value)}
          >
            <Text style={[styles.catChipText, category === cat.value && styles.catChipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color="#2563EB" />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={styles.empty}>{t.home.empty}</Text>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#2563EB" style={{ margin: 16 }} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  bellBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bellIcon: { fontSize: 22 },
  bellBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  search: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  catScroll: { backgroundColor: '#fff', maxHeight: 52, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  catContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  catChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  catChipTextActive: { color: '#fff' },
  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardCategory: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  urgencyBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  urgencyText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBudget: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  cardMeta: { fontSize: 12, color: '#9CA3AF' },
  center: { flex: 1, marginTop: 60 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 15 },
});
