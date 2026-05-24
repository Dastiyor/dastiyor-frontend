import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function RespondScreen() {
  const { id: taskId, title } = useLocalSearchParams<{ id: string; title: string }>();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const r = t.respond;
  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!message.trim()) { Alert.alert(t.common.error, r.errMsg); return; }
    if (!price.trim() || isNaN(Number(price))) { Alert.alert(t.common.error, r.errPrice); return; }
    setLoading(true);
    try {
      await api.post('/api/responses', { taskId, message: message.trim(), price: Number(price), estimatedTime: estimatedTime.trim() || undefined });
      Alert.alert(t.common.done, r.sent, [{ text: t.common.ok, onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = [styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }];

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {title ? (
          <View style={[styles.taskBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.taskBoxLabel, { color: colors.textTertiary }]}>{r.task}</Text>
            <Text style={[styles.taskBoxTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
          </View>
        ) : null}

        <Text style={[styles.label, { color: colors.text }]}>{r.offerLabel}</Text>
        <TextInput style={[...inputStyle, styles.textareaNoMb]} placeholder={r.offerPh} placeholderTextColor={colors.textTertiary} value={message} onChangeText={setMessage} multiline numberOfLines={5} textAlignVertical="top" maxLength={1000} />
        <Text style={styles.charCount}>{message.length}/1000</Text>

        <Text style={[styles.label, { color: colors.text }]}>{r.priceLabel}</Text>
        <TextInput style={inputStyle} placeholder={r.pricePh} placeholderTextColor={colors.textTertiary} value={price} onChangeText={setPrice} keyboardType="numeric" maxLength={10} />

        <Text style={[styles.label, { color: colors.text }]}>{r.timeLabel}</Text>
        <TextInput style={inputStyle} placeholder={r.timePh} placeholderTextColor={colors.textTertiary} value={estimatedTime} onChangeText={setEstimatedTime} maxLength={100} />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading} accessibilityLabel={r.btn} accessibilityRole="button">
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{r.btn}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  taskBox: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, marginBottom: 24 },
  taskBoxLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  taskBoxTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 18 },
  textarea: { minHeight: 120, lineHeight: 22 },
  textareaNoMb: { minHeight: 120, lineHeight: 22, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 4 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 18 },
  button: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
