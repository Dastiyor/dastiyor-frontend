import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useTheme } from '@/contexts/ThemeContext';
import { ChipGroup } from '@/components/ChipGroup';
import { Input } from '@/components/Premium';

export const MAX_CATEGORIES = 5;

export interface ProviderFieldsValue {
  experience: string; // digits, '' = not set
  city: string; // canonical Russian, '' = not set
  categories: string[]; // canonical Russian
}

/** Experience, city and categories for a provider's profile. Values stay canonical; `tr` is display only. */
export function ProviderFields({ value, onChange, categories, cities, tr, labels }: {
  value: ProviderFieldsValue;
  onChange: (v: ProviderFieldsValue) => void;
  categories: string[];
  cities: string[];
  tr: (v: string) => string;
  labels: { experience: string; city: string; categories: string; categoriesHint: string };
}) {
  const { colors } = useTheme();

  const toggleCategory = (c: string) => {
    if (value.categories.includes(c)) onChange({ ...value, categories: value.categories.filter((x) => x !== c) });
    else if (value.categories.length < MAX_CATEGORIES) onChange({ ...value, categories: [...value.categories, c] });
  };

  return (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>{labels.experience}</Text>
      <Input
        accessibilityLabel={labels.experience}
        style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
        value={value.experience}
        onChangeText={(v) => onChange({ ...value, experience: v.replace(/\D/g, '').slice(0, 2) })}
        keyboardType="number-pad"
        maxLength={2}
      />

      <Text style={[styles.label, { color: colors.text }]}>{labels.city}</Text>
      <ChipGroup options={cities} value={value.city} getLabel={(o) => tr(o as string)} colors={colors}
        onChange={(c) => onChange({ ...value, city: c === value.city ? '' : c })} />

      <Text style={[styles.label, { color: colors.text }]}>{labels.categories}</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>{labels.categoriesHint}</Text>
      <ChipGroup options={categories} value={value.categories} getLabel={(o) => tr(o as string)} colors={colors} onChange={toggleCategory} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 12, marginTop: -4, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 20 },
});
