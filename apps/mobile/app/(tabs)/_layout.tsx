import { Tabs } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2563EB' }}>
      <Tabs.Screen name="index" options={{ title: 'Задания' }} />
      <Tabs.Screen name="my" options={{ title: isCustomer ? 'Мои задания' : 'Мои отклики' }} />
      <Tabs.Screen name="messages" options={{ title: 'Сообщения' }} />
      <Tabs.Screen name="profile" options={{ title: 'Профиль' }} />
    </Tabs>
  );
}
