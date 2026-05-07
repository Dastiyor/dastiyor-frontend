import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api-client';

const CATEGORIES = [
  'Ремонт', 'Уборка', 'Доставка', 'Сантехника', 'Электрик',
  'IT и Веб', 'Обучение', 'Дизайн', 'Красота', 'Фото и видео',
  'Мероприятия', 'Ремонт техники', 'Юридические услуги',
];

const CITIES = [
  'Душанбе', 'Худжанд', 'Бохтар', 'Кӯлоб',
  'Истаравшан', 'Турсунзода', 'Онлайн',
];

const URGENCY = [
  { value: 'urgent', label: 'Срочно' },
  { value: 'normal', label: 'Обычная' },
  { value: 'low', label: 'Гибкий' },
];

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
}: {
  options: T[] | { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  getLabel?: (o: T | { value: T; label: string }) => string;
  getValue?: (o: T | { value: T; label: string }) => T;
}) {
  return (
    <View style={chip.wrap}>
      {(options as any[]).map((opt) => {
        const v = getValue ? getValue(opt) : (opt as T);
        const l = getLabel ? getLabel(opt) : String(opt);
        const active = value === v;
        return (
          <TouchableOpacity
            key={v}
            style={[chip.btn, active && chip.active]}
            onPress={() => onChange(v)}
          >
            <Text style={[chip.text, active && chip.activeText]}>{l}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chip = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  active: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  text: { fontSize: 13, color: '#374151', fontWeight: '500' },
  activeText: { color: '#2563EB', fontWeight: '700' },
});

export default function CreateTaskScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'negotiable'>('fixed');
  const [amount, setAmount] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !description.trim() || !category || !city) {
      Alert.alert('Ошибка', 'Заполните обязательные поля: название, описание, категорию и город');
      return;
    }
    if (budgetType === 'fixed' && (!amount || isNaN(Number(amount)))) {
      Alert.alert('Ошибка', 'Укажите сумму бюджета');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/tasks', {
        title: title.trim(),
        description: description.trim(),
        category,
        city,
        budget: budgetType,
        amount: budgetType === 'fixed' ? Number(amount) : undefined,
        urgency,
        address: address.trim() || undefined,
      });
      Alert.alert('Готово!', 'Задание опубликовано', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Ошибка', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Название задания *</Text>
        <TextInput
          style={styles.input}
          placeholder="Кратко опишите что нужно сделать"
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        <Text style={styles.label}>Описание *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Подробно опишите задание, требования, нюансы..."
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Категория *</Text>
        <ChipGroup
          options={CATEGORIES}
          value={category}
          onChange={setCategory}
        />

        <Text style={styles.label}>Город *</Text>
        <ChipGroup
          options={CITIES}
          value={city}
          onChange={setCity}
        />

        <Text style={styles.label}>Бюджет</Text>
        <View style={styles.segmented}>
          {(['fixed', 'negotiable'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segBtn, budgetType === t && styles.segBtnActive]}
              onPress={() => setBudgetType(t)}
            >
              <Text style={[styles.segText, budgetType === t && styles.segTextActive]}>
                {t === 'fixed' ? 'Фиксированный' : 'Договорная'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {budgetType === 'fixed' ? (
          <TextInput
            style={[styles.input, { marginBottom: 20 }]}
            placeholder="Сумма в TJS"
            placeholderTextColor="#9CA3AF"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        ) : null}

        <Text style={styles.label}>Срочность</Text>
        <ChipGroup
          options={URGENCY}
          value={urgency}
          onChange={setUrgency}
          getLabel={(o) => (o as { label: string }).label}
          getValue={(o) => (o as { value: string }).value as any}
        />

        <Text style={styles.label}>Адрес (необязательно)</Text>
        <TextInput
          style={[styles.input, { marginBottom: 28 }]}
          placeholder="ул. Рудаки, д. 12"
          placeholderTextColor="#9CA3AF"
          value={address}
          onChangeText={setAddress}
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Опубликовать задание</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
  },
  textarea: { minHeight: 110, lineHeight: 22 },
  segmented: { flexDirection: 'row', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 14 },
  segBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#F9FAFB' },
  segBtnActive: { backgroundColor: '#2563EB' },
  segText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  segTextActive: { color: '#fff' },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
