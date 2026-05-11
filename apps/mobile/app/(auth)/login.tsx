import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const { locale } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleConfigured = !!(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID &&
    (Platform.OS !== 'ios' || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) &&
    (Platform.OS !== 'android' || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID)
  );

  // Hook always called (rules of hooks), but uses 'unconfigured' placeholder when env vars missing
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'unconfigured',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'unconfigured',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'unconfigured',
    scopes: ['openid', 'email', 'profile'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const accessToken = response.authentication?.accessToken;
      if (accessToken) {
        setGoogleLoading(true);
        loginWithGoogle(accessToken)
          .then(() => router.replace('/(tabs)'))
          .catch((e) => Alert.alert(L.errOauth, (e as Error).message))
          .finally(() => setGoogleLoading(false));
      }
    }
  }, [response]);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(
        locale === 'en' ? 'Error' : 'Ошибка',
        locale === 'en' ? 'Enter email and password' : locale === 'tj' ? 'Email ва паролро ворид кунед' : 'Введите email и пароль',
      );
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert(
        locale === 'en' ? 'Login failed' : locale === 'tj' ? 'Хатои воридшавӣ' : 'Ошибка входа',
        (e as Error).message,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ') || undefined;
      await loginWithApple(credential.identityToken!, credential.email ?? undefined, fullName);
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(L.errOauth, (e as Error).message);
      }
    }
  }

  async function resetOnboarding() {
    await SecureStore.deleteItemAsync('onboarding_done');
    router.replace('/(onboarding)');
  }

  const L = {
    ru: {
      subtitle: 'Войдите в аккаунт', emailPh: 'Email', passPh: 'Пароль', btn: 'Войти',
      reg: 'Нет аккаунта?', regLink: 'Зарегистрироваться', orDivider: 'или',
      googleBtn: 'Продолжить с Google', appleBtn: 'Продолжить с Apple', errOauth: 'Ошибка входа',
    },
    tj: {
      subtitle: 'Ба ҳисоб ворид шавед', emailPh: 'Email', passPh: 'Парол', btn: 'Воридшавӣ',
      reg: 'Ҳисоб надоред?', regLink: 'Бақайдгирӣ', orDivider: 'ё',
      googleBtn: 'Тавассути Google', appleBtn: 'Тавассути Apple', errOauth: 'Хатои воридшавӣ',
    },
    en: {
      subtitle: 'Sign in to your account', emailPh: 'Email', passPh: 'Password', btn: 'Sign In',
      reg: "Don't have an account?", regLink: 'Register', orDivider: 'or',
      googleBtn: 'Continue with Google', appleBtn: 'Continue with Apple', errOauth: 'Login error',
    },
  }[locale];

  const isAppleAvailable = Platform.OS === 'ios';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Dastiyor</Text>
        <Text style={styles.subtitle}>{L.subtitle}</Text>

        {/* OAuth Buttons */}
        {googleConfigured && (
          <TouchableOpacity
            style={styles.oauthBtn}
            onPress={() => promptAsync()}
            disabled={!request || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <>
                <GoogleIcon />
                <Text style={styles.oauthBtnText}>{L.googleBtn}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isAppleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleBtn}
            onPress={handleAppleLogin}
          />
        )}

        {(googleConfigured || isAppleAvailable) && (
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{L.orDivider}</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder={L.emailPh}
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder={L.passPh}
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{L.btn}</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/register" style={styles.link}>
          {L.reg} <Text style={styles.linkBold}>{L.regLink}</Text>
        </Link>

        {__DEV__ && (
          <TouchableOpacity style={styles.devBtn} onPress={resetOnboarding}>
            <Text style={styles.devBtnText}>DEV: Reset onboarding</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function GoogleIcon() {
  return (
    <View style={{ width: 18, height: 18, marginRight: 8 }}>
      <Text style={{ fontSize: 14 }}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 36, fontWeight: '800', color: '#2563EB', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  oauthBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, backgroundColor: '#fff', marginBottom: 10,
  },
  oauthBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  appleBtn: { width: '100%', height: 50, marginBottom: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#111827', marginBottom: 12, backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: '#2563EB', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { textAlign: 'center', marginTop: 20, color: '#6B7280', fontSize: 14 },
  linkBold: { color: '#2563EB', fontWeight: '600' },
  devBtn: { marginTop: 32, alignItems: 'center' },
  devBtnText: { color: '#D1D5DB', fontSize: 12, textDecorationLine: 'underline' },
});
