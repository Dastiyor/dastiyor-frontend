import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { GradientButton, Input, PressScale, useChipStyle } from '@/components/Premium';

export interface FilterState {
  category: string;
  urgency: string;
  city: string;
  minBudget: string;
  maxBudget: string;
  sort: string;
}

export const DEFAULT_FILTERS: FilterState = {
  category: '',
  urgency: '',
  city: '',
  minBudget: '',
  maxBudget: '',
  sort: 'newest',
};

export function hasActiveFilters(f: FilterState) {
  return !!(f.category || f.urgency || f.city || f.minBudget || f.maxBudget || f.sort !== 'newest');
}

const URGENCY_KEYS = [
  { key: 'all', value: '' },
  { key: 'urgent', value: 'urgent' },
  { key: 'normal', value: 'normal' },
  { key: 'low', value: 'low' },
] as const;

const SORT_KEYS = [
  { key: 'newest', value: 'newest' },
  { key: 'budgetHigh', value: 'budget-high' },
  { key: 'budgetLow', value: 'budget-low' },
] as const;

interface Props {
  visible: boolean;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onApply: (f: FilterState) => void;
  onClose: () => void;
  categories?: string[];
  cities?: string[];
}

export function FilterSheet({ visible, filters, onChange, onApply, onClose, categories = [], cities = [] }: Props) {
  const { t: globalT, tr } = useLanguage();
  const t = globalT.filterSheet;
  const { colors } = useTheme();
  const chipStyle = useChipStyle();

  function set(key: keyof FilterState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t.filters}</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

          {/* Category */}
          <Text style={[styles.label, { color: colors.textTertiary }]}>{t.category}</Text>
          <View style={styles.chips}>
            {[{ label: t.all, value: '' }, ...categories.map((c) => ({ label: tr(c), value: c }))].map((c) => {
              const active = filters.category === c.value;
              return (
                <PressScale
                  key={c.value || '__all__'}
                  style={[styles.chip, chipStyle.box(active)]}
                  onPress={() => set('category', c.value)}
                >
                  <Text style={[styles.chipText, chipStyle.text(active)]}>{c.label}</Text>
                </PressScale>
              );
            })}
          </View>

          {/* Urgency */}
          <Text style={[styles.label, { color: colors.textTertiary }]}>{t.urgency}</Text>
          <View style={styles.chips}>
            {URGENCY_KEYS.map((u) => {
              const active = filters.urgency === u.value;
              return (
                <PressScale
                  key={u.value || '__all__'}
                  style={[styles.chip, chipStyle.box(active)]}
                  onPress={() => set('urgency', u.value)}
                >
                  <Text style={[styles.chipText, chipStyle.text(active)]}>
                    {u.key === 'all' ? t.all : globalT.urgency[u.key]}
                  </Text>
                </PressScale>
              );
            })}
          </View>

          {/* Sort */}
          <Text style={[styles.label, { color: colors.textTertiary }]}>{t.sort}</Text>
          <View style={styles.chips}>
            {SORT_KEYS.map((s) => {
              const active = filters.sort === s.value;
              return (
                <PressScale
                  key={s.value}
                  style={[styles.chip, chipStyle.box(active)]}
                  onPress={() => set('sort', s.value)}
                >
                  <Text style={[styles.chipText, chipStyle.text(active)]}>
                    {t.sortOptions[s.key]}
                  </Text>
                </PressScale>
              );
            })}
          </View>

          {/* City -- chips, not free text: the value must stay the canonical
              Russian string the API filters on, whatever the UI language is. */}
          <Text style={[styles.label, { color: colors.textTertiary }]}>{t.city}</Text>
          <View style={styles.chips}>
            {[{ label: t.all, value: '' }, ...cities.map((c) => ({ label: tr(c), value: c }))].map((c) => {
              const active = filters.city === c.value;
              return (
                <PressScale
                  key={c.value || '__all__'}
                  style={[styles.chip, chipStyle.box(active)]}
                  onPress={() => set('city', c.value)}
                >
                  <Text style={[styles.chipText, chipStyle.text(active)]}>{c.label}</Text>
                </PressScale>
              );
            })}
          </View>

          {/* Budget range */}
          <Text style={[styles.label, { color: colors.textTertiary }]}>{t.budget}</Text>
          <View style={styles.budgetRow}>
            <View style={[styles.inputWrap, styles.budgetInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
              <Input
                style={[styles.input, { color: colors.text }]}
                placeholder={t.from}
                placeholderTextColor={colors.textTertiary}
                value={filters.minBudget}
                onChangeText={(v) => set('minBudget', v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.budgetDash, { backgroundColor: colors.border }]} />
            <View style={[styles.inputWrap, styles.budgetInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
              <Input
                style={[styles.input, { color: colors.text }]}
                placeholder={t.to}
                placeholderTextColor={colors.textTertiary}
                value={filters.maxBudget}
                onChangeText={(v) => set('maxBudget', v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>
          </View>

        </ScrollView>

        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border }]}
            onPress={() => onChange({ ...DEFAULT_FILTERS })}
          >
            <Text style={[styles.resetText, { color: colors.textSecondary }]}>{t.reset}</Text>
          </TouchableOpacity>
          <GradientButton
            style={styles.applyBtn}
            onPress={() => onApply(filters)}
          >
            <Text style={styles.applyText}>{t.apply}</Text>
          </GradientButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 8 },
  label: {
    fontSize: 12, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.6, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  input: { flex: 1, fontSize: 14, padding: 0 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budgetInput: { flex: 1, marginBottom: 16 },
  budgetDash: { width: 12, height: 2, marginBottom: 16 },
  actions: {
    flexDirection: 'row', gap: 12,
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1,
  },
  resetBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, alignItems: 'center',
  },
  resetText: { fontSize: 15, fontWeight: '700' },
  applyBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#2563EB', alignItems: 'center',
  },
  applyText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
