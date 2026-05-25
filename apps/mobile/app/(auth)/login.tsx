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
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const { locale, t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const googleConfigured = !!(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID &&
    (Platform.OS !== 'ios' || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) &&
    (Platform.OS !== 'android' || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID)
  );

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
    if (!identifier.trim() || !password) {
      Alert.alert(L.errTitle, L.errRequired);
      return;
    }
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert(L.errOauth, (e as Error).message);
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
      if (!credential.identityToken) {
        Alert.alert(L.errOauth, L.errRequired);
        return;
      }
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ') || undefined;
      await loginWithApple(credential.identityToken, credential.email ?? undefined, fullName);
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
      subtitle: 'Войдите в аккаунт', identifierPh: 'Email', passPh: 'Пароль', btn: 'Войти',
      reg: 'Нет аккаунта?', regLink: 'Зарегистрироваться', orDivider: 'или',
      googleBtn: 'Продолжить с Google', appleBtn: 'Войти через Apple',
      errTitle: 'Ошибка', errOauth: 'Ошибка входа',
      errRequired: 'Введите телефон или email и пароль',
      emailLabel: 'Email', passLabel: 'Пароль',
    },
    tj: {
      subtitle: 'Ба ҳисоб ворид шавед', identifierPh: 'Email', passPh: 'Парол', btn: 'Воридшавӣ',
      reg: 'Ҳисоб надоред?', regLink: 'Бақайдгирӣ', orDivider: 'ё',
      googleBtn: 'Тавассути Google', appleBtn: 'Тавассути Apple',
      errTitle: 'Хато', errOauth: 'Хатои воридшавӣ',
      errRequired: 'Телефон ё email ва паролро ворид кунед',
      emailLabel: 'Email', passLabel: 'Парол',
    },
    en: {
      subtitle: 'Sign in to your account', identifierPh: 'Email', passPh: 'Password', btn: 'Sign in',
      reg: "Don't have an account?", regLink: 'Register', orDivider: 'or',
      googleBtn: 'Continue with Google', appleBtn: 'Sign in with Apple',
      errTitle: 'Error', errOauth: 'Login error',
      errRequired: 'Enter phone or email and password',
      emailLabel: 'Email', passLabel: 'Password',
    },
  }[locale];

  const isAppleAvailable = Platform.OS === 'ios';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.header }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={[styles.logo, { color: colors.accent }]}>Dastiyor</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{L.subtitle}</Text>

        {isAppleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={14}
            style={styles.appleBtn}
            onPress={handleAppleLogin}
          />
        )}

        {googleConfigured && (
          <TouchableOpacity
            style={[styles.oauthBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => promptAsync()}
            disabled={!request || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={[styles.oauthBtnText, { color: colors.text }]}>{L.googleBtn}</Text>
            )}
          </TouchableOpacity>
        )}

        {(googleConfigured || isAppleAvailable) && (
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>{L.orDivider}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>
        )}

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{L.emailLabel}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: identifier ? colors.inputBorder : colors.border, color: colors.text }]}
          placeholder={L.identifierPh}
          placeholderTextColor={colors.textTertiary}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="username"
          maxLength={255}
        />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{L.passLabel}</Text>
        <View style={[styles.passwordRow, { backgroundColor: colors.inputBg, borderColor: password ? colors.inputBorder : colors.border }]}>
          <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder={L.passPh}
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            maxLength={128}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityLabel={L.btn}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{L.btn}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotLink} onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={[styles.forgotLinkText, { color: colors.textSecondary }]}>{t.forgotPassword.title}?</Text>
        </TouchableOpacity>

        <Link href="/(auth)/register" style={[styles.link, { color: colors.textSecondary }]}>
          {L.reg} <Text style={[styles.linkBold, { color: colors.accent }]}>{L.regLink}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 36, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 28 },
  oauthBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  oauthBtnText: { fontSize: 15, fontWeight: '600' },
  appleBtn: { width: '100%', height: 52, marginBottom: 10, borderRadius: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderRadius: 14,
    padding: 14, fontSize: 16, marginBottom: 16, letterSpacing: 0,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14, marginBottom: 16,
  },
  passwordInput: {
    flex: 1, fontSize: 16, padding: 14, backgroundColor: 'transparent',
  },
  eyeBtn: { paddingHorizontal: 14 },
  button: {
    backgroundColor: '#2563EB', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  forgotLink: { alignItems: 'center', marginTop: 14 },
  forgotLinkText: { fontSize: 14 },
  link: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  linkBold: { fontWeight: '600' },
  devBtn: { marginTop: 32, alignItems: 'center' },
  devBtnText: { color: '#D1D5DB', fontSize: 12, textDecorationLine: 'underline' },
});
