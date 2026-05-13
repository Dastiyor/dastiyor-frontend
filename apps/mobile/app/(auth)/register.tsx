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
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { AuthBackground } from '@/components/AuthBackground';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

WebBrowser.maybeCompleteAuthSession();

type Role = 'customer' | 'provider';

export default function RegisterScreen() {
  const { register, loginWithGoogle, loginWithApple } = useAuth();
  const { t } = useLanguage();
  const r = t.register;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
        loginWithGoogle(accessToken, role)
          .then(async () => {
            await SecureStore.setItemAsync('onboarding_done', '1');
            router.replace('/(tabs)');
          })
          .catch((e) => Alert.alert(r.errRegister, (e as Error).message))
          .finally(() => setGoogleLoading(false));
      }
    }
  }, [response]);

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert(t.common.error, r.errRequired);
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
        role,
      });
      await SecureStore.setItemAsync('onboarding_done', '1');
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert(r.errRegister, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleRegister() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullNameStr = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ') || undefined;
      await loginWithApple(credential.identityToken!, credential.email ?? undefined, fullNameStr, role);
      await SecureStore.setItemAsync('onboarding_done', '1');
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(r.errRegister, (e as Error).message);
      }
    }
  }

  const isAppleAvailable = Platform.OS === 'ios';
  const googleBtnLabel = t.register.btn === 'Зарегистрироваться' ? 'Зарегистрироваться с Google' :
    t.register.btn === 'Бақайдгирӣ' ? 'Бақайдгирӣ бо Google' : 'Sign up with Google';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthBackground />
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={styles.logo}>Dastiyor</Text>
        <Text style={styles.subtitle}>{r.subtitle}</Text>

        <Text style={styles.label}>{r.iWant}</Text>
        <View style={styles.roleRow}>
          {(['customer', 'provider'] as Role[]).map((rv) => (
            <TouchableOpacity
              key={rv}
              style={[styles.roleBtn, role === rv && styles.roleBtnActive]}
              onPress={() => setRole(rv)}
            >
              <Text style={[styles.roleBtnText, role === rv && styles.roleBtnTextActive]}>
                {rv === 'customer' ? r.postTask : r.doTask}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
              <Text style={styles.oauthBtnText}>{googleBtnLabel}</Text>
            )}
          </TouchableOpacity>
        )}

        {isAppleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleBtn}
            onPress={handleAppleRegister}
          />
        )}

        {(googleConfigured || isAppleAvailable) && (
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t.register.btn === 'Зарегистрироваться' ? 'или' : t.register.btn === 'Бақайдгирӣ' ? 'ё' : 'or'}</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder={r.fullName}
          placeholderTextColor="#9CA3AF"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          maxLength={100}
        />

        <TextInput
          style={styles.input}
          placeholder="Email *"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          maxLength={255}
        />

        <TextInput
          style={styles.input}
          placeholder={r.phone}
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={20}
        />

        <TextInput
          style={styles.input}
          placeholder={r.password}
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          maxLength={128}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityLabel={r.btn}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{r.btn}</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          {r.hasAccount} <Text style={styles.linkBold}>{r.loginLink}</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 36, fontWeight: '800', color: '#2563EB', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 14, color: '#374151', fontWeight: '600', marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  roleBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  roleBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  roleBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500', textAlign: 'center' },
  roleBtnTextActive: { color: '#2563EB', fontWeight: '700' },
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
});
