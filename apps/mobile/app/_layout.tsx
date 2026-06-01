import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { NotifPrefsProvider } from '@/contexts/NotifPrefsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';

SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { colors, isDark } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackTitle: 'Назад',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="task/[id]" options={{ title: 'Задание' }} />
      <Stack.Screen name="respond/[id]" options={{ title: 'Откликнуться', presentation: 'modal' }} />
      <Stack.Screen name="chat/[partnerId]" options={{}} />
      <Stack.Screen name="create-task" options={{ title: 'Новое задание', presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="review/[taskId]" options={{ title: 'Оставить отзыв', presentation: 'modal' }} />
      <Stack.Screen name="provider/[id]" options={{ title: 'Профиль' }} />
      <Stack.Screen name="change-password" options={{ title: 'Смена пароля' }} />
      <Stack.Screen name="change-email" options={{ title: 'Изменить email' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Редактировать профиль', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
    <LanguageProvider>
      <ErrorBoundary>
        <ToastProvider>
        <NotifPrefsProvider>
        <AuthProvider>
          <ThemedStack />
          <StatusBar style="auto" />
          <OfflineBanner />
        </AuthProvider>
        </NotifPrefsProvider>
        </ToastProvider>
      </ErrorBoundary>
    </LanguageProvider>
    </ThemeProvider>
  );
}
