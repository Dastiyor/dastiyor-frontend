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
} from 'react-native';
import { goBack } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { useKeyboardAwareScroll } from '@/lib/useKeyboardAwareScroll';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadFile } from '@/lib/api-client';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Alert } from '@/lib/dialog';


interface ProfileData { fullName: string; phone: string; bio: string; skills: string; avatar: string | null; }

/** API stores the full +992XXXXXXXXX; this field edits only the 9 local digits. */
function toLocalPhone(full: string | null | undefined): string {
  const digits = (full ?? '').replace(/\D/g, '');
  return digits.startsWith('992') ? digits.slice(3, 12) : digits.slice(-9);
}

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const kbScroll = useKeyboardAwareScroll();
  const ep = t.editProfile;
  const [form, setForm] = useState<ProfileData>({ fullName: '', phone: '', bio: '', skills: '', avatar: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get<{ user: ProfileData & { email: string } }>('/api/profile')
      .then((res) => setForm({ fullName: res.user.fullName ?? '', phone: toLocalPhone(res.user.phone), bio: res.user.bio ?? '', skills: res.user.skills ?? '', avatar: res.user.avatar ?? null }))
      .catch(() => { if (user) setForm((f) => ({ ...f, fullName: user.fullName, phone: toLocalPhone(user.phone) })); })
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof ProfileData) {
    return (val: string) => setForm((f) => ({ ...f, [key]: val }));
  }

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t.common.error, ep.photoPermission);
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      // /api/upload rejects anything over 5MB; a square avatar needs nothing more.
      quality: 0.7,
    });
    if (picked.canceled) return;

    const asset = picked.assets[0];
    setUploading(true);
    try {
      const url = await uploadFile(
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
        asset.fileName ?? 'avatar.jpg',
      );
      setForm((f) => ({ ...f, avatar: url }));
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message || ep.photoUploadError);
    } finally {
      setUploading(false);
    }
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
        phone: form.phone ? `+992${form.phone}` : undefined,
        bio: form.bio.trim() || undefined,
        skills: form.skills.trim() || undefined,
        avatar: form.avatar,
      });
      await refreshUser();
      Alert.alert(ep.saved, ep.profileUpdated, [{ text: t.common.ok, onPress: () => goBack() }]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#2563EB" />;

  const inputStyle = [styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }];

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView {...kbScroll} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 + keyboardOffset }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.avatarRow}>
          <Avatar name={form.fullName || user?.fullName || '?'} size={84} avatarUrl={form.avatar} />
          <View style={styles.avatarActions}>
            <Text style={[styles.label, { color: colors.text, marginBottom: 6 }]}>{ep.photo}</Text>
            <TouchableOpacity onPress={pickAvatar} disabled={uploading} accessibilityRole="button">
              {uploading
                ? <ActivityIndicator color="#2563EB" />
                : <Text style={styles.link}>{form.avatar ? ep.changePhoto : ep.addPhoto}</Text>}
            </TouchableOpacity>
            {form.avatar && !uploading ? (
              <TouchableOpacity onPress={() => setForm((f) => ({ ...f, avatar: null }))} accessibilityRole="button">
                <Text style={[styles.link, styles.linkDanger]}>{ep.removePhoto}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>{ep.fullName}</Text>
        <TextInput style={inputStyle} value={form.fullName} onChangeText={set('fullName')} autoComplete="name" maxLength={100} />

        <Text style={[styles.label, { color: colors.text }]}>{ep.phone}</Text>
        <View style={[styles.phoneRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={styles.phonePrefix}>
            <View style={styles.flagImg}>
              <View style={{ flex: 1, backgroundColor: '#BE0027' }} />
              <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
              <View style={{ flex: 1, backgroundColor: '#006B3F' }} />
            </View>
            <Text style={styles.phonePrefixText}>+992</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, { color: colors.text }]}
            value={form.phone}
            onChangeText={(v) => setForm((f) => ({ ...f, phone: v.replace(/\D/g, '').slice(0, 9) }))}
            keyboardType="number-pad"
            autoComplete="tel"
            placeholder="XX XXX XXXX"
            placeholderTextColor={colors.textTertiary}
            maxLength={9}
          />
        </View>

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
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatarActions: { flex: 1, gap: 6 },
  phoneRow: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 12,
    overflow: 'hidden', marginBottom: 20,
  },
  phonePrefix: {
    paddingHorizontal: 14, backgroundColor: '#F0F4FF',
    borderRightWidth: 1, borderRightColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6,
  },
  flagImg: { width: 24, height: 16, borderRadius: 2, overflow: 'hidden' },
  phonePrefixText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  phoneInput: { flex: 1, padding: 14, fontSize: 15, backgroundColor: 'transparent' },
  link: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  linkDanger: { color: '#DC2626' },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 20 },
  textarea: { minHeight: 100, lineHeight: 22, marginBottom: 4 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 20 },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
