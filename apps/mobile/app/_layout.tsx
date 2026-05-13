import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ToastProvider>
        <AuthProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false, animation: 'none' }} />
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
          <OfflineBanner />
        </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
