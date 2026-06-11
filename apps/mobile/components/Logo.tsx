import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Dastiyor brand mark — 4-petal swirl. Vector source: apps/web/public/logo-mark.svg
 * (4 circles r=260 at ±165 from center, each cut by neighbor dilated +52).
 */
const MARK_PATHS = [
  'M 116.31 466.93 A 260 260 0 1 1 577.69 466.93 A 312 312 0 0 0 116.31 466.93 Z',
  'M 557.07 116.31 A 260 260 0 1 1 557.07 577.69 A 312 312 0 0 0 557.07 116.31 Z',
  'M 907.69 557.07 A 260 260 0 1 1 446.31 557.07 A 312 312 0 0 0 907.69 557.07 Z',
  'M 466.93 907.69 A 260 260 0 1 1 466.93 446.31 A 312 312 0 0 0 466.93 907.69 Z',
];

export const BRAND_BLUE = '#4A7BE8';

export function LogoMark({ size = 48, color = BRAND_BLUE }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      {MARK_PATHS.map((d) => (
        <Path key={d} d={d} fill={color} />
      ))}
    </Svg>
  );
}

/**
 * Horizontal lockup: DASTIYOR with the swirl mark as the "O".
 * `size` is the letter font size; the mark scales to match cap height.
 */
export function LogoWordmark({
  size = 32,
  color = '#2563EB',
  markColor,
  style,
}: {
  size?: number;
  color?: string;
  markColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const letter = { fontSize: size, color, letterSpacing: size * 0.02 };
  return (
    <View style={[styles.row, style]} accessibilityRole="image" accessibilityLabel="Dastiyor">
      <Text style={[styles.word, letter]}>DASTIY</Text>
      <View style={{ marginHorizontal: size * 0.05, transform: [{ translateY: -size * 0.01 }] }}>
        <LogoMark size={size * 0.95} color={markColor ?? color} />
      </View>
      <Text style={[styles.word, letter]}>R</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: {
    fontWeight: '800',
    includeFontPadding: false,
  },
});
