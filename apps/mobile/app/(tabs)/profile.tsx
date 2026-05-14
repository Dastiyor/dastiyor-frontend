import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LOCALE_NAMES, type Locale } from '@/lib/i18n';
import { ScreenHeader } from '@/components/ScreenHeader';

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

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  CUSTOMER: { color: '#059669', bg: '#D1FAE5' },
  PROVIDER: { color: '#2563EB', bg: '#DBEAFE' },
};

const LOCALES: Locale[] = __DEV__ ? ['ru', 'tj'] : ['ru', 'tj'];

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? '#EF4444' : '#6B7280'}
        style={styles.menuIcon}
      />
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={danger ? '#FCA5A5' : '#D1D5DB'} />
    </TouchableOpacity>
  );
}

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
    <View style={styles.container}>
      <ScreenHeader title={t.tabs.profile} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <Initials name={user.fullName} />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user.fullName}</Text>
            {user.email ? (
              <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
            ) : null}
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
            <Text style={[styles.roleText, { color: roleColors.color }]}>{roleLabel}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <MenuItem
            icon="person-outline"
            label={t.profile.editProfile}
            onPress={() => router.push('/edit-profile')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="lock-closed-outline"
            label={t.profile.changePassword}
            onPress={() => router.push('/change-password')}
          />
        </View>

        {/* Contact info */}
        {user.phone ? (
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#6B7280" style={styles.menuIcon} />
              <View>
                <Text style={styles.infoLabel}>{t.profile.phone}</Text>
                <Text style={styles.infoValue}>{user.phone}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Language */}
        <View style={styles.card}>
          <View style={styles.langRow}>
            <Ionicons name="globe-outline" size={20} color="#6B7280" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>{t.profile.language}</Text>
            <View style={styles.langPills}>
              {LOCALES.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.pill, locale === loc && styles.pillActive]}
                  onPress={() => setLocale(loc)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, locale === loc && styles.pillTextActive]}>
                    {LOCALE_NAMES[loc]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.card}>
          <MenuItem
            icon="log-out-outline"
            label={t.profile.logout}
            onPress={handleLogout}
            danger
          />
        </View>

        <Text style={styles.version}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  /* Profile card */
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  email: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexShrink: 0 },
  roleText: { fontSize: 12, fontWeight: '700' },

  /* Card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 52 },

  /* Menu item */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  menuIcon: { marginRight: 14, width: 22 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  menuLabelDanger: { color: '#EF4444' },

  /* Info row */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  infoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 1 },

  /* Language */
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  langPills: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  pillActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  pillTextActive: { color: '#2563EB' },
  version: { textAlign: 'center', fontSize: 12, color: '#D1D5DB', marginTop: 4, marginBottom: 8 },
});
