import { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ChangePasswordScreen() {
  const { t } = useLanguage();
  const cp = t.changePassword;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!current || !next || !confirm) { Alert.alert(t.common.error, cp.errFill); return; }
    if (next.length < 8) { Alert.alert(t.common.error, cp.errLength); return; }
    if (next !== confirm) { Alert.alert(t.common.error, cp.errMatch); return; }
    setSaving(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: current, newPassword: next });
      Alert.alert(t.common.done, cp.success, [{ text: t.common.ok, onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{cp.current}</Text>
        <TextInput style={styles.input} value={current} onChangeText={setCurrent} secureTextEntry autoComplete="password" placeholder="••••••••" placeholderTextColor="#9CA3AF" maxLength={128} />

        <Text style={styles.label}>{cp.new}</Text>
        <TextInput style={styles.input} value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" placeholder={cp.newPh} placeholderTextColor="#9CA3AF" maxLength={128} />

        <Text style={styles.label}>{cp.confirm}</Text>
        <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder={cp.confirmPh} placeholderTextColor="#9CA3AF" maxLength={128} />

        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving} accessibilityLabel={cp.btn} accessibilityRole="button">
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{cp.btn}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 20 },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
