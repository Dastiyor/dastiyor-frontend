import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api-client';
import { timeAgo } from '@/lib/timeAgo';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TaskCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/contexts/ToastContext';

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  'Ремонт': 'construct-outline',
  'Уборка': 'sparkles-outline',
  'Доставка': 'bicycle-outline',
  'Сантехника': 'water-outline',
  'Электрик': 'flash-outline',
  'IT и Веб': 'laptop-outline',
  'Обучение': 'school-outline',
  'Дизайн': 'color-palette-outline',
  'Красота': 'cut-outline',
  'Фото и видео': 'camera-outline',
  'Мероприятия': 'musical-notes-outline',
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  OPEN:        { color: '#059669', bg: '#D1FAE5' },
  IN_PROGRESS: { color: '#2563EB', bg: '#DBEAFE' },
  COMPLETED:   { color: '#6B7280', bg: '#F3F4F6' },
  CANCELLED:   { color: '#EF4444', bg: '#FEE2E2' },
  PENDING:     { color: '#F59E0B', bg: '#FEF3C7' },
  ACCEPTED:    { color: '#059669', bg: '#D1FAE5' },
  REJECTED:    { color: '#EF4444', bg: '#FEE2E2' },
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  const s = STATUS_COLORS[status] ?? { color: '#374151', bg: '#F3F4F6' };
  return (
    <View style={[badge.wrap, { backgroundColor: s.bg }]}>
      <Text style={[badge.text, { color: s.color }]}>{label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  text: { fontSize: 11, fontWeight: '700' },
});

interface MyTask {
  id: string;
  title: string;
  category: string;
  budget: string;
  city: string;
  status: string;
  postedAt: string;
  responseCount: number;
}

interface MyResponse {
  id: string;
  message: string;
  price: string;
  estimatedTime: string | null;
  status: string;
  createdAt: string;
  task: { id: string; title: string; category: string; city: string; status: string };
}

export default function MyScreen() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const toast = useToast();
  const isCustomer = user?.role === 'CUSTOMER';

  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [responses, setResponses] = useState<MyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      if (isCustomer) {
        const res = await api.get<{ tasks: MyTask[] }>('/api/my-tasks');
        setTasks(res.tasks);
      } else {
        const res = await api.get<{ responses: MyResponse[] }>('/api/my-responses');
        setResponses(res.responses);
      }
    } catch {
      toast.show('Не удалось загрузить данные', 'error');
    }
  }

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        await load();
        setLoading(false);
      })();
    }, [isCustomer])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const renderTask = useCallback(({ item }: { item: MyTask }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/task/${item.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.cardIconBox}>
        <Ionicons name={CATEGORY_ICONS[item.category] ?? 'briefcase-outline'} size={22} color="#2563EB" />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardCategory} numberOfLines={1}>{item.category}</Text>
          <StatusBadge status={item.status} label={t.status[item.status as keyof typeof t.status] ?? item.status} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        {item.city ? (
          <View style={styles.cardLocation}>
            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
            <Text style={styles.cardLocationText}>{item.city}</Text>
          </View>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardBudget}>{item.budget}</Text>
          <Text style={styles.cardMeta}>{timeAgo(item.postedAt, locale)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [t, locale]);

  const renderResponse = useCallback(({ item }: { item: MyResponse }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/task/${item.task.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.cardIconBox}>
        <Ionicons name={CATEGORY_ICONS[item.task.category] ?? 'briefcase-outline'} size={22} color="#2563EB" />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardCategory} numberOfLines={1}>{item.task.category}</Text>
          <StatusBadge status={item.status} label={t.status[item.status as keyof typeof t.status] ?? item.status} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.task.title}</Text>
        <Text style={styles.responseMsg} numberOfLines={1}>{item.message}</Text>
        {item.task.city ? (
          <View style={styles.cardLocation}>
            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
            <Text style={styles.cardLocationText}>{item.task.city}</Text>
          </View>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardBudget}>{item.price} TJS</Text>
          <Text style={styles.cardMeta}>{timeAgo(item.createdAt, locale)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [t, locale]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={isCustomer ? t.my.myTasks : t.my.myResponses} />

      {loading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4].map((i) => <TaskCardSkeleton key={i} />)}
        </View>
      ) : isCustomer ? (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-outline"
              title={t.my.noTasks}
              subtitle={t.my.createFirst}
              actionLabel={t.my.createTask}
              onAction={() => router.push('/create-task')}
            />
          }
          renderItem={renderTask}
        />
      ) : (
        <FlatList
          data={responses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <EmptyState
              icon="hand-left-outline"
              title={t.my.noResponses}
              subtitle={t.my.browseHint}
              actionLabel={t.tabs.tasks}
              onAction={() => router.push('/(tabs)/tasks')}
            />
          }
          renderItem={renderResponse}
        />
      )}

      {/* FAB for creating tasks (customers only) */}
      {isCustomer && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-task')} accessibilityLabel={t.my.createTask} accessibilityRole="button">
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  skeletonList: { paddingTop: 12 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardIconBox: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  cardCategory: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, flex: 1, marginRight: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  responseMsg: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  cardLocationText: { fontSize: 11, color: '#9CA3AF' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBudget: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  cardMeta: { fontSize: 11, color: '#9CA3AF' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#9CA3AF', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
