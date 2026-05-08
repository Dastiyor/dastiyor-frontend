import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="task/[id]" options={{ title: 'Задание', headerBackTitle: 'Назад' }} />
        <Stack.Screen name="respond/[id]" options={{ title: 'Откликнуться', headerBackTitle: 'Назад', presentation: 'modal' }} />
        <Stack.Screen name="chat/[partnerId]" options={{ headerBackTitle: 'Назад' }} />
        <Stack.Screen name="create-task" options={{ title: 'Новое задание', headerBackTitle: 'Назад', presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ title: 'Уведомления', headerBackTitle: 'Назад' }} />
        <Stack.Screen name="review/[taskId]" options={{ title: 'Оставить отзыв', headerBackTitle: 'Назад', presentation: 'modal' }} />
        <Stack.Screen name="provider/[id]" options={{ title: 'Профиль', headerBackTitle: 'Назад' }} />
        <Stack.Screen name="change-password" options={{ title: 'Смена пароля', headerBackTitle: 'Назад' }} />
        <Stack.Screen name="edit-profile" options={{ title: 'Редактировать профиль', headerBackTitle: 'Назад', presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
