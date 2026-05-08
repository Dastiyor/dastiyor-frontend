import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/contexts/AuthContext';

export default function RootIndex() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    async function navigate() {
      try {
        const onboardingDone = await SecureStore.getItemAsync('onboarding_done');
        if (!onboardingDone) {
          router.replace('/(onboarding)');
        } else if (user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      } catch {
        router.replace('/(auth)/login');
      }
    }

    navigate();
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Dastiyor</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
});
