import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LOCALE_NAMES, type Locale } from '@/lib/i18n';

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const ini = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{ini}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  CUSTOMER: { color: '#059669', bg: '#D1FAE5' },
  PROVIDER: { color: '#2563EB', bg: '#DBEAFE' },
  ADMIN:    { color: '#7C3AED', bg: '#EDE9FE' },
};

const LOCALES: Locale[] = ['ru', 'tj'];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useLanguage();

  function handleLogout() {
    Alert.alert(t.profile.logoutTitle, t.profile.logoutMessage, [
      { text: t.profile.logoutCancel, style: 'cancel' },
      { text: t.profile.logoutTitle, style: 'destructive', onPress: logout },
    ]);
  }

  if (!user) return null;

  const roleColors = ROLE_COLORS[user.role] ?? { color: '#374151', bg: '#F3F4F6' };
  const roleLabel = t.profile.roles[user.role as keyof typeof t.profile.roles] ?? user.role;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Initials name={user.fullName} />
        <Text style={styles.name}>{user.fullName}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
          <Text style={[styles.roleText, { color: roleColors.color }]}>{roleLabel}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row label={t.profile.email} value={user.email} />
        <Row label={t.profile.phone} value={user.phone} />
      </View>

      <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
        <Text style={styles.editBtnText}>{t.profile.editProfile}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/change-password')}>
        <Text style={styles.editBtnText}>{t.profile.changePassword}</Text>
      </TouchableOpacity>

      <View style={styles.langCard}>
        <Text style={styles.langLabel}>{t.profile.language}</Text>
        <View style={styles.langRow}>
          {LOCALES.map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[styles.langBtn, locale === loc && styles.langBtnActive]}
              onPress={() => setLocale(loc)}
            >
              <Text style={[styles.langBtnText, locale === loc && styles.langBtnTextActive]}>
                {LOCALE_NAMES[loc]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t.profile.logout}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scroll: { paddingBottom: 40 },
  header: { alignItems: 'center', backgroundColor: '#fff', paddingTop: 60, paddingBottom: 28, marginBottom: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#111827', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  editBtn: {
    marginHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  editBtnText: { color: '#374151', fontWeight: '700', fontSize: 15 },
  langCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  langLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 12 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  langBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  langBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  langBtnTextActive: { color: '#2563EB' },
  logoutBtn: {
    marginHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});
