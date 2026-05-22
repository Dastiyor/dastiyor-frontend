import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  title: string;
  unreadCount?: number;
  showBack?: boolean;
  showMenu?: boolean;
}

export function ScreenHeader({ title, unreadCount = 0, showBack = false, showMenu = true }: Props) {
  const { colors } = useTheme();
  const statusBarHeight = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24);

  return (
    <View style={[styles.header, { paddingTop: statusBarHeight + 8, backgroundColor: colors.header, borderBottomColor: colors.border }]}>
      {showBack ? (
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
      ) : showMenu ? (
        <TouchableOpacity style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="menu" size={26} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      <TouchableOpacity
        style={[styles.avatarBtn, { backgroundColor: colors.accent }]}
        onPress={() => router.push('/(tabs)/profile' as any)}
        accessibilityLabel="Profile"
        accessibilityRole="button"
      >
        <Ionicons name="person" size={18} color="#fff" />
        {unreadCount > 0 && <View style={styles.notifDot} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 2, right: 2,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444',
  },
});
