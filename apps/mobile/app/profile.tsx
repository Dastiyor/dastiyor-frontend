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
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/ScreenHeader';

function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const parts = name.trim().split(' ');
  const ini = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{ini}</Text>
    </View>
  );
}

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  CUSTOMER: { color: '#374151', bg: 'rgba(209,213,219,0.6)' },
  PROVIDER: { color: '#2563EB', bg: 'rgba(219,234,254,0.8)' },
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
}: {
  icon: IoniconName;
  iconBg?: string;
  iconColor?: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.rowItem, { borderBottomColor: colors.border }]}>
        <View style={[styles.rowIconWrap, { backgroundColor: iconBg ?? colors.iconBg }]}>
          <Ionicons name={icon} size={20} color={danger ? '#EF4444' : (iconColor ?? colors.accent)} />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowLabel, { color: danger ? '#EF4444' : colors.text }]}>{label}</Text>
          {sublabel ? <Text style={[styles.rowSublabel, { color: colors.textSecondary }]}>{sublabel}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={danger ? '#FCA5A5' : colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileModalScreen() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
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
  const hasRealEmail = user.email && !user.email.endsWith('@phone.dastiyor.local');
  const username = user.email ? user.email.split('@')[0] : (user.phone ?? '');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={p.title ?? 'Profile'} showBack showMenu={false} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

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
          <RowItem icon="person-outline" label={p.editProfile} onPress={() => router.push('/edit-profile')} />
          <RowItem icon="lock-closed-outline" iconBg="rgba(124,58,237,0.12)" iconColor="#7C3AED" label={p.changePassword} onPress={() => router.push('/change-password')} />
        </View>

        {/* Phone */}
        {user.phone ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoSection, { borderBottomColor: colors.border }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="call-outline" size={18} color={colors.accent} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{p.phone}</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user.phone}</Text>
              <Text style={[styles.infoHint, { color: colors.textTertiary }]}>
                When you change the number, all your data will be linked to the new number.
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.6} onPress={() => router.push('/edit-profile')}>
              <View style={styles.linkRow}>
                <Text style={[styles.linkText, { color: colors.accent }]}>Change the number</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Email */}
        {hasRealEmail ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoSection, { borderBottomColor: colors.border }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="mail-outline" size={18} color={colors.accent} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{p.email}</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{user.email}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.6} onPress={() => router.push('/edit-profile')}>
              <View style={styles.linkRow}>
                <Text style={[styles.linkText, { color: colors.accent }]}>Change email address</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Logout */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <RowItem icon="log-out-outline" iconBg="rgba(239,68,68,0.1)" label={p.logout} onPress={handleLogout} danger />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 48 },
  card: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  avatar: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700' },
  userHandle: { fontSize: 13, marginTop: 2 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '600' },
  rowItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSublabel: { fontSize: 12, marginTop: 1 },
  infoSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoLabel: { fontSize: 12, fontWeight: '500' },
  infoValue: { fontSize: 16, fontWeight: '600' },
  infoHint: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  linkText: { fontSize: 14, fontWeight: '600' },
});
