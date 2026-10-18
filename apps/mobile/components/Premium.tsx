import { forwardRef, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextInput as RNTextInput,
  type ViewStyle,
} from 'react-native';
import { TextInput } from '@/components/AppText';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

// ponytail: gradients and motion are built on react-native-svg and RN Animated (both already in the
// native build) instead of expo-linear-gradient / reanimated, so this ships without a store rebuild.

/** Brand gradient: two close blues, top to bottom, so it reads as depth rather than a rainbow. */
export const BRAND_GRADIENT = ['#3B82F6', '#2563EB'] as const;

/** Soft layered shadows. `glow` takes the colour of the thing casting it. */
export const shadows = {
  card: {
    shadowColor: '#1E3A8A', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  soft: {
    shadowColor: '#1E3A8A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  glow: (color: string) => ({
    shadowColor: color, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  }),
} satisfies Record<string, ViewStyle | ((c: string) => ViewStyle)>;

/**
 * Absolute-fill gradient for any rounded box (buttons, selected chips, avatars, hero cards).
 * `sheen` lays a white highlight over the top half: the "light" on a glossy button.
 */
export function GradientFill({ radius = 0, colors = BRAND_GRADIENT, sheen = true }: {
  radius?: number; colors?: readonly string[]; sheen?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // Measured rather than "100%": percentage-sized Svg collapses inside horizontal ScrollViews (chip rows).
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
              {colors.map((c, i) => <Stop key={c + i} offset={i / Math.max(colors.length - 1, 1)} stopColor={c} />)}
            </LinearGradient>
            <LinearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.14} />
              <Stop offset="0.5" stopColor="#fff" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={size.w} height={size.h} rx={radius} ry={radius} fill={`url(#g${id})`} />
          {sheen && <Rect width={size.w} height={size.h} rx={radius} ry={radius} fill={`url(#s${id})`} />}
        </Svg>
      )}
    </View>
  );
}

/**
 * Chip look: raised surface (outer drop shadow + inner top light) when idle;
 * pressed-in accent (inner highlight on top, inner shade at the bottom, coloured outer glow) when selected.
 * Spread `box(active)` after the chip's own layout style and use `text(active)` on its label.
 */
export function useChipStyle() {
  const { colors, isDark } = useTheme();
  return {
    box: (active: boolean): ViewStyle => active
      ? {
        backgroundColor: colors.accent, borderColor: colors.accent,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.14), 0 4px 10px rgba(37,99,235,0.28)',
      }
      : {
        backgroundColor: isDark ? colors.surfaceAlt : colors.surface, borderColor: colors.border,
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.35)'
          : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.06), 0 3px 8px rgba(15,23,42,0.05)',
      },
    text: (active: boolean) => ({ color: active ? '#fff' : colors.text, fontWeight: active ? '700' as const : '600' as const }),
  };
}

/** Spring scale-down while pressed; holds the 0.97 shrink most premium apps use for tappable cards. */
function usePressScale(to = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return { scale, onPressIn: () => animate(to), onPressOut: () => animate(1) };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressScaleProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; children?: ReactNode; scaleTo?: number };

/** Drop-in for TouchableOpacity on cards and chips: scales instead of fading. */
export function PressScale({ style, children, scaleTo, onPressIn, onPressOut, ...rest }: PressScaleProps) {
  const p = usePressScale(scaleTo);
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => { p.onPressIn(); onPressIn?.(e); }}
      onPressOut={(e: GestureResponderEvent) => { p.onPressOut(); onPressOut?.(e); }}
      style={[style, { transform: [{ scale: p.scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

// Layout keys stay on the outer (shadow) view; everything else goes on the clipped inner view.
const OUTER_KEYS = new Set([
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'alignSelf', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'width', 'minWidth', 'maxWidth',
  'position', 'top', 'bottom', 'left', 'right', 'zIndex',
]);

/**
 * Primary call-to-action: brand gradient with a top sheen, coloured glow, spring press and a light haptic.
 * Takes the same `style` as the TouchableOpacity it replaces; its background colour is painted over.
 */
export function GradientButton({ style, children, disabled, onPress, haptic = true, ...rest }: PressScaleProps & { haptic?: boolean }) {
  const { colors } = useTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: ViewStyle = {};
  const inner: ViewStyle = {};
  for (const [k, v] of Object.entries(flat)) (OUTER_KEYS.has(k) ? outer : inner)[k as keyof ViewStyle] = v as never;
  const radius = typeof inner.borderRadius === 'number' ? inner.borderRadius : 16;
  const p = usePressScale(0.96);

  return (
    <Animated.View
      style={[
        outer,
        // The solid backing is what Android's elevation casts from; the gradient covers it.
        !disabled && [shadows.glow(colors.accent), { backgroundColor: colors.accent }],
        { borderRadius: radius, transform: [{ scale: p.scale }] },
      ]}
    >
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={p.onPressIn}
        onPressOut={p.onPressOut}
        onPress={(e) => {
          if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(e);
        }}
        accessibilityRole={rest.accessibilityRole ?? 'button'}
        accessibilityState={{ disabled: !!disabled, ...rest.accessibilityState }}
        style={[inner, { backgroundColor: 'transparent', borderRadius: radius, overflow: 'hidden' }, disabled && inner.opacity == null && { opacity: 0.55 }]}
      >
        <GradientFill radius={radius} />
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Children rise 12px and fade in; `index` staggers list items (capped so long lists don't lag). */
export function FadeIn({ index = 0, style, children }: { index?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 380, delay: Math.min(index, 8) * 55, useNativeDriver: true }).start();
  }, [v, index]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Focus glow for a box that wraps a borderless input (password row, search pill):
 * spread `handlers` on the input, add `style` to the box.
 */
export function useFocusGlow(onFocus?: TextInputProps['onFocus'], onBlur?: TextInputProps['onBlur']) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return {
    focused,
    handlers: {
      onFocus: ((e) => { setFocused(true); onFocus?.(e); }) as NonNullable<TextInputProps['onFocus']>,
      onBlur: ((e) => { setFocused(false); onBlur?.(e); }) as NonNullable<TextInputProps['onBlur']>,
    },
    style: focused ? [styles.focus, { borderColor: colors.accent, shadowColor: colors.accent }] : null,
  };
}

/**
 * TextInput that lights up when focused: accent border plus a soft glow.
 * Only boxed inputs (with their own border) glow; borderless ones inside a search pill are left alone.
 */
export const Input = forwardRef<RNTextInput, TextInputProps>(function Input({ style, onFocus, onBlur, ...rest }, ref) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const boxed = !!StyleSheet.flatten(style)?.borderWidth;
  return (
    <TextInput
      ref={ref}
      {...rest}
      placeholderTextColor={rest.placeholderTextColor ?? colors.textTertiary}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={[style, boxed && focused && [styles.focus, { borderColor: colors.accent, shadowColor: colors.accent }]]}
    />
  );
});

const styles = StyleSheet.create({
  focus: {
    shadowOpacity: Platform.OS === 'ios' ? 0.25 : 0, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
});
