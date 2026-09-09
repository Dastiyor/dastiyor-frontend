import { Platform } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Both platforms authenticate against the *web* ("server") client id. Android
 * identifies the app by package name + signing SHA-1 registered on its own
 * OAuth client instead of by a client id in code, which is why
 * EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID is not read here — that client still has
 * to exist in Google Cloud, it just isn't passed to the SDK.
 */
export const googleConfigured = !!(webClientId && (Platform.OS !== 'ios' || iosClientId));

let configured = false;

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId,
    iosClientId,
    scopes: ['openid', 'email', 'profile'],
  });
  configured = true;
}

/**
 * Opens the native account picker and returns a Google access token, or `null`
 * when the user dismissed it. The token goes to `/api/auth/{google}/mobile`,
 * which resolves it against Google's userinfo endpoint.
 */
export async function signInWithGoogle(): Promise<string | null> {
  ensureConfigured();
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const { accessToken } = await GoogleSignin.getTokens();
    return accessToken;
  } catch (e) {
    if (
      isErrorWithCode(e) &&
      (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)
    ) {
      return null;
    }
    throw e;
  }
}

/**
 * Clears the cached Google session so the next sign-in shows the account
 * picker again — without it, logging out and back in silently reuses the last
 * account and there is no way to switch.
 */
export async function signOutFromGoogle(): Promise<void> {
  if (!googleConfigured) return;
  ensureConfigured();
  try {
    await GoogleSignin.signOut();
  } catch {
    // Never block app logout on the Google SDK.
  }
}
