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
import { Link } from 'expo-router';
import { goBack, replaceFromModal } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { AUTH_CLOSE_SIZE, useAuthTopSpacing } from '@/lib/authLayout';
import { useKeyboardAwareScroll } from '@/lib/useKeyboardAwareScroll';
import { AuthBackground } from '@/components/AuthBackground';
import { GoogleIcon } from '@/components/GoogleIcon';
import * as storage from '@/lib/storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import { googleConfigured, signInWithGoogle } from '@/lib/google-signin';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LogoWordmark } from '@/components/Logo';
import { openPrivacyPolicy, openTermsOfService } from '@/lib/legal';
import { passwordStrength } from '@/lib/validation';
import type { Locale } from '@/lib/i18n';
import { Alert } from '@/lib/dialog';
import { GradientButton, Input } from '@/components/Premium';
import { LanguageButton } from '@/components/LanguageButton';
import { RoleChoice, type SignupRole as Role } from '@/components/RoleChoice';

/** Everything on the form except the password, which is never written to disk. */
interface RegistrationDraft {
  fullName: string;
  phoneLocal: string;
  legalAccepted: boolean;
}

/** A Google / Apple sign-in for a new person, held until they pick a role. */
type PendingOAuth =
  | { kind: 'google'; accessToken: string }
  | { kind: 'apple'; identityToken: string; email?: string; fullName?: string };

const DRAFT_KEY = 'registration_draft';

