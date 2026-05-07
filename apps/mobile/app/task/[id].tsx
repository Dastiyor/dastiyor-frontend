import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import type { TaskDetail, TaskResponse } from '@dastiyor/types';

const URGENCY_LABEL: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Срочно', color: '#EF4444' },
  normal: { label: 'Обычная', color: '#F59E0B' },
  low: { label: 'Гибкий', color: '#10B981' },
};

const RESPONSE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'На рассм.', color: '#F59E0B', bg: '#FEF3C7' },
  ACCEPTED: { label: 'Принят',    color: '#059669', bg: '#D1FAE5' },
  REJECTED: { label: 'Отклонён',  color: '#EF4444', bg: '#FEE2E2' },
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [responses, setResponses] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadTask() {
    if (!id) return;
    const data = await api.get<TaskDetail>(`/api/tasks/${id}`);
    setTask(data);
    return data;
  }

  async function loadResponses(taskData: TaskDetail) {
    if (user && user.id === taskData.customer?.id) {
      try {
        const res = await api.get<{ responses: TaskResponse[] }>(`/api/tasks/${id}/responses`);
        setResponses(res.responses);
      } catch {}
    }
  }

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const data = await loadTask();
          if (data) await loadResponses(data);
        } catch (e) {
          Alert.alert('Ошибка', (e as Error).message);
          router.back();
        } finally {
          setLoading(false);
        }
      })();
    }, [id, user?.id])
  );

  async function handleAccept(response: TaskResponse) {
    Alert.alert(
      'Принять исполнителя',
      `Принять ${response.provider.fullName} за ${response.price} TJS?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Принять',
          onPress: async () => {
            setActionLoading(response.id);
            try {
              await api.post('/api/tasks/accept', {
                taskId: task!.id,
                providerId: response.provider.id,
              });
              const [newTask] = await Promise.all([loadTask()]);
              if (newTask) await loadResponses(newTask);
            } catch (e) {
              Alert.alert('Ошибка', (e as Error).message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }

  async function handleReject(response: TaskResponse) {
    Alert.alert('Отклонить', 'Отклонить этот отклик?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Отклонить',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(response.id);
          try {
            await api.post('/api/responses/reject', { responseId: response.id });
            const newTask = await loadTask();
            if (newTask) await loadResponses(newTask);
          } catch (e) {
            Alert.alert('Ошибка', (e as Error).message);
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
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

        {/* Responses section — owner only */}
        {isOwner && responses.length > 0 ? (
          <View style={styles.responsesSection}>
            <Text style={styles.sectionTitle}>Отклики ({responses.length})</Text>
            {responses.map((r) => {
              const rs = RESPONSE_STATUS[r.status] ?? { label: r.status, color: '#374151', bg: '#F3F4F6' };
              const busy = actionLoading === r.id;
              return (
                <View key={r.id} style={styles.responseCard}>
                  <View style={styles.responseHeader}>
                    <Text style={styles.providerName}>{r.provider.fullName}</Text>
                    <View style={[styles.rsBadge, { backgroundColor: rs.bg }]}>
                      <Text style={[styles.rsBadgeText, { color: rs.color }]}>{rs.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.responseMsg} numberOfLines={3}>{r.message}</Text>
                  <View style={styles.responseMeta}>
                    <Text style={styles.responsePrice}>{r.price} TJS</Text>
                    {r.estimatedTime ? (
                      <Text style={styles.responseTime}>⏱ {r.estimatedTime}</Text>
                    ) : null}
                  </View>
                  {r.status === 'PENDING' && task.status === 'OPEN' ? (
                    <View style={styles.responseActions}>
                      <TouchableOpacity
                        style={[styles.rejectBtn, busy && styles.btnBusy]}
                        onPress={() => handleReject(r)}
                        disabled={!!actionLoading}
                      >
                        {busy ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.rejectBtnText}>Отклонить</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.acceptBtn, busy && styles.btnBusy]}
                        onPress={() => handleAccept(r)}
                        disabled={!!actionLoading}
                      >
                        {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptBtnText}>Принять</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {isOwner && responses.length === 0 && task.status === 'OPEN' ? (
          <View style={styles.noResponses}>
            <Text style={styles.noResponsesText}>Откликов пока нет</Text>
          </View>
        ) : null}
      </ScrollView>

      {!isOwner && user?.role === 'PROVIDER' && task.status === 'OPEN' ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.respondBtn}
            onPress={() => router.push({ pathname: '/respond/[id]', params: { id: task.id, title: task.title } })}
          >
            <Text style={styles.respondBtnText}>Откликнуться</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 110 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  category: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12, lineHeight: 30 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  meta: { fontSize: 13, color: '#6B7280' },
  budgetBox: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, marginBottom: 20 },
  budgetLabel: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginBottom: 4 },
  budgetValue: { fontSize: 22, fontWeight: '800', color: '#1D4ED8' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  description: { fontSize: 15, color: '#374151', lineHeight: 24, marginBottom: 20 },
  customerBox: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16, marginTop: 4, marginBottom: 20 },
  customerLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  responsesSection: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 20 },
  responseCard: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  responseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  providerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rsBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rsBadgeText: { fontSize: 11, fontWeight: '700' },
  responseMsg: { fontSize: 13, color: '#4B5563', lineHeight: 18, marginBottom: 8 },
  responseMeta: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  responsePrice: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  responseTime: { fontSize: 13, color: '#6B7280' },
  responseActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 10, padding: 10, alignItems: 'center' },
  rejectBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  acceptBtn: { flex: 1, backgroundColor: '#2563EB', borderRadius: 10, padding: 10, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnBusy: { opacity: 0.5 },
  noResponses: { alignItems: 'center', paddingVertical: 20 },
  noResponsesText: { color: '#9CA3AF', fontSize: 14 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  respondBtn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center' },
  respondBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
