import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.border },
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function TaskCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceAlt }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Skeleton width={80} height={10} borderRadius={6} />
          <Skeleton width={50} height={18} borderRadius={6} />
        </View>
        <Skeleton width="85%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
        <Skeleton width="60%" height={12} borderRadius={6} style={{ marginBottom: 10 }} />
        <View style={styles.footer}>
          <Skeleton width={70} height={14} borderRadius={6} />
          <Skeleton width={50} height={12} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

export function FeaturedCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.featCard, { backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.featTop}>
        <View style={styles.featIcon} />
        <Skeleton width={60} height={22} borderRadius={12} style={{ opacity: 0.3 } as any} />
      </View>
      <Skeleton width="80%" height={16} borderRadius={8} style={{ marginBottom: 8, opacity: 0.3 } as any} />
      <Skeleton width="55%" height={14} borderRadius={8} style={{ opacity: 0.3 } as any} />
      <View style={styles.featTags}>
        <Skeleton width={70} height={24} borderRadius={10} style={{ opacity: 0.3 } as any} />
        <Skeleton width={80} height={24} borderRadius={10} style={{ opacity: 0.3 } as any} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    marginRight: 12, flexShrink: 0,
  },
  body: { flex: 1, gap: 6 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },

  featCard: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    minHeight: 190,
    justifyContent: 'space-between',
    opacity: 0.5,
  },
  featTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  featIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.4)' },
  featTags: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
