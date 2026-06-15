import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { NotifPrefsProvider } from '@/contexts/NotifPrefsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { initErrorReporting } from '@/lib/errorReporting';
import { initAnalytics, track, AnalyticsEvent } from '@/lib/analytics';
import { initNotificationHandlers } from '@/lib/notifications-handler';

SplashScreen.preventAutoHideAsync();
initErrorReporting();
initAnalytics();
track(AnalyticsEvent.AppOpen);

function ThemedStack() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const nav = t.navigation;

  useEffect(() => {
    initNotificationHandlers().catch(() => {});
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackTitle: nav.back,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="task/[id]" options={{ title: nav.task }} />
      <Stack.Screen name="respond/[id]" options={{ title: nav.respond, presentation: 'modal' }} />
      <Stack.Screen name="chat/[partnerId]" options={{}} />
      <Stack.Screen name="create-task" options={{ title: nav.createTask, presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="review/[taskId]" options={{ title: nav.review, presentation: 'modal' }} />
      <Stack.Screen name="provider/[id]" options={{ title: nav.provider }} />
      <Stack.Screen name="change-password" options={{ title: nav.changePassword }} />
      <Stack.Screen name="change-email" options={{ title: nav.changeEmail }} />
      <Stack.Screen name="edit-profile" options={{ title: nav.editProfile, presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
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
    </SafeAreaProvider>
  );
}
