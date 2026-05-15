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
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import type { AppNotification } from '@dastiyor/types';

const TYPE_ICON: Record<string, string> = {
  NEW_OFFER:      '📩',
  OFFER_ACCEPTED: '✅',
  OFFER_REJECTED: '❌',
  NEW_MESSAGE:    '💬',
  TASK_COMPLETED: '🎉',
  TASK_CANCELLED: '🚫',
};

function timeAgo(iso: string, time: { justNow: string; min: string; h: string; d: string }): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return time.justNow;
  if (mins < 60) return `${mins} ${time.min}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${time.h}`;
  return `${Math.floor(hours / 24)} ${time.d}`;
}

export default function NotificationsScreen() {
  const { t } = useLanguage();
  const toast = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await api.get<{ notifications: AppNotification[] }>('/api/notifications');
      setNotifications(res.notifications);
      api.put('/api/notifications', {}).catch(() => {});
    } catch {
      toast.show(t.notifications.loadError, 'error');
    }
  }

  useFocusEffect(
    useCallback(() => {
      (async () => { setLoading(true); await load(); setLoading(false); })();
    }, [])
  );

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  function handleTap(n: AppNotification) {
    const match = n.link.match(/\/tasks\/([^/?]+)/);
    if (match?.[1]) router.push(`/task/${match[1]}`);
  }

  const renderNotification = useCallback(({ item }: { item: AppNotification }) => (
    <TouchableOpacity style={[styles.row, !item.isRead && styles.rowUnread]} onPress={() => handleTap(item)} activeOpacity={0.7}>
      <Text style={styles.icon}>{TYPE_ICON[item.type] ?? '🔔'}</Text>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.time}>{timeAgo(item.createdAt, t.time)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
      </View>
      {!item.isRead && <View style={styles.dot} />}
    </TouchableOpacity>
  ), [t]);

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#2563EB" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        ListEmptyComponent={
          <EmptyState icon="notifications-outline" title={t.notifications.empty} />
        }
        renderItem={renderNotification}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, marginTop: 60 },
  row: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
  rowUnread: { backgroundColor: '#EFF6FF' },
  icon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  time: { fontSize: 11, color: '#9CA3AF' },
  message: { fontSize: 13, color: '#4B5563', lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB', marginTop: 6, marginLeft: 8 },
  sep: { height: 1, backgroundColor: '#F3F4F6' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
});
