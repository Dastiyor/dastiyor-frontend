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

export function navigateFromNotificationData(data: NotificationData | undefined) {
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

/**
 * Called when a push arrives while the app is open, so the in-app banner can
 * show it. The OS banner is suppressed in the foreground (see below), and the
 * unread poll only notices up to 20s later, so without this a foregrounded
 * push would appear late or not at all.
 */
type ForegroundListener = (title: string, body: string, data?: NotificationData) => void;
let _onForeground: ForegroundListener | null = null;

export function setForegroundNotificationListener(cb: ForegroundListener | null) {
  _onForeground = cb;
}

/** Register notification handlers. Idempotent. Safe when native module absent. */
export async function initNotificationHandlers(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const Notifications = loadNotificationsModule();
  if (!Notifications?.setNotificationHandler) return;

  // This handler only runs for notifications that arrive while the app is
  // OPEN; the OS shows backgrounded ones regardless. Showing the system banner
  // here duplicated the app's own in-app banner -- the same message twice.
  // Suppress the system banner in the foreground and let the in-app one handle
  // it, while keeping sound, badge and the notification list intact.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: false,
      shouldShowList: true,
    }),
  });

  Notifications.addNotificationReceivedListener?.(
    (notification: { request: { content: { title?: string; body?: string; data?: NotificationData } } }) => {
      const c = notification.request.content;
      _onForeground?.(c.title ?? '', c.body ?? '', c.data);
    },
  );

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
