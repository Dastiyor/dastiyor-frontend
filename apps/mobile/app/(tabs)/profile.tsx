import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
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

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  CUSTOMER: { color: '#059669', bg: 'rgba(209,250,229,0.9)' },
  PROVIDER: { color: '#2563EB', bg: 'rgba(219,234,254,0.9)' },
};

const LOCALES: Locale[] = ['ru', 'tj'];

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function MenuItem({
  icon,
  label,
  sublabel,
  onPress,
  danger,
  iconColor,
}: {
  icon: IoniconName;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.menuIconWrap, danger && styles.menuIconWrapDanger]}>
        <Ionicons
          name={icon}
          size={19}
          color={danger ? '#EF4444' : (iconColor ?? '#2563EB')}
        />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
        {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={15} color={danger ? '#FCA5A5' : '#D1D5DB'} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const p = t.profile;

  function handleLogout() {
    Alert.alert(p.logoutTitle, p.logoutMessage, [
      { text: p.logoutCancel, style: 'cancel' },
      { text: p.logoutTitle, style: 'destructive', onPress: logout },
    ]);
  }

  if (!user) return null;

  const roleColors = ROLE_COLORS[user.role] ?? { color: '#374151', bg: 'rgba(243,244,246,0.9)' };
  const roleLabel = p.roles[user.role as keyof typeof p.roles] ?? user.role;

  // Detect if email is a placeholder (phone-only account)
  const hasRealEmail = user.email && !user.email.endsWith('@phone.dastiyor.local');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero banner */}
      <View style={styles.hero}>
        <Initials name={user.fullName} />
        <Text style={styles.heroName}>{user.fullName}</Text>
        {user.phone ? (
          <Text style={styles.heroPhone}>{user.phone}</Text>
        ) : hasRealEmail ? (
          <Text style={styles.heroPhone}>{user.email}</Text>
        ) : null}
        <View style={styles.heroBottom}>
          <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
            <Text style={[styles.roleText, { color: roleColors.color }]}>{roleLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/edit-profile')}
            activeOpacity={0.75}
          >
            <Ionicons name="pencil" size={13} color="#fff" />
            <Text style={styles.editBtnText}>{p.editProfile.split(' ')[0]}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Account section */}
        <SectionLabel label={p.sectionAccount} />
        <View style={styles.card}>
          <MenuItem
            icon="person-outline"
            label={p.editProfile}
            onPress={() => router.push('/edit-profile')}
          />
          <Divider />
          <MenuItem
            icon="lock-closed-outline"
            label={p.changePassword}
            onPress={() => router.push('/change-password')}
            iconColor="#7C3AED"
          />
        </View>

        {/* Contacts section */}
        <SectionLabel label={p.sectionContacts} />
        <View style={styles.card}>
          {user.phone ? (
            <>
              <View style={styles.infoRow}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="call-outline" size={19} color="#059669" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.infoLabel}>{p.phone}</Text>
                  <Text style={styles.infoValue}>{user.phone}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
              </View>
              {!hasRealEmail && <Divider />}
            </>
          ) : null}
          {!hasRealEmail ? (
            <MenuItem
              icon="mail-outline"
              label={p.addEmail}
              onPress={() => router.push('/edit-profile')}
              iconColor="#F59E0B"
            />
          ) : (
            <>
              {user.phone && <Divider />}
              <View style={styles.infoRow}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="mail-outline" size={19} color="#D97706" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.infoLabel}>{p.email}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{user.email}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Settings section */}
        <SectionLabel label={p.sectionSettings} />
        <View style={styles.card}>
          <View style={styles.langRow}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="globe-outline" size={19} color="#7C3AED" />
            </View>
            <Text style={styles.menuLabel}>{p.language}</Text>
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
            label={p.logout}
            onPress={handleLogout}
            danger
          />
        </View>

        <Text style={styles.version}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>

      </ScrollView>
    </View>
  );
}

const HERO_BG = '#1D4ED8';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  /* Hero */
  hero: {
    backgroundColor: HERO_BG,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  heroName: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroPhone: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4, textAlign: 'center' },
  heroBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '700' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  /* Scroll */
  scroll: { padding: 16, gap: 6, paddingBottom: 40 },

  /* Section label */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  /* Card */
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 58 },

  /* Menu item */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  menuIconWrapDanger: { backgroundColor: '#FEF2F2' },
  menuTextWrap: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  menuLabelDanger: { color: '#EF4444' },
  menuSublabel: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  /* Info row (read-only contact display) */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  infoLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 1 },

  /* Language */
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  langPills: { flexDirection: 'row', gap: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  pillActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  pillTextActive: { color: '#2563EB' },

  version: { textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 8, marginBottom: 4 },
});
