import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Text } from '@/components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { looksLikeServiceAd } from '@/lib/service-ad';
import { goBack, replaceFromModal } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { useKeyboardAwareScroll } from '@/lib/useKeyboardAwareScroll';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { track, AnalyticsEvent } from '@/lib/analytics';
import { useConfig } from '@/lib/useConfig';
import { Alert } from '@/lib/dialog';
import { ChipGroup } from '@/components/ChipGroup';
import { GradientButton, Input, PressScale, useChipStyle } from '@/components/Premium';
import { taskFieldErrors, TASK_DESCRIPTION_MAX, TASK_TITLE_MAX, type TaskField } from '@/lib/task-rules';

// Cities are canonical Russian strings; most tasks are in the capital, so it is preselected.
const DEFAULT_CITY = 'Душанбе';


export default function CreateTaskScreen() {
  const { t, tr } = useLanguage();
  const { colors } = useTheme();
  const chipStyle = useChipStyle();
  const ct = t.createTask;
  const { config } = useConfig();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const kbScroll = useKeyboardAwareScroll();

  const URGENCY = [
    { value: 'urgent', label: t.urgency.urgent },
    { value: 'normal', label: t.urgency.normal },
    { value: 'low', label: t.urgency.low },
  ];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // The empty task feed opens this with the category the customer was looking at.
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState(params.category ?? '');
  const [city, setCity] = useState(DEFAULT_CITY);
  // Negotiable first: someone who doesn't know the price isn't asked for one.
  const [budgetType, setBudgetType] = useState<'fixed' | 'negotiable'>('negotiable');
  const [amount, setAmount] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  // A field's error shows under it once the customer has left it, or after a
  // publish attempt, and then follows every keystroke. No pop-ups.
  const [touched, setTouched] = useState<Partial<Record<TaskField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const fieldY = useRef<Partial<Record<TaskField, number>>>({});

  const errors: Partial<Record<TaskField, string>> = {};
  const ruleErrors = taskFieldErrors({ title, description, category, city, budget: budgetType, amount: budgetType === 'fixed' ? amount : '' });
  for (const [field, key] of Object.entries(ruleErrors) as [TaskField, keyof typeof ct][]) errors[field] = ct[key] as string;
  const errorFor = (field: TaskField) => ((touched[field] || submitAttempted) ? errors[field] : undefined);
  const touch = (field: TaskField) => setTouched((prev) => ({ ...prev, [field]: true }));
  const remember = (field: TaskField) => (e: { nativeEvent: { layout: { y: number } } }) => { fieldY.current[field] = e.nativeEvent.layout.y; };

  // Funnel: mark that the user opened the create-task flow.
  useEffect(() => {
    track(AnalyticsEvent.TaskCreateStarted);
  }, []);

  async function handleCreate(adConfirmed = false) {
    const order: TaskField[] = ['title', 'description', 'category', 'city', 'amount'];
    const firstBad = order.find((f) => errors[f]);
    if (firstBad) {
      setSubmitAttempted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      kbScroll.ref.current?.scrollTo({ y: Math.max(0, (fieldY.current[firstBad] ?? 0) - 24), animated: true });
      return;
    }
    if (!adConfirmed && looksLikeServiceAd(title, description)) {
      // Warn, never block: "post anyway" goes on with the same form.
      Alert.alert(t.adWarning.title, t.adWarning.body, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.adWarning.becomeProvider, onPress: () => router.push('/switch-role') },
        { text: t.adWarning.postAnyway, onPress: () => { handleCreate(true); } },
      ]);
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const created = await api.post<{ task?: { id: string } }>('/api/tasks', {
        title: title.trim(),
        description: description.trim(), // optional; '' when left empty
        category,
        city,
        budget: budgetType,
        amount: budgetType === 'fixed' ? Number(amount) : undefined,
        urgency,
        address: address.trim() || undefined,
      });
      track(AnalyticsEvent.TaskCreateCompleted, { category, city, budgetType });
      // Land on the new task, where the customer sees recommended providers.
      const newId = created?.task?.id;
      Alert.alert(t.common.done, ct.published, [{
        text: t.common.ok,
        onPress: () => (newId ? replaceFromModal({ pathname: '/task/[id]', params: { id: newId } }) : goBack()),
      }]);
    } catch (e) {
      const err = e as { code?: string; message: string };
      const msg = err.message ?? '';
      if (err.code === 'PHONE_VERIFICATION_REQUIRED' || msg.includes('PHONE_VERIFICATION')) {
        Alert.alert(t.phoneVerify.required, t.phoneVerify.message, [
          { text: t.common.cancel, style: 'cancel' },
          { text: t.phoneVerify.openWebsite, onPress: () => { Linking.openURL('https://www.dastiyor.com/verify-phone').catch(() => {}); } },
          { text: t.phoneVerify.verifyNow, onPress: () => router.push('/verify-phone?returnTo=/create-task') },
        ]);
      } else {
        Alert.alert(t.common.error, msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = [styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }];

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView {...kbScroll} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 + keyboardOffset }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View onLayout={remember('title')}>
          <Text style={[styles.label, { color: colors.text }]}>{ct.titleLabel}</Text>
          <Input style={[...inputStyle, styles.inputNoMb, errorFor('title') ? styles.inputBad : null]} placeholder={ct.titlePh} placeholderTextColor={colors.textTertiary} value={title} onChangeText={setTitle} onBlur={() => touch('title')} maxLength={TASK_TITLE_MAX} accessibilityLabel={ct.titleLabel} />
          <FieldFooter error={errorFor('title')} count={`${title.length}/${TASK_TITLE_MAX}`} />
        </View>

        <View onLayout={remember('description')}>
          <Text style={[styles.label, { color: colors.text }]}>{ct.descLabel} <Text style={[styles.optional, { color: colors.textTertiary }]}>{ct.optional}</Text></Text>
          <Input style={[...inputStyle, styles.textareaNoMb, errorFor('description') ? styles.inputBad : null]} placeholder={ct.descPh} placeholderTextColor={colors.textTertiary} value={description} onChangeText={setDescription} onBlur={() => touch('description')} multiline textAlignVertical="top" maxLength={TASK_DESCRIPTION_MAX} accessibilityLabel={ct.descLabel} />
          <FieldFooter error={errorFor('description')} count={`${description.length}/${TASK_DESCRIPTION_MAX}`} />
        </View>

        <View onLayout={remember('category')}>
          <Text style={[styles.label, { color: colors.text }]}>{ct.categoryLabel}</Text>
          <ChipGroup options={config.categories} value={category} onChange={(v) => { setCategory(v); touch('category'); }} getLabel={(o) => tr(o as string)} colors={colors} />
          <FieldFooter error={errorFor('category')} chips />
        </View>

        <View onLayout={remember('city')}>
          <Text style={[styles.label, { color: colors.text }]}>{ct.cityLabel}</Text>
          <ChipGroup options={config.cities} value={city} onChange={(v) => { setCity(v); touch('city'); }} getLabel={(o) => tr(o as string)} colors={colors} />
          <FieldFooter error={errorFor('city')} chips />
        </View>

        <Text style={[styles.label, { color: colors.text }]}>{ct.budgetLabel}</Text>
        <View style={[styles.segmented, { borderColor: colors.border }]}>
          {(['fixed', 'negotiable'] as const).map((bv) => (
            <PressScale
              key={bv}
              style={[styles.segBtn, budgetType === bv ? chipStyle.box(true) : { backgroundColor: colors.surfaceAlt }]}
              onPress={() => setBudgetType(bv)}
              accessibilityRole="radio"
              accessibilityState={{ selected: budgetType === bv, checked: budgetType === bv }}
            >
              <Text style={[styles.segText, { color: colors.textSecondary }, budgetType === bv && styles.segTextActive]}>
                {bv === 'fixed' ? ct.fixed : ct.negotiable}
              </Text>
            </PressScale>
          ))}
        </View>

        {budgetType === 'fixed' ? (
          <View onLayout={remember('amount')}>
            <Input style={[...inputStyle, styles.inputNoMb, errorFor('amount') ? styles.inputBad : null]} placeholder={ct.amountPh} placeholderTextColor={colors.textTertiary} value={amount} onChangeText={setAmount} onBlur={() => touch('amount')} keyboardType="numeric" accessibilityLabel={ct.amountPh} />
            <FieldFooter error={errorFor('amount')} />
          </View>
        ) : null}

        <Text style={[styles.label, { color: colors.text }]}>{ct.urgencyLabel}</Text>
        <ChipGroup
          options={URGENCY}
          value={urgency}
          onChange={setUrgency}
          getLabel={(o) => (o as { label: string }).label}
          getValue={(o) => (o as { value: string }).value as typeof urgency}
          colors={colors}
        />

        <Text style={[styles.label, { color: colors.text }]}>{ct.addressLabel}</Text>
        <Input style={[...inputStyle, { marginBottom: 28 }]} placeholder={ct.addressPh} placeholderTextColor={colors.textTertiary} value={address} onChangeText={setAddress} />

        <GradientButton style={[styles.btn, loading && styles.btnDisabled]} onPress={() => handleCreate()} disabled={loading} accessibilityLabel={ct.publish} accessibilityRole="button">
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{ct.publish}</Text>}
        </GradientButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** The line under a field: its error (red) on the left, a character count on the right. */
function FieldFooter({ error, count, chips }: { error?: string; count?: string; chips?: boolean }) {
  if (chips && !error) return null;
  return (
    <View style={[styles.footer, chips && styles.footerChips]}>
      <Text style={styles.fieldError} accessibilityLiveRegion="polite">{error ?? ''}</Text>
      {count ? <Text style={styles.charCount}>{count}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 20 },
  textareaNoMb: { minHeight: 110, lineHeight: 22, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 4 },
  inputNoMb: { marginBottom: 4 },
  inputBad: { borderColor: '#DC2626' },
  optional: { fontWeight: '400' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 20, minHeight: 16 },
  // ChipGroup already leaves 20 below itself.
  footerChips: { marginTop: -14 },
  fieldError: { flex: 1, fontSize: 12, color: '#DC2626' },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
  segmented: { flexDirection: 'row', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 14 },
  segBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#F9FAFB' },
  segText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  segTextActive: { color: '#fff' },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