export default function RegisterScreen() {
  const { register, loginWithGoogle, loginWithApple } = useAuth();
  const { t, locale } = useLanguage();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const top = useAuthTopSpacing({ closeButton: true, keyboardOpen: keyboardOffset > 0 });
  const kbScroll = useKeyboardAwareScroll();
  const r = t.register;

  const [fullName, setFullName] = useState('');
  const [phoneLocal, setPhoneLocal] = useState(''); // digits only, 9 max
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwIssues, setPwIssues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  // Form, then the SMS code, then the role -- the role is the last step, and
  // the account is only created once it is picked. Google / Apple skip to the
  // role step when the server says the person is new.
  const [step, setStep] = useState<'form' | 'code' | 'role'>('form');
  const [code, setCode] = useState('');
  // From verify-check: proof the number passed its code, sent with the role.
  const [ticket, setTicket] = useState<{ phoneLocal: string; value: string } | null>(null);
  const [pendingOAuth, setPendingOAuth] = useState<PendingOAuth | null>(null);
  // No default: a preselected role is how providers ended up as customers.
  const [busyRole, setBusyRole] = useState<Role | null>(null);

  // Reading the Terms or Privacy link leaves the app; on a memory-tight device
  // Android may kill the process while it is backgrounded, and expo-router then
  // restores a blank form. Keep a draft of what was typed -- never the password
  // -- and put it back. Cleared once an account is created.
  useEffect(() => {
    storage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (!raw) return;
        const draft = JSON.parse(raw) as Partial<RegistrationDraft>;
        if (draft.fullName) setFullName(draft.fullName);
        if (draft.phoneLocal) setPhoneLocal(draft.phoneLocal);
        if (draft.legalAccepted) setLegalAccepted(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!fullName && !phoneLocal && !legalAccepted) return;
    const draft: RegistrationDraft = { fullName, phoneLocal, legalAccepted };
    storage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [fullName, phoneLocal, legalAccepted]);

  async function finishSignup() {
    await storage.setItem('onboarding_done', '1');
    await storage.deleteItem(DRAFT_KEY);
    replaceFromModal('/(tabs)');
  }

  function askRole(pending: PendingOAuth) {
    setPendingOAuth(pending);
    setStep('role');
  }

  async function handleGoogleRegister() {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const accessToken = await signInWithGoogle();
      if (!accessToken) return;
      // An existing account is simply signed in; a new person picks a role first.
      if (await loginWithGoogle(accessToken) === 'role-required') {
        askRole({ kind: 'google', accessToken });
        return;
      }
      await finishSignup();
    } catch (e) {
      Alert.alert(r.errRegister, (e as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  }

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 9);
    setPhoneLocal(digits);
  }

  function handlePasswordChange(text: string) {
    setPassword(text);
    if (text) setPwIssues(passwordStrength(text, r));
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
    const issues = passwordStrength(password, r);
    if (issues.length > 0) {
      Alert.alert(t.common.error, issues.join(', '));
      return;
    }
    if (!legalAccepted) {
      Alert.alert(t.common.error, t.legal.consentRequired);
      return;
    }
    // Came back from the role step to fix the name or password: the number is
    // already confirmed, so no second SMS.
    if (ticket?.phoneLocal === phoneLocal) {
      setStep('role');
      return;
    }
    setLoading(true);
    try {
      await sendCode();
      setCode('');
      setStep('code');
    } catch (e) {
      Alert.alert(r.errRegister, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function sendCode() {
    return api.post('/api/auth/verify-send', { phone: `+992${phoneLocal}`, type: 'REGISTRATION' });
  }

  async function handleResend() {
    if (loading) return;
    setLoading(true);
    try {
      await sendCode();
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  /** Check the SMS code now, so a typo is caught here and not after the role. */
  async function handleVerify() {
    if (code.length < 6) {
      Alert.alert(t.common.error, t.verifyPhone.errCode);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ ticket?: string }>('/api/auth/verify-check', {
        phone: `+992${phoneLocal}`,
        code,
        type: 'REGISTRATION',
      });
      if (!res.ticket) throw new Error(r.errRegister);
      setTicket({ phoneLocal, value: res.ticket });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStep('role');
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickRole(role: Role) {
    if (busyRole) return;
    setBusyRole(role);
    try {
      if (pendingOAuth?.kind === 'google') {
        await loginWithGoogle(pendingOAuth.accessToken, role);
      } else if (pendingOAuth?.kind === 'apple') {
        await loginWithApple(pendingOAuth.identityToken, pendingOAuth.email, pendingOAuth.fullName, role);
      } else {
        if (!ticket) { setStep('form'); return; }
        await register({
          fullName: fullName.trim(),
          phone: `+992${phoneLocal}`,
          password,
          role,
          ticket: ticket.value,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await finishSignup();
    } catch (e) {
      Alert.alert(r.errRegister, (e as Error).message);
      // The server turned the form down (number already registered, the
      // confirmation ran out, a field it rejects): back to the form to fix it.
      // A network error keeps the role step, to try again.
      if (!pendingOAuth && e instanceof ApiError && e.status === 400) {
        setTicket(null);
        setStep('form');
      }
    } finally {
      setBusyRole(null);
    }
  }

  function leaveRoleStep() {
    setPendingOAuth(null);
    setStep('form');
  }

  async function handleAppleRegister() {
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
        Alert.alert(r.errRegister, r.errRequired);
        return;
      }
      const fullNameStr = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean).join(' ') || undefined;
      // Apple gives the name and email on the first sign-in only: keep them
      // for the second call, the one that carries the role.
      const pending: PendingOAuth = {
        kind: 'apple',
        identityToken: credential.identityToken,
        email: credential.email ?? undefined,
        fullName: fullNameStr,
      };
      if (await loginWithApple(pending.identityToken, pending.email, pending.fullName) === 'role-required') {
        askRole(pending);
        return;
      }
      await finishSignup();
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(r.errRegister, (e as Error).message);
      }
    } finally {
      setAppleLoading(false);
    }
  }

  const isAppleAvailable = Platform.OS === 'ios';
  const orLabel = t.login.or;
  const googleBtnLabel = t.login.googleBtn;

  const pwOk = password.length > 0 && pwIssues.length === 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: top.screenPaddingTop }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthBackground />
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
        keyboardDismissMode="on-drag"
      >
        <LogoWordmark size={30} style={{ marginBottom: 6 }} />
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {step === 'code'
            ? t.verifyPhone.codeSent.replace('{phone}', `+992${phoneLocal}`)
            : step === 'role' ? r.chooseTitle : r.subtitle}
        </Text>

        {step === 'role' ? (
          <>
            {!pendingOAuth && (
              <View style={styles.verifiedRow}>
                <Icon name="checkmark-circle" size={18} color="#059669" />
                <Text style={styles.verifiedText}>{r.phoneVerified}</Text>
              </View>
            )}
            <RoleChoice onPick={handlePickRole} busyRole={busyRole} />
            <TouchableOpacity onPress={leaveRoleStep} disabled={busyRole !== null} accessibilityRole="button">
              <Text style={styles.link}>{t.navigation.back}</Text>
            </TouchableOpacity>
          </>
        ) : step === 'code' ? (
          <>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t.verifyPhone.codeLabel}</Text>
            <Input
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              placeholder={t.verifyPhone.codePlaceholder}
              placeholderTextColor={colors.textTertiary}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              autoFocus
              maxLength={6}
            />
            <GradientButton
              style={[styles.button, (loading || code.length < 6) && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading || code.length < 6}
              accessibilityLabel={t.verifyPhone.verify}
              accessibilityRole="button"
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>{t.verifyPhone.verify}</Text>}
            </GradientButton>
            <TouchableOpacity onPress={handleResend} disabled={loading} accessibilityRole="button">
              <Text style={styles.link}><Text style={styles.linkBold}>{r.resendCode}</Text></Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('form'); setCode(''); }} disabled={loading} accessibilityRole="button">
              <Text style={styles.link}>{t.verifyPhone.changeNumber}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>

        {/* OAuth */}
        {googleConfigured && (
          <TouchableOpacity
            style={[styles.oauthBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleGoogleRegister}
            disabled={googleLoading || appleLoading}
          >
            {googleLoading
              ? <ActivityIndicator color={colors.text} />
              : <><GoogleIcon /><Text style={[styles.oauthBtnText, { color: colors.text }]}>{googleBtnLabel}</Text></>}
          </TouchableOpacity>
        )}
        {isAppleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
            buttonStyle={isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={[styles.appleBtn, appleLoading && { opacity: 0.6 }]}
            onPress={handleAppleRegister}
          />
        )}
        {(googleConfigured || isAppleAvailable) && (
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>{orLabel}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>
        )}

        {/* Full name */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{r.fullName}</Text>
        <Input
          style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
          placeholder={r.fullNamePh}
          placeholderTextColor={colors.textTertiary}
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          maxLength={100}
        />

        {/* Phone with +992 prefix */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{r.phone}</Text>
        <View style={[styles.phoneRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={styles.phonePrefix}>
            <View style={styles.flagImg}>
              <View style={{ flex: 1, backgroundColor: '#BE0027' }} />
              <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
              <View style={{ flex: 1, backgroundColor: '#006B3F' }} />
            </View>
            <Text style={styles.phonePrefixText}>+992</Text>
          </View>
          <Input
            style={[styles.phoneInput, { color: colors.text }]}
            placeholder={r.phonePh}
            placeholderTextColor={colors.textTertiary}
            value={phoneLocal}
            onChangeText={handlePhoneChange}
            keyboardType="number-pad"
            autoComplete="tel"
            maxLength={9}
          />
        </View>

        {/* Password */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{r.password}</Text>
        <View style={[styles.passwordRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Input
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder={r.passwordHint}
            placeholderTextColor={colors.textTertiary}
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
            <Icon
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
        {/* Password feedback */}
        {password.length > 0 && (
          pwOk
            ? <Text style={styles.pwOk}>✓ {r.passwordStrong ?? 'Надёжный пароль'}</Text>
            : pwIssues.map((msg, i) => (
              <Text key={i} style={styles.pwErr}>• {msg}</Text>
            ))
        )}

        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => setLegalAccepted((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: legalAccepted }}
        >
          <Icon name={legalAccepted ? 'checkbox' : 'square-outline'} size={22} color={legalAccepted ? colors.accent : colors.textTertiary} />
          <Text style={[styles.legalText, { color: colors.textSecondary }]}>
            {t.legal.consent}{' '}
            <Text style={{ color: colors.accent }} onPress={(e) => { e.stopPropagation?.(); openTermsOfService().catch(() => {}); }}>
              {t.legal.terms}
            </Text>
            {' / '}
            <Text style={{ color: colors.accent }} onPress={(e) => { e.stopPropagation?.(); openPrivacyPolicy().catch(() => {}); }}>
              {t.legal.privacy}
            </Text>
          </Text>
        </TouchableOpacity>

        <GradientButton
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityLabel={t.verifyPhone.sendCode}
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{t.verifyPhone.sendCode}</Text>}
        </GradientButton>

        <Link href="/(auth)/login" style={styles.link}>
          {r.hasAccount} <Text style={styles.linkBold}>{r.loginLink}</Text>
        </Link>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: {
    position: 'absolute', left: 16, zIndex: 10,
    width: AUTH_CLOSE_SIZE, height: AUTH_CLOSE_SIZE, borderRadius: AUTH_CLOSE_SIZE / 2, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },

  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 24 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },

  langBtn: { position: 'absolute', right: 16, zIndex: 10, height: 34 },

  verifiedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -12, marginBottom: 16 },
  verifiedText: { fontSize: 13, fontWeight: '600', color: '#059669' },

  /* OAuth */
  oauthBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
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
  flagImg: { width: 24, height: 16, borderRadius: 2, overflow: 'hidden' },
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
    backgroundColor: 'transparent', letterSpacing: 0,
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
  legalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16, marginTop: 4 },
  legalText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
