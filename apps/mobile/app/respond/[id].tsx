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

export default function RespondScreen() {
  const { id: taskId, title } = useLocalSearchParams<{ id: string; title: string }>();
  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!message.trim()) {
      Alert.alert('Ошибка', 'Напишите сообщение заказчику');
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('Ошибка', 'Укажите вашу цену');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/responses', {
        taskId,
        message: message.trim(),
        price: Number(price),
        estimatedTime: estimatedTime.trim() || undefined,
      });
      Alert.alert('Готово', 'Отклик отправлен!', [
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
        {title ? (
          <View style={styles.taskBox}>
            <Text style={styles.taskBoxLabel}>Задание</Text>
            <Text style={styles.taskBoxTitle} numberOfLines={2}>{title}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Ваше предложение *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Опишите как вы выполните задание, ваш опыт, условия..."
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Ваша цена (TJS) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Например: 200"
          placeholderTextColor="#9CA3AF"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Срок выполнения</Text>
        <TextInput
          style={styles.input}
          placeholder="Например: 2 дня, 3 часа"
          placeholderTextColor="#9CA3AF"
          value={estimatedTime}
          onChangeText={setEstimatedTime}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Отправить отклик</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 40 },
  taskBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  taskBoxLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  taskBoxTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 18,
  },
  textarea: { minHeight: 120, lineHeight: 22 },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
