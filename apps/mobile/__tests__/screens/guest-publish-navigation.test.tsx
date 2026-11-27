import React from 'react';
import { Text, View } from 'react-native';
import { act } from '@testing-library/react-native';
import { Stack, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import AuthLayout from '@/app/(auth)/_layout';
import { leaveAuth, noteSignedInRole, returnToTaskAfterSignIn } from '@/lib/auth-return';
import { replaceFromModal } from '@/lib/nav';

jest.unmock('expo-router');
jest.unmock('react-native-safe-area-context');

const page = (name: string) => function Page() { return <View><Text>{name}</Text></View>; };

// The real router, auth layout and helpers, with the screens stubbed.
const routes = {
  _layout: () => (
    <Stack>
      <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create-task" options={{ presentation: 'modal' }} />
    </Stack>
  ),
  '(tabs)/index': page('home'),
  'create-task': page('task form'),
  '(auth)/_layout': AuthLayout,
  '(auth)/register': page('register'),
  '(auth)/login': page('login'),
  '(auth)/forgot-password': page('forgot password'),
  '(auth)/reset-password': page('reset password'),
};

let app: ReturnType<typeof renderRouter>;

/** What the form does for a guest who presses Publish. */
async function guestPublishes() {
  app = renderRouter(routes, { initialUrl: '/' });
  act(() => router.push('/create-task'));
  act(() => { returnToTaskAfterSignIn(); replaceFromModal('/(auth)/register'); });
  expect(app.getPathname()).toBe('/register');
}

describe('guest publishing a task', () => {
  it('comes back to the form after signing up', async () => {
    await guestPublishes();
    act(() => { noteSignedInRole('CUSTOMER'); leaveAuth(); });
    expect(app.getPathname()).toBe('/create-task');
    act(() => router.back());
    expect(app.getPathname()).toBe('/');
  });

  it('comes back after switching to the sign-in screen', async () => {
    await guestPublishes();
    act(() => router.push('/(auth)/login'));
    act(() => { noteSignedInRole('CUSTOMER'); leaveAuth(); });
    expect(app.getPathname()).toBe('/create-task');
  });

  it('goes home on a later sign-in if this one was closed', async () => {
    await guestPublishes();
    act(() => router.back()); // the close button
    expect(app.getPathname()).toBe('/');
    act(() => router.push('/(auth)/login'));
    act(() => { noteSignedInRole('CUSTOMER'); leaveAuth(); });
    expect(app.getPathname()).toBe('/');
  });
});
