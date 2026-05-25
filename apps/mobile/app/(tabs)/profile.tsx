import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar } from '@/components/Avatar';
import { LOCALE_NAMES, type Locale } from '@/lib/i18n';

const LOCALES: Locale[] = ['ru', 'tj', 'en'];

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  CUSTOMER: { color: '#2563EB', bg: 'rgba(37,99,235,0.15)' },
  PROVIDER: { color: '#059669', bg: 'rgba(5,150,105,0.15)' },
  ADMIN:    { color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' },
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function RowItem({
  icon,
  iconBg,
  iconColor,
  label,
  sublabel,
  onPress,
  danger,
  rightText,
}: {
  icon: IoniconName;
  iconBg?: string;
  iconColor?: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
  rightText?: string;
}) {
  const { colors } = useTheme();
  const iconColor_ = danger ? '#EF4444' : (iconColor ?? colors.accent);
  const content = (
    <View style={[styles.rowItem, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={22} color={iconColor_} style={styles.rowIcon} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: danger ? '#EF4444' : colors.text }]}>{label}</Text>
        {sublabel ? <Text style={[styles.rowSublabel, { color: colors.textSecondary }]}>{sublabel}</Text> : null}
      </View>
      {rightText ? (
        <Text style={[styles.rowRight, { color: colors.accent }]}>{rightText}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={danger ? '#EF4444' : colors.textTertiary} />
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
      {content}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useLanguage();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const p = t.profile;
  const statusBarHeight = insets.top;

  function handleLogout() {
    Alert.alert(p.logoutTitle, p.logoutMessage, [
      { text: p.logoutCancel, style: 'cancel' },
      { text: p.logoutTitle, style: 'destructive', onPress: logout },
    ]);
  }

  if (!user) return null;

  const roleColors = ROLE_COLORS[user.role] ?? { color: '#374151', bg: 'rgba(243,244,246,0.9)' };
  const roleLabel = p.roles[user.role as keyof typeof p.roles] ?? user.role;
  const hasRealEmail = user.email && !user.email.endsWith('@phone.dastiyor.local');
  const username = user.email ? user.email.split('@')[0] : (user.phone ?? '');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header bar */}
      <View style={[styles.headerBar, { paddingTop: statusBarHeight + 8, backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{p.title ?? 'Profile'}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>

        {/* User info card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.userRow}>
            <Avatar name={user.fullName} size={56} />
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user.fullName}</Text>
              <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{username}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
              <Text style={[styles.roleText, { color: roleColors.color }]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* Account actions */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <RowItem
            icon="person-outline"
            label={p.editProfile}
            onPress={() => router.push('/edit-profile')}
          />
          <RowItem
            icon="lock-closed-outline"
            iconBg="rgba(124,58,237,0.12)"
            iconColor="#7C3AED"
            label={p.changePassword}
            onPress={() => router.push('/change-password')}
          />
        </View>

        {/* Phone */}
        {user.phone ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoSection, { borderBottomColor: colors.border }]}>
              <Ionicons name="call-outline" size={22} color={colors.accent} style={styles.rowIcon} />
              <View style={styles.rowBody}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{p.phone}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user.phone}</Text>
                <Text style={[styles.infoHint, { color: colors.textTertiary }]}>
                  {p.phoneHint}
                </Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.6} onPress={() => router.push('/edit-profile')}>
              <View style={styles.linkRow}>
                <Text style={[styles.linkText, { color: colors.accent }]}>{p.changePhone}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Email */}
        {hasRealEmail ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoSection, { borderBottomColor: colors.border }]}>
              <Ionicons name="mail-outline" size={22} color={colors.accent} style={styles.rowIcon} />
              <View style={styles.rowBody}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{p.email}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{user.email}</Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.6} onPress={() => router.push('/change-email')}>
              <View style={styles.linkRow}>
                <Text style={[styles.linkText, { color: colors.accent }]}>{p.changeEmail}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <RowItem
              icon="mail-outline"
              iconBg="rgba(245,158,11,0.12)"
              iconColor="#F59E0B"
              label={p.addEmail}
              onPress={() => router.push('/change-email')}
            />
          </View>
        )}

        {/* Appearance */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Language */}
          <View style={[styles.rowItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="language-outline" size={22} color="#7C3AED" style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t.settings?.language ?? 'Language'}</Text>
            <View style={styles.pills}>
              {LOCALES.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.pill, { borderColor: locale === loc ? colors.accent : colors.border, backgroundColor: locale === loc ? colors.iconBg : 'transparent' }]}
                  onPress={() => setLocale(loc)}
                >
                  <Text style={[styles.pillText, { color: locale === loc ? colors.accent : colors.textSecondary }]}>
                    {LOCALE_NAMES[loc]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {/* Theme */}
          <TouchableOpacity onPress={toggleTheme} activeOpacity={0.6}>
            <View style={[styles.rowItem, { borderBottomColor: 'transparent' }]}>
              <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={22} color="#10B981" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t.settings?.theme ?? 'Theme'}</Text>
              <Text style={[styles.themeValue, { color: colors.textSecondary }]}>{isDark ? (t.settings?.dark ?? 'Dark') : (t.settings?.light ?? 'Light')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <RowItem
            icon="log-out-outline"
            iconBg="rgba(239,68,68,0.1)"
            label={p.logout}
            onPress={handleLogout}
            danger
          />
        </View>

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>
          v{Constants.expoConfig?.version ?? Constants.manifest?.version ?? '—'}
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  versionText: { textAlign: 'center', fontSize: 12, marginTop: 8, marginBottom: 8 },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },

  scroll: { padding: 16, gap: 12 },

  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  userRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700' },
  userHandle: { fontSize: 13, marginTop: 2 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '600' },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 28, textAlign: 'center', flexShrink: 0 },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSublabel: { fontSize: 12, marginTop: 1 },
  rowRight: { fontSize: 14, fontWeight: '500' },

  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600' },
  infoHint: { fontSize: 12, marginTop: 4, lineHeight: 16 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  linkText: { fontSize: 14, fontWeight: '600' },
  pills: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1.5 },
  pillText: { fontSize: 12, fontWeight: '600' },
  themeValue: { fontSize: 13, marginRight: 6 },
});
