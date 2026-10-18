import { View, Text, StyleSheet } from 'react-native';
import { PressScale, useChipStyle } from '@/components/Premium';
import type { ThemeColors } from '@/contexts/ThemeContext';

/**
 * Wrapping row of selectable pills. Extracted from create-task so the respond
 * screen can offer the same preset picker for a response's duration.
 * Pass an array as `value` for multi-select; onChange still reports the tapped option.
 */
export function ChipGroup<T extends string>({
  options, value, onChange, getLabel, getValue,
}: {
  options: T[] | { value: T; label: string }[];
  value: T | T[];
  onChange: (v: T) => void;
  getLabel?: (o: T | { value: T; label: string }) => string;
  getValue?: (o: T | { value: T; label: string }) => T;
  /** Unused since chips read the theme themselves; kept so callers need not change. */
  colors?: ThemeColors;
}) {
  const chipStyle = useChipStyle();
  return (
    <View style={chip.wrap}>
      {(options as (T | { value: T; label: string })[]).map((opt) => {
        const v = getValue ? getValue(opt) : (opt as T);
        const l = getLabel ? getLabel(opt) : String(opt);
        const active = Array.isArray(value) ? value.includes(v) : value === v;
        return (
          <PressScale
            key={String(v)}
            style={[
              chip.btn,
              chipStyle.box(active),
            ]}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[chip.text, chipStyle.text(active)]}>{l}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

const chip = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  text: { fontSize: 13, fontWeight: '500' },
});
