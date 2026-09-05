import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ThemeColors } from '@/contexts/ThemeContext';

/**
 * Wrapping row of selectable pills. Extracted from create-task so the respond
 * screen can offer the same preset picker for a response's duration.
 */
export function ChipGroup<T extends string>({
  options, value, onChange, getLabel, getValue, colors,
}: {
  options: T[] | { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  getLabel?: (o: T | { value: T; label: string }) => string;
  getValue?: (o: T | { value: T; label: string }) => T;
  colors: ThemeColors;
}) {
  return (
    <View style={chip.wrap}>
      {(options as (T | { value: T; label: string })[]).map((opt) => {
        const v = getValue ? getValue(opt) : (opt as T);
        const l = getLabel ? getLabel(opt) : String(opt);
        const active = value === v;
        return (
          <TouchableOpacity
            key={String(v)}
            style={[
              chip.btn,
              { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
              active && { borderColor: colors.accent, backgroundColor: colors.iconBg },
            ]}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[chip.text, { color: colors.textSecondary }, active && { color: colors.accent, fontWeight: '700' }]}>{l}</Text>
          </TouchableOpacity>
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
