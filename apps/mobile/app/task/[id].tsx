import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { goBack } from '@/lib/nav';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { timeAgo } from '@/lib/timeAgo';
import { TASK_POLL_MS } from '@/lib/constants';
import type { TaskDetail, TaskResponse, MyResponse } from '@dastiyor/types';
import { Alert } from '@/lib/dialog';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t, locale, tr } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tk = t.task;
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [responses, setResponses] = useState<TaskResponse[]>([]);
  const [myResponse, setMyResponse] = useState<MyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // True while a confirm dialog is up or its action is running. Refetching then
  // re-renders the screen underneath a presented alert, which on iOS can leave
  // the view hierarchy unresponsive -- the header back button stops working.
  const busyRef = useRef(false);

  /** Alert.alert wrapped so the poll stays out of the way while it is on screen. */
  function confirmThen(title: string, message: string, confirmLabel: string, run: () => Promise<void>, destructive = false) {
    busyRef.current = true;
    Alert.alert(
      title,
      message,
      [
        { text: t.common.cancel, style: 'cancel', onPress: () => { busyRef.current = false; } },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: async () => {
            try { await run(); } finally { busyRef.current = false; }
          },
        },
      ],
      // Android can dismiss with the hardware back button, firing neither
      // handler; without this the flag would stay set and stop the poll for good.
      { onDismiss: () => { busyRef.current = false; } },
    );
  }

  const URGENCY_LABEL: Record<string, { label: string; color: string }> = {
    urgent: { label: t.urgency.urgent, color: '#EF4444' },
    normal: { label: t.urgency.normal, color: '#F59E0B' },
    low:    { label: t.urgency.low,    color: '#10B981' },
  };

  const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:  { label: t.status.PENDING,  color: '#F59E0B', bg: '#FEF3C7' },
    ACCEPTED: { label: t.status.ACCEPTED, color: '#059669', bg: '#D1FAE5' },
    REJECTED: { label: t.status.REJECTED, color: '#EF4444', bg: '#FEE2E2' },
    // Task states -- the provider had no way to see the task was finished.
    OPEN:        { label: t.status.OPEN,        color: '#059669', bg: '#D1FAE5' },
    IN_PROGRESS: { label: t.status.IN_PROGRESS, color: '#2563EB', bg: '#DBEAFE' },
    COMPLETED:   { label: t.status.COMPLETED,   color: '#6B7280', bg: '#F3F4F6' },
    CANCELLED:   { label: t.status.CANCELLED,   color: '#EF4444', bg: '#FEE2E2' },
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
        setLoadError(false);
        try {
          const data = await loadTask();
          if (data) await loadResponses(data);
        } catch (e) {
          setLoadError(true);
        } finally {
          setLoading(false);
        }
      })();

      // The other side of the deal changes this screen from another device --
      // accept, complete, a new response -- so refresh while it stays open.
      // Silent: no spinner, and a failed tick leaves the last good state alone.
      pollRef.current = setInterval(async () => {
        if (AppState.currentState !== 'active' || busyRef.current) return;
        try {
          const data = await loadTask();
          if (data) await loadResponses(data);
        } catch {}
      }, TASK_POLL_MS);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      };
    }, [id, user?.id])
  );

  async function retryLoad() {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await loadTask();
      if (data) await loadResponses(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(response: TaskResponse) {
    const swapping = task?.status === 'IN_PROGRESS';
    confirmThen(
      swapping ? tk.switchProvider : tk.confirmAccept,
      (swapping ? tk.confirmSwitchMsg : tk.confirmAcceptMsg)
        .replace('{name}', response.provider.fullName).replace('{price}', String(response.price)),
      swapping ? tk.switchProvider : tk.accept,
      async () => {
        setActionLoading(response.id);
        try {
          await api.post('/api/tasks/accept', { taskId: task!.id, providerId: response.provider.id });
          const newTask = await loadTask();
          if (newTask) await loadResponses(newTask);
        } catch (e) {
          Alert.alert(t.common.error, (e as Error).message);
        } finally {
          setActionLoading(null);
        }
      }
    );
  }

  async function handleReject(response: TaskResponse) {
    confirmThen(tk.confirmReject, tk.confirmRejectMsg, tk.reject, async () => {
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
    }, true);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  if (loadError || !task) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg, flex: 1 }]}>
        <Text style={[styles.noResponsesText, { color: colors.textSecondary }]}>{t.common.errorTitle}</Text>
        <TouchableOpacity style={styles.respondBtn} onPress={retryLoad}>
          <Text style={styles.respondBtnText}>{t.common.errorRetry}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => goBack()}>
          <Text style={{ color: colors.accent }}>{t.navigation.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          {(() => {
            const ts = STATUS_BADGE[task.status];
            return ts ? (
              <View style={[styles.badge, { backgroundColor: ts.bg }]}>
                <Text style={[styles.badgeText, { color: ts.color }]}>{ts.label}</Text>
              </View>
            ) : null;
          })()}
          <View style={[styles.badge, { backgroundColor: urgency.color + '18' }]}>
            <Text style={[styles.badgeText, { color: urgency.color }]}>{urgency.label}</Text>
          </View>
          <Text style={[styles.category, { color: colors.textSecondary }]}>{tr(task.category)}</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>

        <View style={styles.metaRow}>
          {task.city ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{tr(task.city)}</Text>
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
          <Text style={styles.budgetValue}>{tr(task.budget)}</Text>
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
              const rs = STATUS_BADGE[r.status] ?? { label: r.status, color: '#374151', bg: '#F3F4F6' };
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
                  <TouchableOpacity
                    style={styles.messageBtn}
                    onPress={() => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: r.provider.id, partnerName: r.provider.fullName, taskId: task.id } })}
                    accessibilityRole="button"
                  >
                    <Ionicons name="chatbubble-outline" size={15} color="#2563EB" />
                    <Text style={styles.messageBtnText}>{t.provider.chat}</Text>
                  </TouchableOpacity>
                  {/* Accepting leaves the other bids PENDING on purpose, so
                      a provider who falls through mid-job can be swapped out. */}
                  {r.status === 'PENDING' && (task.status === 'OPEN' || task.status === 'IN_PROGRESS') ? (
                    <View style={styles.responseActions}>
                      <TouchableOpacity style={[styles.rejectBtn, busy && styles.btnBusy]} onPress={() => handleReject(r)} disabled={!!actionLoading}>
                        {busy ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.rejectBtnText}>{tk.reject}</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.acceptBtn, busy && styles.btnBusy]} onPress={() => handleAccept(r)} disabled={!!actionLoading}>
                        {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptBtnText}>{task.status === 'IN_PROGRESS' ? tk.switchProvider : tk.accept}</Text>}
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

        {/* Cancel is OPEN-only: /api/tasks/cancel rejects anything else (400). */}
        {isOwner && task.status === 'OPEN' ? (
          <View style={[styles.lifecycleRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelTaskBtn, taskActionLoading === 'cancel' && styles.btnBusy]}
              disabled={!!taskActionLoading}
              onPress={() =>
                confirmThen(tk.confirmCancel, tk.confirmCancelMsg, tk.cancelTask, async () => {
                  setTaskActionLoading('cancel');
                  try {
                    await api.post('/api/tasks/cancel', { taskId: task.id });
                    const d = await loadTask();
                    if (d) await loadResponses(d);
                  } catch (e) { Alert.alert(t.common.error, (e as Error).message); }
                  finally { setTaskActionLoading(null); }
                }, true)
              }
            >
              {taskActionLoading === 'cancel' ? <ActivityIndicator color="#EF4444" size="small" /> : <Text style={styles.cancelTaskBtnText}>{tk.cancel}</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {isOwner && task.status === 'IN_PROGRESS' ? (
          <View style={[styles.lifecycleRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.completeBtn, taskActionLoading === 'complete' && styles.btnBusy]}
              disabled={!!taskActionLoading}
              onPress={() =>
                confirmThen(tk.confirmComplete, tk.confirmCompleteMsg, tk.completeBtn, async () => {
                  setTaskActionLoading('complete');
                  try {
                    await api.post('/api/tasks/complete', { taskId: task.id });
                    const d = await loadTask();
                    if (d) await loadResponses(d);
                  } catch (e) { Alert.alert(t.common.error, (e as Error).message); }
                  finally { setTaskActionLoading(null); }
                })
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
              <View style={[styles.rsBadge, { backgroundColor: STATUS_BADGE[myResponse.status]?.bg ?? '#F3F4F6' }]}>
                <Text style={[styles.rsBadgeText, { color: STATUS_BADGE[myResponse.status]?.color ?? '#374151' }]}>
                  {STATUS_BADGE[myResponse.status]?.label ?? myResponse.status}
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
            {task.customer ? (
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => router.push({ pathname: '/chat/[partnerId]', params: { partnerId: task.customer!.id, partnerName: task.customer!.fullName, taskId: task.id } })}
                accessibilityRole="button"
              >
                <Ionicons name="chatbubble-outline" size={15} color="#2563EB" />
                <Text style={styles.messageBtnText}>{t.provider.chat}</Text>
              </TouchableOpacity>
            ) : null}
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
  // marginTop here, not marginBottom on messageBtn -- the Message button also
  // renders alone (accepted responses), where a trailing gap would look wrong.
  responseActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#2563EB', borderRadius: 10, paddingVertical: 9, marginTop: 10 },
  messageBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
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
