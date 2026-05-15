import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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


const URGENCY_OPTIONS = [
  { label: { ru: 'Все', tj: 'Ҳама', en: 'All' }, value: '' },
  { label: { ru: 'Срочно', tj: 'Фаврӣ', en: 'Urgent' }, value: 'urgent' },
  { label: { ru: 'Обычное', tj: 'Оддӣ', en: 'Normal' }, value: 'normal' },
  { label: { ru: 'Не срочно', tj: 'Бефаврӣ', en: 'Low' }, value: 'low' },
];

const SORT_OPTIONS = [
  { label: { ru: 'Новые', tj: 'Нав', en: 'Newest' }, value: 'newest' },
  { label: { ru: 'Дорогие', tj: 'Гаронтар', en: 'Price ↓' }, value: 'budget-high' },
  { label: { ru: 'Дешёвые', tj: 'Арзонтар', en: 'Price ↑' }, value: 'budget-low' },
];

type Locale = 'ru' | 'tj' | 'en';

interface Props {
  visible: boolean;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onApply: (f: FilterState) => void;
  onClose: () => void;
  locale: Locale;
  categories?: string[];
}

const L = {
  ru: {
    filters: 'Фильтры',
    category: 'Категория',
    all: 'Все',
    urgency: 'Срочность',
    sort: 'Сортировка',
    city: 'Город',
    cityPlaceholder: 'Например, Душанбе',
    budget: 'Бюджет (TJS)',
    from: 'От',
    to: 'До',
    reset: 'Сбросить',
    apply: 'Применить',
  },
  tj: {
    filters: 'Филтрҳо',
    category: 'Категория',
    all: 'Ҳама',
    urgency: 'Фавриёт',
    sort: 'Мураттабсозӣ',
    city: 'Шаҳр',
    cityPlaceholder: 'Масалан, Душанбе',
    budget: 'Буҷет (ТҶС)',
    from: 'Аз',
    to: 'То',
    reset: 'Тоза кардан',
    apply: 'Татбиқ кардан',
  },
  en: {
    filters: 'Filters',
    category: 'Category',
    all: 'All',
    urgency: 'Urgency',
    sort: 'Sort',
    city: 'City',
    cityPlaceholder: 'e.g. Dushanbe',
    budget: 'Budget (TJS)',
    from: 'From',
    to: 'To',
    reset: 'Reset',
    apply: 'Apply',
  },
};

export function FilterSheet({ visible, filters, onChange, onApply, onClose, locale, categories = [] }: Props) {
  const t = L[locale] ?? L.ru;

  function set(key: keyof FilterState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{t.filters}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

          {/* Category */}
          <Text style={styles.label}>{t.category}</Text>
          <View style={styles.chips}>
            {[{ label: t.all, value: '' }, ...categories.map((c) => ({ label: c, value: c }))].map((c) => {
              const active = filters.category === c.value;
              return (
                <TouchableOpacity
                  key={c.value || '__all__'}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => set('category', c.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Urgency */}
          <Text style={styles.label}>{t.urgency}</Text>
          <View style={styles.chips}>
            {URGENCY_OPTIONS.map((u) => {
              const active = filters.urgency === u.value;
              return (
                <TouchableOpacity
                  key={u.value || '__all__'}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => set('urgency', u.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {u.label[locale] ?? u.label.ru}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sort */}
          <Text style={styles.label}>{t.sort}</Text>
          <View style={styles.chips}>
            {SORT_OPTIONS.map((s) => {
              const active = filters.sort === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => set('sort', s.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {s.label[locale] ?? s.label.ru}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* City */}
          <Text style={styles.label}>{t.city}</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={16} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.cityPlaceholder}
              placeholderTextColor="#9CA3AF"
              value={filters.city}
              onChangeText={(v) => set('city', v)}
            />
            {filters.city ? (
              <TouchableOpacity onPress={() => set('city', '')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Budget range */}
          <Text style={styles.label}>{t.budget}</Text>
          <View style={styles.budgetRow}>
            <View style={[styles.inputWrap, styles.budgetInput]}>
              <TextInput
                style={styles.input}
                placeholder={t.from}
                placeholderTextColor="#9CA3AF"
                value={filters.minBudget}
                onChangeText={(v) => set('minBudget', v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.budgetDash} />
            <View style={[styles.inputWrap, styles.budgetInput]}>
              <TextInput
                style={styles.input}
                placeholder={t.to}
                placeholderTextColor="#9CA3AF"
                value={filters.maxBudget}
                onChangeText={(v) => set('maxBudget', v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>
          </View>

        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => onChange({ ...DEFAULT_FILTERS })}
          >
            <Text style={styles.resetText}>{t.reset}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => onApply(filters)}
          >
            <Text style={styles.applyText}>{t.apply}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  body: { padding: 20, paddingBottom: 8 },
  label: {
    fontSize: 12, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.6, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#2563EB' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budgetInput: { flex: 1, marginBottom: 16 },
  budgetDash: { width: 12, height: 2, backgroundColor: '#D1D5DB', marginBottom: 16 },
  actions: {
    flexDirection: 'row', gap: 12,
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  resetBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  resetText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  applyBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#2563EB', alignItems: 'center',
  },
  applyText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
