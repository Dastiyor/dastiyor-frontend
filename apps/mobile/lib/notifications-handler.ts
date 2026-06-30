/**
 * Expo push notification handlers — foreground display + tap navigation.
 */

import { router } from 'expo-router';

type NotificationData = {
  taskId?: string;
  partnerId?: string;
  link?: string;
  url?: string;
};

function navigateFromNotificationData(data: NotificationData | undefined) {
  if (!data) return;

  if (data.taskId) {
    router.push(`/task/${data.taskId}`);
    return;
  }

  if (data.partnerId) {
    router.push({
      pathname: '/chat/[partnerId]',
      params: { partnerId: String(data.partnerId) },
    });
    return;
  }

  const link = data.link ?? data.url;
  if (link) {
    const taskMatch = link.match(/\/tasks\/([^/?]+)/);
    if (taskMatch?.[1]) {
      router.push(`/task/${taskMatch[1]}`);
      return;
    }
    const msgMatch = link.match(/\/conversations\/([^/?]+)/) ?? link.match(/userId=([^&]+)/);
    if (msgMatch?.[1]) {
      router.push({
        pathname: '/chat/[partnerId]',
        params: { partnerId: msgMatch[1] },
      });
      return;
    }
    if (link.includes('/notifications')) {
      router.push('/notifications');
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadNotificationsModule(): any | null {
  try {
    // Literal require so Metro bundles it and Hermes can compile the release build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
}

let initialized = false;

/** Register notification handlers. Idempotent. Safe when native module absent. */
export async function initNotificationHandlers(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const Notifications = loadNotificationsModule();
  if (!Notifications?.setNotificationHandler) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Cold start from notification tap
  const last = await Notifications.getLastNotificationResponseAsync?.();
  if (last?.notification?.request?.content?.data) {
    setTimeout(() => {
      navigateFromNotificationData(last.notification.request.content.data as NotificationData);
    }, 500);
  }

  Notifications.addNotificationResponseReceivedListener?.(
    (response: { notification: { request: { content: { data?: NotificationData } } } }) => {
      navigateFromNotificationData(response.notification.request.content.data);
    },
  );
}

/** Test-only reset. */
export function __resetNotificationHandlersForTests() {
  initialized = false;
}
