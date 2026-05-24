import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  name: string;
  size?: number;
  avatarUrl?: string | null;
}

export function Avatar({ name, size = 56, avatarUrl }: Props) {
  const { colors } = useTheme();
  const parts = name.trim().split(' ');
  const ini = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent }]}>
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{ini}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { color: '#fff', fontWeight: '700' },
});
