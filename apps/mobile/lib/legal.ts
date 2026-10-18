import Constants from 'expo-constants';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export function getPrivacyPolicyUrl(): string {
  return (
    Constants.expoConfig?.extra?.privacyPolicyUrl as string | undefined
    ?? 'https://dastiyor.com/privacy'
  );
}

export function getTermsOfServiceUrl(): string {
  return (
    Constants.expoConfig?.extra?.termsOfServiceUrl as string | undefined
    ?? 'https://dastiyor.com/terms'
  );
}

export const FAQ_URL = 'https://www.dastiyor.com/help';

export async function openInAppBrowser(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      readerMode: false,
      enableBarCollapsing: true,
      dismissButtonStyle: 'close',
    });
  } catch {
    await Linking.openURL(url);
  }
}

export const openPrivacyPolicy = () => openInAppBrowser(getPrivacyPolicyUrl());
export const openTermsOfService = () => openInAppBrowser(getTermsOfServiceUrl());
