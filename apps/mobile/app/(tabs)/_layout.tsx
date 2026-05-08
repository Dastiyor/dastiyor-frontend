import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(active: IoniconName, inactive: IoniconName) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopColor: '#F3F4F6' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.tasks,
          tabBarIcon: icon('home', 'home-outline'),
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
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: icon('person-circle', 'person-circle-outline'),
        }}
      />
    </Tabs>
  );
}
