import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { timeAgo } from '@/lib/timeAgo';
import type { TaskDetail, TaskResponse, MyResponse } from '@dastiyor/types';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tk = t.task;
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [responses, setResponses] = useState<TaskResponse[]>([]);
  const [myResponse, setMyResponse] = useState<MyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);

  const URGENCY_LABEL: Record<string, { label: string; color: string }> = {
    urgent: { label: t.urgency.urgent, color: '#EF4444' },
    normal: { label: t.urgency.normal, color: '#F59E0B' },
    low:    { label: t.urgency.low,    color: '#10B981' },
  };

  const RESPONSE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:  { label: t.status.PENDING,  color: '#F59E0B', bg: '#FEF3C7' },
    ACCEPTED: { label: t.status.ACCEPTED, color: '#059669', bg: '#D1FAE5' },
    REJECTED: { label: t.status.REJECTED, color: '#EF4444', bg: '#FEE2E2' },
  };

  async function loadTask() {
    if (!id) return;
    const data = await api.get<TaskDetail>(`/api/tasks/${id}`);
    setTask(data);
    return data;
  }

  async function loadResponses(taskData: TaskDetail) {
    if (!user || !id) return;
    if (user.id === taskData.customer?.id) {
      try {
        const res = await api.get<{ responses: TaskResponse[] }>(`/api/tasks/${id}/responses`);
        setResponses(res.responses);
      } catch {}
    } else if (user.role === 'PROVIDER') {
      try {
        const res = await api.get<{ response: MyResponse | null }>(`/api/tasks/${id}/my-response`);
        setMyResponse(res.response);
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
          Alert.alert(t.common.error, (e as Error).message);
          router.back();
        } finally {
          setLoading(false);
        }
      })();
    }, [id, user?.id])
  );

  async function handleAccept(response: TaskResponse) {
    Alert.alert(
      tk.confirmAccept,
      tk.confirmAcceptMsg.replace('{name}', response.provider.fullName).replace('{price}', String(response.price)),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: tk.accept,
          onPress: async () => {
            setActionLoading(response.id);
            try {
              await api.post('/api/tasks/accept', { taskId: task!.id, providerId: response.provider.id });
              const [newTask] = await Promise.all([loadTask()]);
              if (newTask) await loadResponses(newTask);
            } catch (e) {
              Alert.alert(t.common.error, (e as Error).message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }

  async function handleReject(response: TaskResponse) {
    Alert.alert(tk.confirmReject, tk.confirmRejectMsg, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: tk.reject,
        style: 'destructive',
        onPress: async () => {
          setActionLoading(response.id);
          try {
            await api.post('/api/responses/reject', { responseId: response.id });
            const newTask = await loadTask();
            if (newTask) await loadResponses(newTask);
          } catch (e) {
            Alert.alert(t.common.error, (e as Error).message);
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  if (!task) return null;

  const urgency = URGENCY_LABEL[task.urgency] ?? { label: task.urgency, color: '#6B7280' };
  const isOwner = user?.id === task.customer?.id;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 104 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#2563EB"
            onRefresh={async () => {
              setRefreshing(true);
              try { const d = await loadTask(); if (d) await loadResponses(d); } catch {}
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: urgency.color + '18' }]}>
            <Text style={[styles.badgeText, { color: urgency.color }]}>{urgency.label}</Text>
          </View>
          <Text style={[styles.category, { color: colors.textSecondary }]}>{task.category}</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>

        <View style={styles.metaRow}>
          {task.city ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{task.city}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{timeAgo(task.postedAt, locale)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="chatbubble-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{task.responseCount} {t.home.responses}</Text>
          </View>
        </View>

        <View style={[styles.budgetBox, { backgroundColor: colors.iconBg }]}>
          <Text style={styles.budgetLabel}>{tk.budget}</Text>
          <Text style={styles.budgetValue}>{task.budget}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{tk.description}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{task.description}</Text>

        {task.address ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{tk.address}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{task.address}</Text>
          </>
        ) : null}

        <View style={[styles.customerBox, { borderTopColor: colors.border }]}>
          <Text style={[styles.customerLabel, { color: colors.textTertiary }]}>{tk.customer}</Text>
          <Text style={[styles.customerName, { color: colors.text }]}>{task.customer?.fullName ?? '—'}</Text>
        </View>

        {isOwner && responses.length > 0 ? (
          <View style={[styles.responsesSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{tk.responses} ({responses.length})</Text>
            {responses.map((r) => {
              const rs = RESPONSE_STATUS[r.status] ?? { label: r.status, color: '#374151', bg: '#F3F4F6' };
              const busy = actionLoading === r.id;
              return (
                <View key={r.id} style={[styles.responseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.responseHeader}>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/provider/[id]', params: { id: r.provider.id, name: r.provider.fullName } })}>
                      <Text style={[styles.providerName, styles.providerNameLink]}>{r.provider.fullName}</Text>
                    </TouchableOpacity>
                    <View style={[styles.rsBadge, { backgroundColor: rs.bg }]}>
                      <Text style={[styles.rsBadgeText, { color: rs.color }]}>{rs.label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.responseMsg, { color: colors.textSecondary }]} numberOfLines={3}>{r.message}</Text>
                  <View style={styles.responseMeta}>
                    <Text style={styles.responsePrice}>{r.price} TJS</Text>
                    {r.estimatedTime ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.responseTime, { color: colors.textSecondary }]}>{r.estimatedTime}</Text>
                      </View>
                    ) : null}
                  </View>
                  {r.status === 'PENDING' && task.status === 'OPEN' ? (
                    <View style={styles.responseActions}>
                      <TouchableOpacity style={[styles.rejectBtn, busy && styles.btnBusy]} onPress={() => handleReject(r)} disabled={!!actionLoading}>
                        {busy ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.rejectBtnText}>{tk.reject}</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.acceptBtn, busy && styles.btnBusy]} onPress={() => handleAccept(r)} disabled={!!actionLoading}>
                        {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptBtnText}>{tk.accept}</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {isOwner && responses.length === 0 && task.status === 'OPEN' ? (
          <View style={styles.noResponses}><Text style={styles.noResponsesText}>{tk.noResponses}</Text></View>
        ) : null}

        {isOwner && task.status === 'IN_PROGRESS' ? (
          <View style={[styles.lifecycleRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelTaskBtn, taskActionLoading === 'cancel' && styles.btnBusy]}
              disabled={!!taskActionLoading}
              onPress={() =>
                Alert.alert(tk.confirmCancel, tk.confirmCancelMsg, [
                  { text: t.common.no, style: 'cancel' },
                  {
                    text: tk.cancelTask,
                    style: 'destructive',
                    onPress: async () => {
                      setTaskActionLoading('cancel');
                      try {
                        await api.post('/api/tasks/cancel', { taskId: task.id });
                        const d = await loadTask();
                        if (d) await loadResponses(d);
                      } catch (e) { Alert.alert(t.common.error, (e as Error).message); }
                      finally { setTaskActionLoading(null); }
                    },
                  },
                ])
              }
            >
              {taskActionLoading === 'cancel' ? <ActivityIndicator color="#EF4444" size="small" /> : <Text style={styles.cancelTaskBtnText}>{tk.cancel}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeBtn, taskActionLoading === 'complete' && styles.btnBusy]}
              disabled={!!taskActionLoading}
              onPress={() =>
                Alert.alert(tk.confirmComplete, tk.confirmCompleteMsg, [
                  { text: t.common.no, style: 'cancel' },
                  {
                    text: tk.completeBtn,
                    onPress: async () => {
                      setTaskActionLoading('complete');
                      try {
                        await api.post('/api/tasks/complete', { taskId: task.id });
                        const d = await loadTask();
                        if (d) await loadResponses(d);
                      } catch (e) { Alert.alert(t.common.error, (e as Error).message); }
                      finally { setTaskActionLoading(null); }
                    },
                  },
                ])
              }
            >
              {taskActionLoading === 'complete' ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.completeBtnText}>{tk.complete}</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {isOwner && task.status === 'COMPLETED' && !task.hasReview ? (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => {
            const accepted = responses.find((r) => r.status === 'ACCEPTED');
            if (!accepted) {
              Alert.alert(t.common.error, tk.noResponses);
              return;
            }
            router.push({ pathname: '/review/[taskId]', params: { taskId: task.id, taskTitle: task.title, providerName: accepted.provider.fullName } });
          }}>
            <Text style={styles.reviewBtnText}>{tk.leaveReview}</Text>
          </TouchableOpacity>
        ) : null}

        {isOwner && task.status === 'COMPLETED' && task.hasReview ? (
          <View style={styles.reviewedBadge}><Text style={styles.reviewedBadgeText}>{tk.reviewed}</Text></View>
        ) : null}

        {!isOwner && user?.role === 'PROVIDER' && myResponse ? (
          <View style={[styles.myResponseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.myResponseHeader}>
              <Text style={[styles.myResponseTitle, { color: colors.text }]}>{tk.myResponseTitle}</Text>
              <View style={[styles.rsBadge, { backgroundColor: RESPONSE_STATUS[myResponse.status]?.bg ?? '#F3F4F6' }]}>
                <Text style={[styles.rsBadgeText, { color: RESPONSE_STATUS[myResponse.status]?.color ?? '#374151' }]}>
                  {RESPONSE_STATUS[myResponse.status]?.label ?? myResponse.status}
                </Text>
              </View>
            </View>
            <Text style={[styles.myResponseMsg, { color: colors.textSecondary }]}>{myResponse.message}</Text>
            <View style={styles.responseMeta}>
              <Text style={styles.responsePrice}>{myResponse.price} TJS</Text>
              {myResponse.estimatedTime ? (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                  <Text style={[styles.responseTime, { color: colors.textSecondary }]}>{myResponse.estimatedTime}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {!isOwner && user?.role === 'PROVIDER' && task.status === 'OPEN' && !myResponse ? (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.respondBtn} onPress={() => router.push({ pathname: '/respond/[id]', params: { id: task.id, title: task.title } })}>
            <Text style={styles.respondBtnText}>{tk.respond}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  category: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12, lineHeight: 30 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  providerNameLink: { color: '#2563EB', textDecorationLine: 'underline' },
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
  myResponseCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginTop: 20, backgroundColor: '#F9FAFB' },
  myResponseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  myResponseTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  myResponseMsg: { fontSize: 13, color: '#4B5563', lineHeight: 18, marginBottom: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingTop: 16, borderTopWidth: 1 },
  respondBtn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center' },
  respondBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  lifecycleRow: { flexDirection: 'row', gap: 10, marginTop: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 20 },
  cancelTaskBtn: { flex: 1, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelTaskBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  completeBtn: { flex: 2, backgroundColor: '#059669', borderRadius: 12, padding: 14, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reviewBtn: { marginTop: 16, backgroundColor: '#FEF3C7', borderRadius: 14, padding: 16, alignItems: 'center' },
  reviewBtnText: { color: '#92400E', fontWeight: '700', fontSize: 15 },
  reviewedBadge: { marginTop: 16, backgroundColor: '#D1FAE5', borderRadius: 14, padding: 14, alignItems: 'center' },
  reviewedBadgeText: { color: '#065F46', fontWeight: '700', fontSize: 14 },
});
