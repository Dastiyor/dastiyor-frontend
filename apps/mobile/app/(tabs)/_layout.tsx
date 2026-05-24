import { useState, useCallback, useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';
import { Tabs, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api-client';
import { BACK_PRESS_TIMEOUT_MS } from '@/lib/constants';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(active: IoniconName, inactive: IoniconName) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const isCustomer = user?.role === 'CUSTOMER';
  const [unreadMessages, setUnreadMessages] = useState(0);
  const backPressedOnce = useRef(false);
  const lastFetchRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      const now = Date.now();
      if (now - lastFetchRef.current < 30_000) return;
      lastFetchRef.current = now;
      api.get<{ conversations: { unreadCount: number }[] }>('/api/conversations')
        .then((r) => setUnreadMessages(r.conversations.reduce((s, c) => s + c.unreadCount, 0)))
        .catch(() => {});
    }, [user])
  );

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
    }, [])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
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
          tabBarIcon: icon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t.tabs.tasks,
          tabBarIcon: icon('search', 'search-outline'),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: isCustomer ? t.tabs.myTasks : t.tabs.responses,
          tabBarIcon: icon('clipboard', 'clipboard-outline'),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t.tabs.messages,
          tabBarIcon: icon('chatbubbles', 'chatbubbles-outline'),
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: icon('person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}
