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
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

const STARS = [1, 2, 3, 4, 5];

export default function ReviewScreen() {
  const { taskId, providerName, taskTitle } = useLocalSearchParams<{ taskId: string; providerName: string; taskTitle: string }>();
  const { t } = useLanguage();
  const rv = t.review;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (rating === 0) { Alert.alert(t.common.error, rv.errRating); return; }
    setLoading(true);
    try {
      await api.post('/api/reviews', { taskId, rating, comment: comment.trim() || undefined });
      Alert.alert(rv.thanks, rv.published, [{ text: t.common.ok, onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {taskTitle ? (
          <View style={styles.taskBox}>
            <Text style={styles.taskBoxLabel}>{rv.task}</Text>
            <Text style={styles.taskBoxTitle}>{taskTitle}</Text>
          </View>
        ) : null}

        {providerName ? (
          <Text style={styles.providerLine}>{rv.provider}<Text style={styles.providerName}>{providerName}</Text></Text>
        ) : null}

        <Text style={styles.label}>{rv.ratingLabel}</Text>
        <View style={styles.starsRow}>
          {STARS.map((s) => (
            <TouchableOpacity key={s} onPress={() => setRating(s)} style={styles.starBtn}>
              <Text style={[styles.star, s <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 ? <Text style={styles.ratingLabel}>{rv.ratings[rating as keyof typeof rv.ratings]}</Text> : null}

        <Text style={[styles.label, { marginTop: 24 }]}>{rv.commentLabel}</Text>
        <TextInput style={[styles.input, styles.textarea]} placeholder={rv.commentPh} placeholderTextColor="#9CA3AF" value={comment} onChangeText={setComment} multiline textAlignVertical="top" maxLength={1000} />

        <TouchableOpacity style={[styles.btn, (loading || rating === 0) && styles.btnDisabled]} onPress={handleSubmit} disabled={loading || rating === 0}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{rv.btn}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 40 },
  taskBox: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, marginBottom: 16 },
  taskBoxLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  taskBoxTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  providerLine: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  providerName: { fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  starBtn: { padding: 4 },
  star: { fontSize: 42, color: '#E5E7EB' },
  starActive: { color: '#FBBF24' },
  ratingLabel: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 24 },
  textarea: { minHeight: 120, lineHeight: 22 },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
