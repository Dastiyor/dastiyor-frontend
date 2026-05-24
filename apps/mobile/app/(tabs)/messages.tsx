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
import { useTheme } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { Avatar } from '@/components/Avatar';
import { useToast } from '@/contexts/ToastContext';
import type { Conversation } from '@dastiyor/types';

export default function MessagesScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
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

  const renderConversation = useCallback(({ item }: { item: Conversation }) => {
    const badge = item.partnerRole;
    return (
      <TouchableOpacity style={[styles.row, { backgroundColor: colors.surface }]} onPress={() => openChat(item)} activeOpacity={0.7}>
        <Avatar name={item.partnerName} avatarUrl={item.partnerAvatar} size={52} />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.partnerName, { color: colors.text }]} numberOfLines={1}>{item.partnerName}</Text>
            {badge ? (
              <View style={[styles.roleBadge, { backgroundColor: colors.iconBg }]}>
                <Text style={[styles.roleBadgeText, { color: colors.accent }]}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.rowBottom}>
            <Text style={[styles.lastMsg, { color: colors.textSecondary }]} numberOfLines={2}>{item.lastMessage}</Text>
            {item.unreadCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t.messages.title} />
      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color="#2563EB" />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <EmptyState icon="chatbubbles-outline" title={t.messages.empty} subtitle={t.messages.hint} />
          }
          renderItem={renderConversation}
          ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 76 }]} />}
          ListFooterComponent={conversations.length > 0 ? (
            <View style={[styles.footer, { backgroundColor: colors.bg }]}>
              <Text style={[styles.footerText, { color: colors.textTertiary }]}>{t.messages.noMore}</Text>
            </View>
          ) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, marginTop: 60 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  partnerName: { fontSize: 15, fontWeight: '700', flex: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, flexShrink: 0 },
  roleBadgeText: { fontSize: 12, fontWeight: '600' },
  rowBottom: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  lastMsg: { fontSize: 13, flex: 1, marginRight: 8 },
  badge: { borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sep: { height: 1 },
  footer: { paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
  footerText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
