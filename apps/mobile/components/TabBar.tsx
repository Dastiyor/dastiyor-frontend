import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Text } from '@/components/AppText';
import * as Haptics from 'expo-haptics';
import { GradientFill, PressScale } from '@/components/Premium';
import type { Tabs } from 'expo-router';
import { Icon } from '@/components/Icon';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

type Props = BottomTabBarProps & {
  /** Route names to show, in display order; others stay routable but get no tab. Default: all, as declared. */
  order?: string[];
  /** When set, a "+" button sits in a curved notch in the middle of the bar. */
  onCreate?: () => void;
  createLabel?: string;
};

const BAR_H = 64;
const CORNER = 24;
const FAB = 58;

/** Bar outline: rounded top corners, plus a smooth notch around the "+" when there is one. */
export function barPath(w: number, h: number, notch: boolean): string {
  const cx = w / 2;
  const top = notch
    ? `L${cx - 66},0 C${cx - 38},0 ${cx - 44},40 ${cx},40 C${cx + 44},40 ${cx + 38},0 ${cx + 66},0 `
    : '';
  return `M0,${CORNER} Q0,0 ${CORNER},0 ${top}L${w - CORNER},0 Q${w},0 ${w},${CORNER} L${w},${h} L0,${h} Z`;
}

/** Bottom tab bar: rounded sheet with a notched "+" for customers; active tab gets a blue icon, label and top indicator. */
export function TabBar({ state, descriptors, navigation, order, onCreate, createLabel }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottom = Math.max(insets.bottom, 8);
  const height = BAR_H + bottom;
  const shown = order
    ? order.map((name) => state.routes.findIndex((r) => r.name === name)).filter((i) => i >= 0)
    : state.routes.map((_, i) => i);
  const mid = Math.floor(shown.length / 2);

  const createButton = onCreate && (
    <View key="__create" style={styles.tab}>
      <PressScale
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onCreate(); }}
        scaleTo={0.9}
        style={[styles.create, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
        accessibilityRole="button"
        accessibilityLabel={createLabel}
      >
        <GradientFill radius={FAB / 2} />
        <Icon name="add" size={30} color="#fff" />
      </PressScale>
    </View>
  );

  return (
    <View style={[styles.wrap, { height, backgroundColor: colors.bg }]}>
      {/* No background on this view, so the iOS shadow follows the notch's outline. */}
      <View style={styles.shadow} pointerEvents="none">
        <Svg width={width} height={height}>
          <Path d={barPath(width, height, !!onCreate)} fill={colors.tabBar} stroke={colors.tabBorder} strokeWidth={StyleSheet.hairlineWidth} />
        </Svg>
      </View>
      <View style={[styles.row, { paddingBottom: bottom }]}>
        {shown.flatMap((index, pos) => {
          const route = state.routes[index];
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? colors.accent : colors.textTertiary;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const badge = options.tabBarBadge;

          function onPress() {
            // Emitting the event keeps the screens' `listeners.tabPress` guards (guest → register) working.
            if (!focused) Haptics.selectionAsync();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          }

          const tab = (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <View style={[styles.indicator, focused && { backgroundColor: colors.accent }]} />
              <Pop active={focused}>
                {options.tabBarIcon?.({ focused, color, size: 24 })}
                {badge != null && (
                  <View style={[styles.badge, { borderColor: colors.tabBar }]}>
                    <Text style={styles.badgeText}>{typeof badge === 'number' && badge > 99 ? '99+' : badge}</Text>
                  </View>
                )}
              </Pop>
              <Text numberOfLines={1} style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]}>{label}</Text>
            </TouchableOpacity>
          );
          return pos === mid && createButton ? [createButton, tab] : [tab];
        })}
      </View>
    </View>
  );
}

/** Springs the icon up when its tab becomes active. */
function Pop({ active, children }: { active: boolean; children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) return;
    scale.setValue(0.8);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 14 }).start();
  }, [active, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wrap: { overflow: 'visible' },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#0F172A', shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0, shadowRadius: 14, shadowOffset: { width: 0, height: -4 },
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  indicator: { width: 22, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginBottom: 6 },
  label: { fontSize: 11, paddingHorizontal: 2 },
  // Floats in the notch: its centre sits just above the bar's top edge.
  create: {
    width: FAB, height: FAB, borderRadius: FAB / 2, marginTop: -FAB / 2 + 4,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  badge: {
    position: 'absolute', top: -5, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
