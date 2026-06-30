import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as storage from '@/lib/storage';
import * as SplashScreen from 'expo-splash-screen';
import { LogoMark, LogoWordmark } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';

export default function RootIndex() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    async function navigate() {
      try {
        const onboardingDone = await storage.getItem('onboarding_done').catch(() => null);
        if (!onboardingDone) {
          router.replace('/(onboarding)');
        } else if (user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      } catch {
        router.replace('/(auth)/login');
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    }

    navigate();
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <LogoMark size={64} color="#2563EB" />
      </View>
      <LogoWordmark size={32} color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
});
