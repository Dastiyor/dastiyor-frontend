import { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { isSafeAvatarUrl } from '@/lib/avatar-url';

interface Props {
  name: string;
  size?: number;
  avatarUrl?: string | null;
}

export function Avatar({ name, size = 56, avatarUrl }: Props) {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);

  // Split on any whitespace run and drop empties so names with double spaces,
  // tabs, or trailing spaces never produce an `undefined[0]` crash.
  const safeName = (name ?? '').trim();
  const parts = safeName.split(/\s+/).filter(Boolean);
  const ini = (
    parts.length >= 2
      ? parts[0][0] + parts[1][0]
      : safeName.slice(0, 2)
  ).toUpperCase() || '?';

  const safeUrl = isSafeAvatarUrl(avatarUrl) ? avatarUrl! : null;

  if (safeUrl && !imgError) {
    return (
      <Image
        source={{ uri: safeUrl }}
        style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setImgError(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent }]}
      accessibilityLabel={name}
    >
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{ini}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { color: '#fff', fontWeight: '700' },
});
