import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

type AppState = 'loading' | 'onboarding' | 'auth' | 'app';

function RootLayoutNav() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    async function bootstrap() {
      try {
        const onboardingDone = await SecureStore.getItemAsync('onboarding_done');
        if (!onboardingDone) {
          setAppState('onboarding');
        } else if (user) {
          setAppState('app');
        } else {
          setAppState('auth');
        }
      } catch {
        setAppState('auth');
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    if (!authLoading) {
      bootstrap();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (appState === 'loading') return;

    const inOnboarding = segments[0] === '(onboarding)';
    const inAuth = segments[0] === '(auth)';
    const inTabs = segments[0] === '(tabs)';

    if (appState === 'onboarding' && !inOnboarding) {
      router.replace('/(onboarding)');
    } else if (appState === 'auth' && !inAuth) {
      router.replace('/(auth)/login');
    } else if (appState === 'app' && !inTabs) {
      router.replace('/(tabs)');
    }
  }, [appState, segments]);

  useEffect(() => {
    if (appState === 'loading') return;
    if (user && appState !== 'app') setAppState('app');
    if (!user && appState === 'app') setAppState('auth');
  }, [user, appState]);

  if (appState === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <>
      <Stack>
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
