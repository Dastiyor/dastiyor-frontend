import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { NotifPrefsProvider } from '@/contexts/NotifPrefsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { DialogHost } from '@/lib/dialog';
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

  // A Google/Apple account has no phone until it verifies one, and the server
  // says so on the user. Hold it on verify-phone from wherever it lands --
  // sign-in, cold start, or backing out of the screen.
  const { user } = useAuth();
  const segments = useSegments();
  const mustVerifyPhone = !!user?.phoneVerificationRequired;
  const onVerifyPhone = (segments[0] as string | undefined) === 'verify-phone';
  useEffect(() => {
    if (mustVerifyPhone && !onVerifyPhone) router.replace({ pathname: '/verify-phone', params: { forced: '1' } });
  }, [mustVerifyPhone, onVerifyPhone]);

  return (
    <>
    {/* Follow the in-app theme, not the system one: Info.plist pins the system
        appearance to Light, so style="auto" drew dark icons on the dark header. */}
    <StatusBar style={isDark ? 'light' : 'dark'} />
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
      <Stack.Screen name="(auth)" options={{ headerShown: false, presentation: 'modal' }} />
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
      {/* Forced (see the guard above) it is a plain card with no way back. As a
          modal, the replace to the tabs afterwards left them drawn inside the
          sheet. Keyed on the route param, which unlike the user flag does not
          change while the screen is mounted. */}
      <Stack.Screen
        name="verify-phone"
        options={({ route }) => {
          const forced = (route.params as { forced?: string } | undefined)?.forced === '1';
          return {
            title: nav.verifyPhone,
            presentation: forced ? 'card' : 'modal',
            gestureEnabled: !forced,
            headerBackVisible: !forced,
          };
        }}
      />
    </Stack>
    </>
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
          <OfflineBanner />
          <DialogHost />
        </AuthProvider>
        </NotifPrefsProvider>
        </ToastProvider>
      </ErrorBoundary>
    </LanguageProvider>
    </ThemeProvider>
    </SafeAreaProvider>
  );
}
