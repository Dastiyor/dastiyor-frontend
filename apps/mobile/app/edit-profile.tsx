import { useState, useEffect } from 'react';
import {
  View,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';


interface ProfileData { fullName: string; phone: string; bio: string; skills: string; }

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ep = t.editProfile;
  const [form, setForm] = useState<ProfileData>({ fullName: '', phone: '', bio: '', skills: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ user: ProfileData & { email: string } }>('/api/profile')
      .then((res) => setForm({ fullName: res.user.fullName ?? '', phone: res.user.phone ?? '', bio: res.user.bio ?? '', skills: res.user.skills ?? '' }))
      .catch(() => { if (user) setForm((f) => ({ ...f, fullName: user.fullName, phone: user.phone ?? '' })); })
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof ProfileData) {
    return (val: string) => setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      Alert.alert(t.common.error, ep.errName);
      return;
    }
    setSaving(true);
    try {
      await api.put('/api/profile', {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        bio: form.bio.trim() || undefined,
        skills: form.skills.trim() || undefined,
      });
      await refreshUser();
      Alert.alert(ep.saved, ep.profileUpdated, [{ text: t.common.ok, onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#2563EB" />;

  const inputStyle = [styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }];

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={[styles.label, { color: colors.text }]}>{ep.fullName}</Text>
        <TextInput style={inputStyle} value={form.fullName} onChangeText={set('fullName')} autoComplete="name" maxLength={100} />

        <Text style={[styles.label, { color: colors.text }]}>{ep.phone}</Text>
        <TextInput style={inputStyle} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" placeholder="+992..." placeholderTextColor={colors.textTertiary} maxLength={20} />

        <Text style={[styles.label, { color: colors.text }]}>{ep.bio}</Text>
        <TextInput style={[...inputStyle, styles.textarea]} value={form.bio} onChangeText={set('bio')} multiline textAlignVertical="top" placeholder={ep.bioPh} placeholderTextColor={colors.textTertiary} maxLength={500} />
        <Text style={styles.charCount}>{form.bio.length}/500</Text>

        <Text style={[styles.label, { color: colors.text }]}>{ep.skills}</Text>
        <TextInput style={inputStyle} value={form.skills} onChangeText={set('skills')} placeholder={ep.skillsPh} placeholderTextColor={colors.textTertiary} maxLength={300} />

        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving} accessibilityLabel={ep.save} accessibilityRole="button">
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{ep.save}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, marginTop: 60 },
  scroll: { padding: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 20 },
  textarea: { minHeight: 100, lineHeight: 22, marginBottom: 4 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 20 },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
