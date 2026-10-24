import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { router } from 'expo-router';
import { goBack } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { SideDrawer } from '@/components/SideDrawer';

interface Props {
  title: string;
  unreadCount?: number;
  onNotificationsOpen?: () => void;
  showBack?: boolean;
}

export function ScreenHeader({ title, unreadCount = 0, onNotificationsOpen, showBack = false }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const statusBarHeight = insets.top;
  const backLabel = t.navigation.back;
  const notifLabel = t.navigation.notifications;

  return (
    <View style={[styles.header, { paddingTop: statusBarHeight + 4, backgroundColor: colors.header, borderBottomColor: colors.border }]}>
      {showBack ? (
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => goBack()}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
        >
          <Icon name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel={t.menu.open}
            accessibilityRole="button"
          >
            <View style={styles.burger}>
              <View style={[styles.bar, { width: 20, backgroundColor: colors.text }]} />
              <View style={[styles.bar, { width: 13, backgroundColor: colors.accent }]} />
              <View style={[styles.bar, { width: 17, backgroundColor: colors.text }]} />
            </View>
          </TouchableOpacity>
          <SideDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />
        </View>
      )}

      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">{title}</Text>

      {showBack ? (
        <View style={styles.iconBtn} />
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              if (!user) {
                router.push('/(auth)/register');
                return;
              }
              onNotificationsOpen?.();
              router.push('/notifications' as any);
            }}
            accessibilityLabel={notifLabel}
            accessibilityRole="button"
          >
            <Icon name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={24} color={colors.text} />
            {unreadCount > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/profile')}
            accessibilityLabel={t.tabs.profile}
            accessibilityRole="button"
          >
            <Icon name="person-circle-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', width: 72 },
  // Whole-point bars and gaps: 2.5pt bars rounded unevenly to device pixels and pushed the
  // middle one off centre.
  burger: { gap: 4, alignItems: 'flex-start' },
  bar: { height: 3, borderRadius: 1.5 },
  notifDot: {
    position: 'absolute', top: 1, right: 1,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444',
  },
});
