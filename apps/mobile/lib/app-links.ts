import { Linking, Platform, Share } from 'react-native';

// App Store Connect app id (eas.json submit.production.ios.ascAppId) and the Play package.
const IOS_APP_ID = '6786128785';
const ANDROID_PACKAGE = 'com.dastiyor.app';

export function storeReviewUrl(): string {
  return Platform.OS === 'ios'
    ? `itms-apps://apps.apple.com/app/id${IOS_APP_ID}?action=write-review`
    : `market://details?id=${ANDROID_PACKAGE}`;
}

// ponytail: store deep link instead of expo-store-review, which is a native module and needs a new build.
export async function openStoreReview(): Promise<void> {
  try {
    await Linking.openURL(storeReviewUrl());
  } catch {
    await Linking.openURL(
      Platform.OS === 'ios'
        ? `https://apps.apple.com/app/id${IOS_APP_ID}?action=write-review`
        : `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
    );
  }
}

export const SHARE_URL = 'https://www.dastiyor.com/mobile-app';

// iOS builds the share sheet's link preview (title, image, site icon) only from `url`; a link
// inside `message` is just text, so the sheet showed a plain text icon. Android has no `url`
// and takes the link in the message.
export function shareApp(message: string) {
  const content = Platform.OS === 'ios'
    ? { message, url: SHARE_URL }
    : { message: `${message} ${SHARE_URL}` };
  return Share.share(content).catch(() => {});
}

type DeviceInfo = { version: string; platform: string; osVersion: string; userId?: string };

/** mailto: link to support with the details we always end up asking for. */
export function reportMailto(email: string, subject: string, prompt: string, d: DeviceInfo): string {
  const footer = `App ${d.version} · ${d.platform} ${d.osVersion}${d.userId ? ` · user ${d.userId}` : ''}`;
  const q = new URLSearchParams({ subject, body: `${prompt}\n\n\n—\n${footer}` });
  // URLSearchParams writes spaces as '+', which mail apps show literally.
  return `mailto:${email}?${q.toString().replace(/\+/g, '%20')}`;
}
