import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  AppState,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { POLL_INTERVAL_MS } from '@/lib/constants';
import { formatTime, formatDate } from '@/lib/intl';
import type { ChatMessage } from '@dastiyor/types';

export default function ChatScreen() {
  const { partnerId, partnerName, taskId, taskTitle } = useLocalSearchParams<{ partnerId: string; partnerName: string; taskId?: string; taskTitle?: string }>();
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAtBottomRef = useRef(true);
  const pollErrorCount = useRef(0);
  const pollDelayRef = useRef(POLL_INTERVAL_MS);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => { navigation.setOptions({ title: partnerName ?? t.chat.empty }); }, [partnerName]);

  async function fetchMessages(isInitial = false) {
    const params = new URLSearchParams({ userId: partnerId });
    if (taskId) params.set('taskId', taskId);
    try {
      const res = await api.get<{ messages: ChatMessage[] }>(`/api/messages?${params}`);
      setMessages(res.messages);
      pollErrorCount.current = 0;
      pollDelayRef.current = POLL_INTERVAL_MS;
      if (isInitial) setLoadError(false);
    } catch {
      if (isInitial) {
        setLoadError(true);
        return;
      }
      pollErrorCount.current += 1;
      if (pollErrorCount.current === 1) {
        toast.show(t.chat.loadError, 'error');
      }
      // exponential backoff: 4s → 8s → 16s → 30s cap
      pollDelayRef.current = Math.min(pollDelayRef.current * 2, 30_000);
      if (pollErrorCount.current >= 5) return;
    }
  }

  function schedulePoll() {
    pollRef.current = setTimeout(async () => {
      if (appStateRef.current === 'active') {
        await fetchMessages(false);
      }
      if (pollErrorCount.current < 5) schedulePoll();
    }, pollDelayRef.current);
  }

  useFocusEffect(
    useCallback(() => {
      pollErrorCount.current = 0;
      pollDelayRef.current = POLL_INTERVAL_MS;
      (async () => { setLoading(true); await fetchMessages(true); setLoading(false); schedulePoll(); })();

      const sub = AppState.addEventListener('change', (next) => {
        appStateRef.current = next;
      });

      return () => {
        if (pollRef.current) clearTimeout(pollRef.current);
        sub.remove();
      };
    }, [partnerId, taskId])
  );

  useEffect(() => {
    if (messages.length > 0 && isAtBottomRef.current) {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    }
    return () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current); };
  }, [messages.length]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    isAtBottomRef.current = distanceFromBottom < 60;
  }

  async function sendMessage() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    isAtBottomRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post('/api/messages', { receiverId: partnerId, content, taskId: taskId || undefined });
      await fetchMessages(false);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setText(content);
      toast.show(t.chat.sendError, 'error');
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item, index }: { item: ChatMessage; index: number }) {
    const own = item.senderId === user?.id;
    const prev = messages[index - 1];
    const next = messages[index + 1];
    const showDate = !prev || new Date(item.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
    const isLastInGroup = !next || next.senderId !== item.senderId;
    const marginBottom = isLastInGroup ? 12 : 3;

    return (
      <View key={item.id}>
        {showDate ? (
          <Text style={styles.dateSep}>
            {formatDate(item.createdAt, locale, { day: 'numeric', month: 'long' })}
          </Text>
        ) : null}
        <View style={[styles.msgRow, own ? styles.msgRowOwn : styles.msgRowOther, { marginBottom }]}>
          <View style={[styles.bubble, own ? styles.bubbleOwn : [styles.bubbleOther, { backgroundColor: colors.surface }]]}>
            {item.content ? <Text style={[styles.bubbleText, own ? styles.bubbleTextOwn : [styles.bubbleTextOther, { color: colors.text }]]}>{item.content}</Text> : null}
            <Text style={[styles.bubbleTime, own ? styles.bubbleTimeOwn : styles.bubbleTimeOther]}>{formatTime(item.createdAt, locale)}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Stack header height = status bar + 44pt nav bar on iOS
  const iosOffset = insets.top + 44;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? iosOffset : 0}>
      {taskTitle ? <View style={[styles.taskBar, { backgroundColor: colors.iconBg, borderBottomColor: colors.border }]}><Text style={styles.taskBarText} numberOfLines={1}>{taskTitle}</Text></View> : null}

      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color="#2563EB" />
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{t.chat.loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchMessages(true).finally(() => setLoading(false)); }}>
            <Text style={styles.retryBtnText}>{t.common.errorRetry}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textTertiary }]}>{t.chat.empty}</Text>}
          onScroll={handleScroll}
          scrollEventThrottle={100}
        />
      )}

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
          placeholder={t.chat.placeholder}
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!text.trim() || sending} accessibilityRole="button" accessibilityLabel={t.chat.placeholder}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendIcon}>↑</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, marginTop: 60 },
  taskBar: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#DBEAFE' },
  taskBarText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  list: { padding: 12, paddingBottom: 8 },
  dateSep: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginVertical: 12 },
  msgRow: { flexDirection: 'row' },
  msgRowOwn: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, paddingBottom: 4 },
  bubbleOwn: { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextOwn: { color: '#fff' },
  bubbleTextOther: {},
  bubbleTime: { fontSize: 10, marginTop: 2, textAlign: 'right' },
  bubbleTimeOwn: { color: 'rgba(255,255,255,0.65)' },
  bubbleTimeOther: { color: '#9CA3AF' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#93C5FD' },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 15 },
  errorText: { color: '#6B7280', fontSize: 15, marginBottom: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
