import { useState, useCallback, useRef, useEffect } from 'react';
import { BackHandler, ToastAndroid, Platform, AppState } from 'react-native';
import { Tabs, useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useNotifPrefs } from '@/contexts/NotifPrefsContext';
import { api } from '@/lib/api-client';
import { BACK_PRESS_TIMEOUT_MS, BADGE_POLL_MS } from '@/lib/constants';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type Conversation = { partnerId: string; partnerName: string; taskId?: string; unreadCount: number; lastMessage: string };

function TabIcon(active: IoniconName, inactive: IoniconName) {
  function Icon({ focused, color, size }: { focused: boolean; color: string; size: number }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
  }
  Icon.displayName = 'TabIcon';
  return Icon;
}

export default function TabLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { showBanner } = useToast();
  const { popupsEnabled } = useNotifPrefs();
  const isCustomer = user?.role === 'CUSTOMER';
  const [unreadMessages, setUnreadMessages] = useState(0);
  const backPressedOnce = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef<number | null>(null);
  const prevConvsRef = useRef<Conversation[]>([]);

  function fetchBadge() {
    if (!user) return;
    api.get<{ conversations: Conversation[] }>('/api/conversations')
      .then((r) => {
        const convs = r.conversations ?? [];
        const total = convs.reduce((s: number, c: Conversation) => s + c.unreadCount, 0);
        setUnreadMessages(total);

        // Show banner when new message arrives (count increased) and not on messages tab
        if (prevCountRef.current !== null && total > prevCountRef.current && popupsEnabled) {
          // Find conversation with newly increased unread count
          const newConv = convs.find((c) => {
            const prev = prevConvsRef.current.find((p) => p.partnerId === c.partnerId);
            return c.unreadCount > (prev?.unreadCount ?? 0);
          }) ?? convs.find((c) => c.unreadCount > 0);

          if (newConv) {
            showBanner(
              newConv.partnerName,
              newConv.lastMessage,
              'chatbubble',
              () => router.push({
                pathname: '/chat/[partnerId]',
                params: { partnerId: newConv.partnerId, partnerName: newConv.partnerName, taskId: newConv.taskId ?? '' },
              }),
            );
          }
        }

        prevCountRef.current = total;
        prevConvsRef.current = convs;
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!user) return;
    fetchBadge();
    intervalRef.current = setInterval(fetchBadge, BADGE_POLL_MS);
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchBadge();
    });
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      appSub.remove();
    };
  }, [user, popupsEnabled]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (backPressedOnce.current) {
          BackHandler.exitApp();
          return true;
        }
        backPressedOnce.current = true;
        ToastAndroid.show(t.common.exitApp, ToastAndroid.SHORT);
        setTimeout(() => { backPressedOnce.current = false; }, BACK_PRESS_TIMEOUT_MS);
        return true;
      });
      return () => sub.remove();
    }, [t])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          borderTopColor: colors.tabBorder,
          backgroundColor: colors.tabBar,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          tabBarIcon: TabIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t.tabs.tasks,
          tabBarIcon: TabIcon('search', 'search-outline'),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: isCustomer ? t.tabs.myTasks : t.tabs.responses,
          tabBarIcon: TabIcon('clipboard', 'clipboard-outline'),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t.tabs.messages,
          tabBarIcon: TabIcon('chatbubbles', 'chatbubbles-outline'),
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: TabIcon('person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}
