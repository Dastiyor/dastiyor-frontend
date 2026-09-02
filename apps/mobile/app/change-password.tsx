import { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { goBack } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { useKeyboardAwareScroll } from '@/lib/useKeyboardAwareScroll';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { PasswordInput } from '@/components/PasswordInput';
import { useTheme } from '@/contexts/ThemeContext';
import { passwordStrength } from '@/lib/validation';

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
  const share = { visible: pwVisible, onToggleVisible: () => setPwVisible((v) => !v) };

  async function handleSave() {
    if (!current || !next || !confirm) { Alert.alert(t.common.error, cp.errFill); return; }
    if (next.length < 8) { Alert.alert(t.common.error, cp.errLength); return; }
    const issues = passwordStrength(next, cp);
    if (issues.length > 0) { Alert.alert(t.common.error, issues.join(', ')); return; }
    if (next !== confirm) { Alert.alert(t.common.error, cp.errMatch); return; }
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
        <PasswordInput {...share} value={current} onChangeText={setCurrent} autoComplete="password" placeholder="••••••••" />

        <Text style={[styles.label, { color: colors.text }]}>{cp.new}</Text>
        <PasswordInput
          {...share}
          showToggle={false}
          value={next}
          onChangeText={(v) => { setNext(v); setPwIssues(v ? passwordStrength(v, cp) : []); }}
          autoComplete="new-password"
          placeholder={cp.newPh}
        />
        {next.length > 0 && (
          pwIssues.length === 0
            ? <Text style={styles.pwOk}>✓ {cp.passwordStrong}</Text>
            : pwIssues.map((msg, i) => <Text key={i} style={styles.pwErr}>• {msg}</Text>)
        )}

        <Text style={[styles.label, { color: colors.text }]}>{cp.confirm}</Text>
        <PasswordInput {...share} showToggle={false} value={confirm} onChangeText={setConfirm} placeholder={cp.confirmPh} />

        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving} accessibilityLabel={cp.btn} accessibilityRole="button">
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{cp.btn}</Text>}
        </TouchableOpacity>
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
