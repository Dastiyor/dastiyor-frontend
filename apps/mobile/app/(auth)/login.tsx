import { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/AppText';
import { Link, router } from 'expo-router';
import { goBack, replaceFromModal } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { AUTH_CLOSE_SIZE, useAuthTopSpacing } from '@/lib/authLayout';
import { useKeyboardAwareScroll } from '@/lib/useKeyboardAwareScroll';
import { Icon } from '@/components/Icon';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { GoogleIcon } from '@/components/GoogleIcon';
import { FieldError, FIELD_ERROR_COLOR } from '@/components/FieldError';
import { googleConfigured, signInWithGoogle } from '@/lib/google-signin';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LogoWordmark } from '@/components/Logo';
import { Alert } from '@/lib/dialog';
import { GradientButton, Input } from '@/components/Premium';
import { LanguageButton } from '@/components/LanguageButton';
import { RoleChoice, type SignupRole } from '@/components/RoleChoice';
import * as storage from '@/lib/storage';

/** A Google / Apple sign-in for someone with no account yet, held until they pick a role. */
type PendingOAuth =
  | { kind: 'google'; accessToken: string }
  | { kind: 'apple'; identityToken: string; email?: string; fullName?: string };

export default function LoginScreen() {
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const top = useAuthTopSpacing({ closeButton: true, keyboardOpen: keyboardOffset > 0 });
  const kbScroll = useKeyboardAwareScroll();
  const L = t.login;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  // Empty fields found on submit, shown in red under each field (no alert).
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Google / Apple on the login screen can also be a first visit: the account is
  // then created only once the person picks customer or provider.
  const [pendingOAuth, setPendingOAuth] = useState<PendingOAuth | null>(null);
  const [busyRole, setBusyRole] = useState<SignupRole | null>(null);

  async function handlePickRole(role: SignupRole) {
    if (!pendingOAuth || busyRole) return;
    setBusyRole(role);
    try {
      if (pendingOAuth.kind === 'google') {
        await loginWithGoogle(pendingOAuth.accessToken, role);
      } else {
        await loginWithApple(pendingOAuth.identityToken, pendingOAuth.email, pendingOAuth.fullName, role);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await storage.setItem('onboarding_done', '1');
      replaceFromModal('/(tabs)');
    } catch (e) {
      Alert.alert(L.errOauth, (e as Error).message);
    } finally {
      setBusyRole(null);
    }
  }

  async function handleGoogleLogin() {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const accessToken = await signInWithGoogle();
      if (!accessToken) return;
      if (await loginWithGoogle(accessToken) === 'role-required') {
        setPendingOAuth({ kind: 'google', accessToken });
        return;
      }
      replaceFromModal('/(tabs)');
    } catch (e) {
      Alert.alert(L.errOauth, (e as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLogin() {
    const found = {
      identifier: identifier.trim() ? undefined : t.common.fieldRequired,
      password: password ? undefined : t.common.fieldRequired,
    };
    setFieldErrors(found);
    if (found.identifier || found.password) return;
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      replaceFromModal('/(tabs)');
    } catch (e) {
      // No account for that number or email: offer signup right there.
      if ((e as { code?: string }).code === 'ACCOUNT_NOT_FOUND') {
        Alert.alert(L.errTitle, (e as Error).message, [
          { text: t.common.cancel, style: 'cancel' },
          { text: L.createAccount, onPress: () => router.push('/(auth)/register') },
        ]);
      } else {
        Alert.alert(L.errTitle, (e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    if (appleLoading) return;
    setAppleLoading(true);
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
      // Apple gives the name and email on the first sign-in only: keep them
      // for the call that carries the role.
      const pending: PendingOAuth = {
        kind: 'apple',
        identityToken: credential.identityToken,
        email: credential.email ?? undefined,
        fullName,
      };
      if (await loginWithApple(pending.identityToken, pending.email, pending.fullName) === 'role-required') {
        setPendingOAuth(pending);
        return;
      }
      replaceFromModal('/(tabs)');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(L.errOauth, (e as Error).message);
      }
    } finally {
      setAppleLoading(false);
    }
  }

  const isAppleAvailable = Platform.OS === 'ios';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.header, paddingTop: top.screenPaddingTop }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity
        style={[styles.closeBtn, { top: top.closeTop, backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={goBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t.common.cancel}
      >
        <Icon name="close" size={22} color={colors.text} />
      </TouchableOpacity>
      <LanguageButton style={[styles.langBtn, { top: top.closeTop + (AUTH_CLOSE_SIZE - 34) / 2 }]} />
      <ScrollView {...kbScroll}
        contentContainerStyle={[styles.inner, { paddingTop: top.contentPaddingTop, paddingBottom: insets.bottom + 24 + keyboardOffset }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LogoWordmark size={30} color={colors.accent} style={{ marginBottom: 8 }} />
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {pendingOAuth ? t.register.chooseTitle : L.subtitle}
        </Text>

        {pendingOAuth ? (
          <>
            <RoleChoice onPick={handlePickRole} busyRole={busyRole} />
            <TouchableOpacity onPress={() => setPendingOAuth(null)} disabled={busyRole !== null} accessibilityRole="button">
              <Text style={[styles.link, { color: colors.textSecondary }]}>{t.navigation.back}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
        {isAppleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={14}
            style={[styles.appleBtn, appleLoading && { opacity: 0.6 }]}
            onPress={handleAppleLogin}
          />
        )}

        {googleConfigured && (
          <TouchableOpacity
            style={[styles.oauthBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={handleGoogleLogin}
            disabled={googleLoading || appleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <GoogleIcon />
                <Text style={[styles.oauthBtnText, { color: colors.text }]}>{L.googleBtn}</Text>
              </>
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
        <View style={[styles.passwordRow, { backgroundColor: colors.inputBg, borderColor: fieldErrors.identifier ? FIELD_ERROR_COLOR : identifier ? colors.inputBorder : colors.border }]}>
          <Icon name="person-outline" size={20} color={colors.textTertiary} style={styles.fieldIcon} />
          <Input
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder={L.identifierPh}
            placeholderTextColor={colors.textTertiary}
            value={identifier}
            onChangeText={(v) => { setIdentifier(v); setFieldErrors((e) => ({ ...e, identifier: undefined })); }}
            autoCapitalize="none"
            keyboardType="default"
            autoComplete="username"
            maxLength={255}
            accessibilityLabel={L.emailLabel}
          />
        </View>
        {/* The server takes +992 90 123 4567, 992901234567 or the 9 digits alone. */}
        {fieldErrors.identifier
          ? <FieldError message={fieldErrors.identifier} style={styles.loginFieldError} />
          : <Text style={[styles.hint, { color: colors.textTertiary }]}>{t.common.phoneFormatHint}</Text>}

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{L.passLabel}</Text>
        <View style={[styles.passwordRow, { backgroundColor: colors.inputBg, borderColor: fieldErrors.password ? FIELD_ERROR_COLOR : password ? colors.inputBorder : colors.border }]}>
          <Icon name="lock-closed-outline" size={20} color={colors.textTertiary} style={styles.fieldIcon} />
          <Input
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder={L.passPh}
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={(v) => { setPassword(v); setFieldErrors((e) => ({ ...e, password: undefined })); }}
            secureTextEntry={!showPassword}
            autoComplete="password"
            maxLength={128}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
        <FieldError message={fieldErrors.password} style={styles.loginFieldError} />

        <GradientButton
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
        </GradientButton>

        <TouchableOpacity style={styles.forgotLink} onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={[styles.forgotLinkText, { color: colors.textSecondary }]}>{t.forgotPassword.title}?</Text>
        </TouchableOpacity>

        <Link href="/(auth)/register" style={[styles.link, { color: colors.textSecondary }]}>
          {L.reg} <Text style={[styles.linkBold, { color: colors.accent }]}>{L.regLink}</Text>
        </Link>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  langBtn: { position: 'absolute', right: 16, zIndex: 10, height: 34 },
  closeBtn: {
    position: 'absolute', left: 16, zIndex: 10,
    width: AUTH_CLOSE_SIZE, height: AUTH_CLOSE_SIZE, borderRadius: AUTH_CLOSE_SIZE / 2, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 28 },
  oauthBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  oauthBtnText: { fontSize: 15, fontWeight: '600' },
  appleBtn: { width: '100%', height: 52, marginBottom: 10, borderRadius: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14, marginBottom: 16,
  },
  // Shared by the phone-or-email and password rows: a leading icon, then the input.
  passwordInput: {
    flex: 1, fontSize: 16, padding: 14, paddingLeft: 10, backgroundColor: 'transparent', letterSpacing: 0,
  },
  fieldIcon: { marginLeft: 14 },
  hint: { fontSize: 12, marginTop: -10, marginBottom: 14, marginLeft: 4 },
  loginFieldError: { marginTop: -10, marginBottom: 14 },
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
});
