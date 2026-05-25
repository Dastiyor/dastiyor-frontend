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
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function ChangeEmailScreen() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ce = t.changeEmail;

  const currentEmail = user?.email && !user.email.endsWith('@phone.dastiyor.local')
    ? user.email
    : null;

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) { Alert.alert(t.common.error, ce.errFill); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { Alert.alert(t.common.error, ce.errInvalid); return; }
    if (currentEmail && trimmed === currentEmail.toLowerCase()) { Alert.alert(t.common.error, ce.errSame); return; }
    if (!currentPassword) { Alert.alert(t.common.error, ce.errPassword); return; }

    setSaving(true);
    try {
      await api.put('/api/profile', {
        fullName: user?.fullName ?? '',
        email: trimmed,
        currentPassword,
      });
      await refreshUser();
      Alert.alert(t.common.done, ce.success, [{ text: t.common.ok, onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = [styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }];

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">

        {currentEmail ? (
          <View style={[styles.currentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>{ce.currentLabel}</Text>
            <Text style={[styles.currentValue, { color: colors.text }]}>{currentEmail}</Text>
          </View>
        ) : null}

        <Text style={[styles.label, { color: colors.text }]}>{ce.passwordLabel}</Text>
        <TextInput
          style={inputStyle}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoComplete="password"
          placeholder={ce.passwordPh}
          placeholderTextColor={colors.textTertiary}
          maxLength={128}
        />

        <Text style={[styles.label, { color: colors.text }]}>{ce.newLabel}</Text>
        <TextInput
          style={inputStyle}
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          placeholder={ce.newPh}
          placeholderTextColor={colors.textTertiary}
          maxLength={255}
        />

        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel={ce.btn}
          accessibilityRole="button"
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{ce.btn}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  currentBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  currentLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  currentValue: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
    letterSpacing: 0,
  },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
