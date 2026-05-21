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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

WebBrowser.maybeCompleteAuthSession();

type Role = 'customer' | 'provider';

function passwordStrength(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 8) issues.push('Мин. 8 символов');
  if (!/[A-Za-zА-Яа-яЁё]/.test(pw)) issues.push('Добавьте букву');
  if (!/[0-9]/.test(pw)) issues.push('Добавьте цифру');
  return issues;
}

export default function RegisterScreen() {
  const { register, loginWithGoogle, loginWithApple } = useAuth();
  const { t } = useLanguage();
  const r = t.register;

  const [fullName, setFullName] = useState('');
  const [phoneLocal, setPhoneLocal] = useState(''); // digits only, 9 max
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwIssues, setPwIssues] = useState<string[]>([]);
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

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 9);
    setPhoneLocal(digits);
  }

  function handlePasswordChange(text: string) {
    setPassword(text);
    if (text) setPwIssues(passwordStrength(text));
    else setPwIssues([]);
  }

  async function handleRegister() {
    if (!fullName.trim() || !phoneLocal || !password) {
      Alert.alert(t.common.error, r.errRequired);
      return;
    }
    if (phoneLocal.length !== 9) {
      Alert.alert(t.common.error, r.errPhone);
      return;
    }
    const issues = passwordStrength(password);
    if (issues.length > 0) {
      Alert.alert(t.common.error, issues.join(', '));
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        phone: `+992${phoneLocal}`,
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
        .filter(Boolean).join(' ') || undefined;
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
  const orLabel = r.btn === 'Зарегистрироваться' ? 'или' : r.btn === 'Бақайдгирӣ' ? 'ё' : 'or';
  const googleBtnLabel = r.btn === 'Зарегистрироваться' ? 'Зарегистрироваться с Google'
    : r.btn === 'Бақайдгирӣ' ? 'Бақайдгирӣ бо Google' : 'Sign up with Google';

  const pwOk = password.length > 0 && pwIssues.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthBackground />
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.logo}>Dastiyor</Text>
        <Text style={styles.subtitle}>{r.subtitle}</Text>

        {/* Role selector */}
        <Text style={styles.fieldLabel}>{r.iWant}</Text>
        <View style={styles.roleRow}>
          {(['customer', 'provider'] as Role[]).map((rv) => (
            <TouchableOpacity
              key={rv}
              style={[styles.roleBtn, role === rv && styles.roleBtnActive]}
              onPress={() => setRole(rv)}
            >
              <Text style={styles.roleEmoji}>{rv === 'customer' ? '📋' : '🔧'}</Text>
              <Text style={[styles.roleBtnText, role === rv && styles.roleBtnTextActive]}>
                {rv === 'customer' ? r.postTask : r.doTask}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* OAuth */}
        {googleConfigured && (
          <TouchableOpacity
            style={styles.oauthBtn}
            onPress={() => promptAsync()}
            disabled={!request || googleLoading}
          >
            {googleLoading
              ? <ActivityIndicator color="#374151" />
              : <Text style={styles.oauthBtnText}>{googleBtnLabel}</Text>}
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
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{orLabel}</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        {/* Full name */}
        <Text style={styles.fieldLabel}>{r.fullName}</Text>
        <TextInput
          style={styles.input}
          placeholder={r.fullNamePh}
          placeholderTextColor="#9CA3AF"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          maxLength={100}
        />

        {/* Phone with +992 prefix */}
        <Text style={styles.fieldLabel}>{r.phone}</Text>
        <View style={styles.phoneRow}>
          <View style={styles.phonePrefix}>
            {Platform.OS === 'ios'
              ? <Text style={styles.phonePrefixText}>🇹🇯 +992</Text>
              : <>
                  <Text style={styles.phonePrefixFlag}>TJ</Text>
                  <Text style={styles.phonePrefixText}>+992</Text>
                </>
            }
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder={r.phonePh}
            placeholderTextColor="#9CA3AF"
            value={phoneLocal}
            onChangeText={handlePhoneChange}
            keyboardType="number-pad"
            autoComplete="tel"
            maxLength={9}
          />
        </View>

        {/* Password */}
        <Text style={styles.fieldLabel}>{r.password}</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder={r.passwordHint}
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            maxLength={128}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
        {/* Password feedback */}
        {password.length > 0 && (
          pwOk
            ? <Text style={styles.pwOk}>✓ {r.passwordHint}</Text>
            : pwIssues.map((msg, i) => (
              <Text key={i} style={styles.pwErr}>• {msg}</Text>
            ))
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityLabel={r.btn}
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{r.btn}</Text>}
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
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 40 },

  logo: { fontSize: 36, fontWeight: '800', color: '#2563EB', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 24 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },

  /* Role */
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, alignItems: 'center', backgroundColor: '#fff',
  },
  roleBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  roleEmoji: { fontSize: 26, marginBottom: 6 },
  roleBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '500', textAlign: 'center' },
  roleBtnTextActive: { color: '#2563EB', fontWeight: '700' },

  /* OAuth */
  oauthBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, backgroundColor: '#fff', marginBottom: 10,
  },
  oauthBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  appleBtn: { width: '100%', height: 50, marginBottom: 10 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 13 },

  /* Inputs */
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#111827', marginBottom: 14,
    backgroundColor: '#F9FAFB',
  },

  /* Phone */
  phoneRow: {
    flexDirection: 'row', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, overflow: 'hidden', marginBottom: 14, backgroundColor: '#F9FAFB',
  },
  phonePrefix: {
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: '#F0F4FF',
    borderRightWidth: 1, borderRightColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6,
  },
  phonePrefixFlag: { fontSize: 11, fontWeight: '700', color: '#2563EB', letterSpacing: 0.5 },
  phonePrefixText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  phoneInput: {
    flex: 1, padding: 13, fontSize: 15, color: '#111827',
    backgroundColor: 'transparent',
  },

  /* Password */
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    backgroundColor: '#F9FAFB', marginBottom: 6,
  },
  passwordInput: {
    flex: 1, padding: 13, fontSize: 15, color: '#111827',
    backgroundColor: 'transparent',
  },
  eyeBtn: { paddingHorizontal: 14 },
  pwOk: { fontSize: 12, color: '#059669', fontWeight: '500', marginBottom: 14 },
  pwErr: { fontSize: 12, color: '#DC2626', marginBottom: 2 },

  /* Submit */
  button: {
    backgroundColor: '#2563EB', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 14,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  link: { textAlign: 'center', marginTop: 20, color: '#6B7280', fontSize: 14 },
  linkBold: { color: '#2563EB', fontWeight: '600' },
});
