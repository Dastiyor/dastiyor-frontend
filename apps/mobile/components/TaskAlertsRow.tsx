import { useEffect, useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Text } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, ApiError } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';

type AlertTier = 'free' | 'pro' | 'pro_plus' | 'business';
type AlertState = { enabled: boolean; plan: AlertTier };

/**
 * A provider's new-task alert switch (GET/PUT /api/profile/task-alerts), with
 * a line saying when alerts arrive on their plan. Hidden until the server has
 * answered, so it never shows a guessed value.
 */
export function TaskAlertsRow() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const s = t.taskAlerts;
  const [state, setState] = useState<AlertState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get<AlertState>('/api/profile/task-alerts')
      .then((res) => { if (alive) setState(res); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!state) return null;

  async function toggle(enabled: boolean) {
    const previous = state!;
    setState({ ...previous, enabled });
    setSaving(true);
    try {
      setState(await api.put<AlertState>('/api/profile/task-alerts', { enabled }));
    } catch (err) {
      setState(previous);
      Alert.alert(s.title, err instanceof ApiError && err.message ? err.message : s.saveError);
    } finally {
      setSaving(false);
    }
  }

  const hint = state.plan === 'free' ? s.hintFree : state.plan === 'pro' ? s.hintPro : s.hintInstant;

  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <Icon name="notifications-outline" size={22} color={colors.accent} style={styles.icon} />
      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.text }]}>{s.title}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>
      </View>
      <Switch
        value={state.enabled}
        onValueChange={toggle}
        disabled={saving}
        trackColor={{ false: colors.border, true: '#2563EB' }}
        thumbColor="#fff"
        accessibilityLabel={s.title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: { width: 28, textAlign: 'center', flexShrink: 0 },
  body: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  hint: { fontSize: 12, marginTop: 2, lineHeight: 16 },
});
