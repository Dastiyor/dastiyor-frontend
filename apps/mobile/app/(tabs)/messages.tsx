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
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import type { Conversation } from '@dastiyor/types';

function timeAgo(iso: string, time: { justNow: string; min: string; h: string; d: string }): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return time.justNow;
  if (mins < 60) return `${mins} ${time.min}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${time.h}`;
  return `${Math.floor(hours / 24)} ${time.d}`;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const ini = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  return <View style={styles.avatar}><Text style={styles.avatarText}>{ini}</Text></View>;
}

export default function MessagesScreen() {
  const { t } = useLanguage();
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await api.get<{ conversations: Conversation[] }>('/api/conversations');
      setConversations(res.conversations);
    } catch {
      toast.show(t.messages.loadError, 'error');
    }
  }

  useFocusEffect(
    useCallback(() => {
      (async () => { setLoading(true); await load(); setLoading(false); })();
    }, [])
  );

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  function openChat(conv: Conversation) {
    router.push({
      pathname: '/chat/[partnerId]',
      params: { partnerId: conv.partnerId, partnerName: conv.partnerName, taskId: conv.taskId ?? '', taskTitle: conv.taskTitle ?? '' },
    });
  }

  const renderConversation = useCallback(({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.row} onPress={() => openChat(item)} activeOpacity={0.7}>
      <Initials name={item.partnerName} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.partnerName} numberOfLines={1}>{item.partnerName}</Text>
          <Text style={styles.time}>{timeAgo(item.lastMessageAt, t.time)}</Text>
        </View>
        {item.taskTitle ? <Text style={styles.taskTitle} numberOfLines={1}>📋 {item.taskTitle}</Text> : null}
        <View style={styles.rowBottom}>
          <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
          {item.unreadCount > 0 ? (
            <View style={styles.badge}><Text style={styles.badgeText}>{item.unreadCount}</Text></View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  ), [t]);

  if (loading) return (
    <View style={styles.container}>
      <ScreenHeader title={t.messages.title} />
      <ActivityIndicator style={styles.center} size="large" color="#2563EB" />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={t.messages.title} />
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title={t.messages.empty}
            subtitle={t.messages.hint}
          />
        }
        renderItem={renderConversation}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, marginTop: 60 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  partnerName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: '#9CA3AF' },
  taskTitle: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMsg: { fontSize: 13, color: '#6B7280', flex: 1, marginRight: 8 },
  badge: { backgroundColor: '#2563EB', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sep: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 76 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
