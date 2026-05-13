import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function RootIndex() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    async function navigate() {
      const onboardingDone = await SecureStore.getItemAsync('onboarding_done').catch(() => null);
      SplashScreen.hideAsync().catch(() => {});
      if (!onboardingDone) {
        router.replace('/(onboarding)');
      } else if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }

    navigate();
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Ionicons name="layers" size={52} color="#4648d4" />
      </View>
      <Text style={styles.logo}>Dastiyor</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4648d4',
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
  logo: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
});
