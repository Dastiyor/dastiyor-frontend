import { useState, useCallback, useRef, useEffect } from 'react';
import { BackHandler, ToastAndroid, Platform, AppState } from 'react-native';
import { Tabs, useFocusEffect, router } from 'expo-router';
import { Icon, type IconName } from '@/components/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifPrefs } from '@/contexts/NotifPrefsContext';
import { api } from '@/lib/api-client';
import { TabBar } from '@/components/TabBar';
import { BACK_PRESS_TIMEOUT_MS, BADGE_POLL_MS } from '@/lib/constants';

// Each role's main screen right after Home. Customers hire, so the task feed drops off their bar
// (Home's search and "See all" still open it) to make room for the "+" in the middle.
const CUSTOMER_TABS = ['index', 'professionals', 'my', 'messages'];
const PROVIDER_TABS = ['index', 'tasks', 'my', 'messages', 'professionals'];

type Conversation = { partnerId: string; partnerName: string; taskId?: string; unreadCount: number; lastMessage: string };

// Thin line icon at rest, solid (Iconsax "Bold") when active.
function TabIcon(name: IconName) {
  function TabGlyph({ focused, color, size }: { focused: boolean; color: string; size: number }) {
    return <Icon name={name} size={size} color={color} variant={focused ? 'Bold' : 'Linear'} />;
  }
  TabGlyph.displayName = 'TabIcon';
  return TabGlyph;
}

export default function TabLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { popupsEnabled } = useNotifPrefs();
  // Guests are shown the customer-flavoured label: signing up as a customer is
  // the default path, and tapping it routes to registration either way. Reading
  // this as `=== 'CUSTOMER'` left a logged-out visitor looking at "Responses".
  const isCustomer = !user || user.role === 'CUSTOMER';
  const [unreadMessages, setUnreadMessages] = useState(0);

  // ponytail: account-only tabs open the dismissable auth modal for guests instead of gating the whole app.
  function guardTabPress(e: { preventDefault: () => void }) {
    if (user) return;
    e.preventDefault();
    router.push('/(auth)/register');
  }
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

        prevCountRef.current = total;
        prevConvsRef.current = convs;
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!user) return;

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchBadge, BADGE_POLL_MS);
    };
    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    fetchBadge();
    startPolling();

    // Pause polling while backgrounded; resume + refresh on foreground.
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchBadge();
        startPolling();
      } else {
        stopPolling();
      }
    });
    return () => {
      stopPolling();
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
      tabBar={(props) => (
        <TabBar
          {...props}
          order={isCustomer ? CUSTOMER_TABS : PROVIDER_TABS}
          onCreate={isCustomer ? () => router.push(user ? '/create-task' : '/(auth)/register') : undefined}
          createLabel={t.my.createTask}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          tabBarIcon: TabIcon('home'),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t.tabs.tasks,
          tabBarIcon: TabIcon('search'),
        }}
      />
      <Tabs.Screen
        name="professionals"
        options={{
          title: t.tabs.professionals,
          tabBarIcon: TabIcon('people'),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: isCustomer ? t.tabs.myTasks : t.tabs.responses,
          tabBarIcon: TabIcon('clipboard'),
        }}
        listeners={{ tabPress: guardTabPress }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t.tabs.messages,
          tabBarIcon: TabIcon('chatbubbles'),
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
        }}
        listeners={{ tabPress: guardTabPress }}
      />
    </Tabs>
  );
}
