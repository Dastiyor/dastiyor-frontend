import { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { GradientButton, shadows } from '@/components/Premium';


interface Props {
  icon: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [float]);
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconCircle,
          shadows.soft, { backgroundColor: colors.surface, transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] },
        ]}
      >
        <Icon name={icon} size={32} color={colors.accent} />
      </Animated.View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <GradientButton
          style={styles.btn}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.btnText}>{actionLabel}</Text>
        </GradientButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  btn: {
    backgroundColor: '#2563EB', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
