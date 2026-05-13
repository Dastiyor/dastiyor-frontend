import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Props {
  title: string;
  unreadCount?: number;
}

export function ScreenHeader({ title, unreadCount = 0 }: Props) {
  const statusBarHeight = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24);

  return (
    <View style={[styles.header, { paddingTop: statusBarHeight + 8 }]}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications')} accessibilityLabel="Уведомления" accessibilityRole="button">
        <Ionicons name="notifications-outline" size={24} color="#111827" />
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444',
  },
});
