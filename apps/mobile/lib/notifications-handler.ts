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

/**
 * The conversation currently on screen, if any. A push for the chat you are
 * already reading is noise -- and on iOS its banner sits over the navigation
 * header, so it also gets in the way of the back button.
 */
let activePartnerId: string | null = null;

export function setActiveConversation(partnerId: string | null) {
  activePartnerId = partnerId;
}

function isForActiveConversation(data: NotificationData | undefined): boolean {
  if (!activePartnerId || !data) return false;
  if (data.partnerId) return String(data.partnerId) === activePartnerId;
  const link = data.link ?? data.url ?? '';
  return link.includes(`userId=${activePartnerId}`);
}

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

  // The OS shows this banner in its own window, so it can neither cover the
  // app's native header nor swallow touches. An in-app banner drawn at the top
  // of the screen does both -- it sat exactly over the header back button.
  Notifications.setNotificationHandler({
    handleNotification: async (notification: { request: { content: { data?: NotificationData } } }) => {
      const mine = isForActiveConversation(notification?.request?.content?.data);
      return {
        // Silent for the chat already open; the message is right there.
        shouldShowAlert: !mine,
        shouldShowBanner: !mine,
        shouldPlaySound: !mine,
        shouldSetBadge: true,
        shouldShowList: true,
      };
    },
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
