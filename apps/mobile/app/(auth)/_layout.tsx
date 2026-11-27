import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { cancelReturnToTask } from '@/lib/auth-return';

export default function AuthLayout() {
  // Closed without signing in: a later, unrelated sign-in goes to the tabs.
  useEffect(() => cancelReturnToTask, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
