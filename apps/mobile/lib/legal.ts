import Constants from 'expo-constants';
import { Linking } from 'react-native';

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
  await Linking.openURL(getPrivacyPolicyUrl());
}

export async function openTermsOfService(): Promise<void> {
  await Linking.openURL(getTermsOfServiceUrl());
}
