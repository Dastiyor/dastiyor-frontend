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

export async function openPrivacyPolicy(): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(getPrivacyPolicyUrl(), {
      readerMode: false,
      enableBarCollapsing: true,
      dismissButtonStyle: 'close',
    });
  } catch {
    await Linking.openURL(getPrivacyPolicyUrl());
  }
}

export async function openTermsOfService(): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(getTermsOfServiceUrl(), {
      readerMode: false,
      enableBarCollapsing: true,
      dismissButtonStyle: 'close',
    });
  } catch {
    await Linking.openURL(getTermsOfServiceUrl());
  }
}
