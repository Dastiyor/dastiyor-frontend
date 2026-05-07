import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:        { label: 'Открыто',    color: '#059669', bg: '#D1FAE5' },
  IN_PROGRESS: { label: 'В работе',  color: '#2563EB', bg: '#DBEAFE' },
  COMPLETED:   { label: 'Завершено', color: '#6B7280', bg: '#F3F4F6' },
  CANCELLED:   { label: 'Отменено',  color: '#EF4444', bg: '#FEE2E2' },
  PENDING:     { label: 'На рассм.', color: '#F59E0B', bg: '#FEF3C7' },
  ACCEPTED:    { label: 'Принят',    color: '#059669', bg: '#D1FAE5' },
  REJECTED:    { label: 'Отклонён',  color: '#EF4444', bg: '#FEE2E2' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? { label: status, color: '#374151', bg: '#F3F4F6' };
  return (
    <View style={[badge.wrap, { backgroundColor: s.bg }]}>
      <Text style={[badge.text, { color: s.color }]}>{s.label}</Text>
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
    } catch {}
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

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#2563EB" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isCustomer ? 'Мои задания' : 'Мои отклики'}</Text>
        {isCustomer ? (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/create-task')}
          >
            <Text style={styles.createBtnText}>+ Создать</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isCustomer ? (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Нет заданий</Text>
              <Text style={styles.emptyHint}>Создайте первое задание</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/create-task')}>
                <Text style={styles.emptyBtnText}>Создать задание</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/task/${item.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardBudget}>{item.budget}</Text>
                <Text style={styles.cardMeta}>{item.city} · {item.responseCount} откл.</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={responses}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Нет откликов</Text>
              <Text style={styles.emptyHint}>Откликайтесь на задания в ленте</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/task/${item.task.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardCategory}>{item.task.category}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.task.title}</Text>
              <Text style={styles.responseMsg} numberOfLines={2}>{item.message}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardBudget}>{item.price} TJS</Text>
                <Text style={styles.cardMeta}>{item.task.city} · {item.createdAt}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, marginTop: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  createBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardCategory: { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  responseMsg: { fontSize: 13, color: '#6B7280', marginBottom: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBudget: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  cardMeta: { fontSize: 12, color: '#9CA3AF' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#9CA3AF', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
