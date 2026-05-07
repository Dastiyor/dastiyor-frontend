import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import type { TaskDetail } from '@dastiyor/types';

const URGENCY_LABEL: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Срочно', color: '#EF4444' },
  normal: { label: 'Обычная', color: '#F59E0B' },
  low: { label: 'Гибкий', color: '#10B981' },
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.get<TaskDetail>(`/api/tasks/${id}`);
        setTask(data);
      } catch (e) {
        Alert.alert('Ошибка', (e as Error).message);
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function handleRespond() {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    router.push({ pathname: '/respond/[id]', params: { id: task!.id, title: task!.title } });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!task) return null;

  const urgency = URGENCY_LABEL[task.urgency] ?? { label: task.urgency, color: '#6B7280' };
  const isOwner = user?.id === task.customer?.id;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: urgency.color + '18' }]}>
            <Text style={[styles.badgeText, { color: urgency.color }]}>{urgency.label}</Text>
          </View>
          <Text style={styles.category}>{task.category}</Text>
        </View>

        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.metaRow}>
          {task.city ? <Text style={styles.meta}>📍 {task.city}</Text> : null}
          <Text style={styles.meta}>📅 {task.postedAt}</Text>
          <Text style={styles.meta}>💬 {task.responseCount} откл.</Text>
        </View>

        <View style={styles.budgetBox}>
          <Text style={styles.budgetLabel}>Бюджет</Text>
          <Text style={styles.budgetValue}>{task.budget}</Text>
        </View>

        <Text style={styles.sectionTitle}>Описание</Text>
        <Text style={styles.description}>{task.description}</Text>

        {task.address ? (
          <>
            <Text style={styles.sectionTitle}>Адрес</Text>
            <Text style={styles.description}>{task.address}</Text>
          </>
        ) : null}

        <View style={styles.customerBox}>
          <Text style={styles.customerLabel}>Заказчик</Text>
          <Text style={styles.customerName}>{task.customer?.fullName ?? '—'}</Text>
        </View>
      </ScrollView>

      {!isOwner && user?.role === 'PROVIDER' && task.status === 'OPEN' ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.respondBtn, responding && styles.respondBtnDisabled]}
            onPress={handleRespond}
            disabled={responding}
          >
            {responding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.respondBtnText}>Откликнуться</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  category: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12, lineHeight: 30 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  meta: { fontSize: 13, color: '#6B7280' },
  budgetBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  budgetLabel: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginBottom: 4 },
  budgetValue: { fontSize: 22, fontWeight: '800', color: '#1D4ED8' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  description: { fontSize: 15, color: '#374151', lineHeight: 24, marginBottom: 20 },
  customerBox: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    marginTop: 4,
  },
  customerLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  respondBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  respondBtnDisabled: { opacity: 0.6 },
  respondBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
