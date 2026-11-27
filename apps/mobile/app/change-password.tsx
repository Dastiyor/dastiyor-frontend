import { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/AppText';
import { goBack } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { useKeyboardAwareScroll } from '@/lib/useKeyboardAwareScroll';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { PasswordInput } from '@/components/PasswordInput';
import { useTheme } from '@/contexts/ThemeContext';
import { passwordStrength } from '@/lib/validation';
import { FieldError } from '@/components/FieldError';
import { Alert } from '@/lib/dialog';
import { GradientButton } from '@/components/Premium';

export default function ChangePasswordScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const kbScroll = useKeyboardAwareScroll();
  const cp = t.changePassword;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwIssues, setPwIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  // Problems found on submit, shown in red under each field (no alert).
  const [fieldErrors, setFieldErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const clearError = (field: 'current' | 'next' | 'confirm') => setFieldErrors((e) => ({ ...e, [field]: undefined }));
  const share = { visible: pwVisible, onToggleVisible: () => setPwVisible((v) => !v) };

  async function handleSave() {
    const found = {
      current: current ? undefined : t.common.fieldRequired,
      // A short new password is already listed under the field as it is typed.
      next: next ? undefined : t.common.fieldRequired,
      confirm: !confirm ? t.common.fieldRequired : next && confirm !== next ? cp.errMatch : undefined,
    };
    setFieldErrors(found);
    if (found.current || found.next || found.confirm || passwordStrength(next, cp).length > 0) return;
    setSaving(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: current, newPassword: next });
      Alert.alert(t.common.done, cp.success, [{ text: t.common.ok, onPress: () => goBack() }]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView {...kbScroll} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 + keyboardOffset }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.text }]}>{cp.current}</Text>
        <PasswordInput {...share} value={current} onChangeText={(v) => { setCurrent(v); clearError('current'); }} autoComplete="password" placeholder="••••••••" hasError={!!fieldErrors.current} />
        <FieldError message={fieldErrors.current} />

        <Text style={[styles.label, { color: colors.text }]}>{cp.new}</Text>
        <PasswordInput
          {...share}
          showToggle={false}
          value={next}
          onChangeText={(v) => { setNext(v); setPwIssues(v ? passwordStrength(v, cp) : []); clearError('next'); }}
          autoComplete="new-password"
          placeholder={cp.newPh}
          hasError={!!fieldErrors.next || pwIssues.length > 0}
        />
        <FieldError message={fieldErrors.next} />
        {next.length > 0 && (
          pwIssues.length === 0
            ? <Text style={styles.pwOk}>✓ {cp.passwordStrong}</Text>
            : pwIssues.map((msg, i) => <Text key={i} style={styles.pwErr}>• {msg}</Text>)
        )}

        <Text style={[styles.label, { color: colors.text }]}>{cp.confirm}</Text>
        <PasswordInput {...share} showToggle={false} value={confirm} onChangeText={(v) => { setConfirm(v); clearError('confirm'); }} placeholder={cp.confirmPh} hasError={!!fieldErrors.confirm} />
        <FieldError message={fieldErrors.confirm} />

        <GradientButton style={[styles.btn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving} accessibilityLabel={cp.btn} accessibilityRole="button">
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{cp.btn}</Text>}
        </GradientButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  pwOk: { fontSize: 12, color: '#059669', fontWeight: '500', marginBottom: 14 },
  pwErr: { fontSize: 12, color: '#DC2626', marginBottom: 2 },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
