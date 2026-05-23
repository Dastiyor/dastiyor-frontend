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
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfig } from '@/lib/useConfig';

function ChipGroup<T extends string>({
  options, value, onChange, getLabel, getValue,
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
          <TouchableOpacity key={v} style={[chip.btn, active && chip.active]} onPress={() => onChange(v)}>
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
  const { t } = useLanguage();
  const ct = t.createTask;
  const { config } = useConfig();

  const URGENCY = [
    { value: 'urgent', label: t.urgency.urgent },
    { value: 'normal', label: t.urgency.normal },
    { value: 'low', label: t.urgency.low },
  ];

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
    if (!title.trim()) { Alert.alert(t.common.error, ct.errRequired); return; }
    if (title.trim().length < 5) { Alert.alert(t.common.error, ct.errTitleShort); return; }
    if (!description.trim()) { Alert.alert(t.common.error, ct.errRequired); return; }
    if (description.trim().length < 20) { Alert.alert(t.common.error, ct.errDescShort); return; }
    if (!category) { Alert.alert(t.common.error, ct.errCategory); return; }
    if (!city) { Alert.alert(t.common.error, ct.errCity); return; }
    if (budgetType === 'fixed' && (!amount || isNaN(Number(amount)) || Number(amount) <= 0)) {
      Alert.alert(t.common.error, ct.errBudget);
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
      Alert.alert(t.common.done, ct.published, [{ text: t.common.ok, onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={styles.label}>{ct.titleLabel}</Text>
        <TextInput style={styles.input} placeholder={ct.titlePh} placeholderTextColor="#9CA3AF" value={title} onChangeText={setTitle} maxLength={120} />

        <Text style={styles.label}>{ct.descLabel}</Text>
        <TextInput style={[styles.input, styles.textareaNoMb]} placeholder={ct.descPh} placeholderTextColor="#9CA3AF" value={description} onChangeText={setDescription} multiline textAlignVertical="top" maxLength={1000} />
        <Text style={styles.charCount}>{description.length}/1000</Text>

        <Text style={styles.label}>{ct.categoryLabel}</Text>
        <ChipGroup options={config.categories} value={category} onChange={setCategory} />

        <Text style={styles.label}>{ct.cityLabel}</Text>
        <ChipGroup options={config.cities} value={city} onChange={setCity} />

        <Text style={styles.label}>{ct.budgetLabel}</Text>
        <View style={styles.segmented}>
          {(['fixed', 'negotiable'] as const).map((bv) => (
            <TouchableOpacity key={bv} style={[styles.segBtn, budgetType === bv && styles.segBtnActive]} onPress={() => setBudgetType(bv)}>
              <Text style={[styles.segText, budgetType === bv && styles.segTextActive]}>
                {bv === 'fixed' ? ct.fixed : ct.negotiable}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {budgetType === 'fixed' ? (
          <TextInput style={[styles.input, { marginBottom: 20 }]} placeholder={ct.amountPh} placeholderTextColor="#9CA3AF" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        ) : null}

        <Text style={styles.label}>{ct.urgencyLabel}</Text>
        <ChipGroup
          options={URGENCY}
          value={urgency}
          onChange={setUrgency}
          getLabel={(o) => (o as { label: string }).label}
          getValue={(o) => (o as { value: string }).value as any}
        />

        <Text style={styles.label}>{ct.addressLabel}</Text>
        <TextInput style={[styles.input, { marginBottom: 28 }]} placeholder={ct.addressPh} placeholderTextColor="#9CA3AF" value={address} onChangeText={setAddress} />

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleCreate} disabled={loading} accessibilityLabel={ct.publish} accessibilityRole="button">
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{ct.publish}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 20 },
  textarea: { minHeight: 110, lineHeight: 22 },
  textareaNoMb: { minHeight: 110, lineHeight: 22, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 4 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 20 },
  segmented: { flexDirection: 'row', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 14 },
  segBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#F9FAFB' },
  segBtnActive: { backgroundColor: '#2563EB' },
  segText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  segTextActive: { color: '#fff' },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
