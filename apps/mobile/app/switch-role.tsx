import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/AppText';
import { GradientButton } from '@/components/Premium';
import { api } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { translateServerError } from '@/lib/serverErrors';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

type Role = 'CUSTOMER' | 'PROVIDER';

interface Preview {
  role: Role;
  target: Role;
  openTasks: number;
  pendingResponses: number;
  /** Russian server text when the switch is not allowed right now. */
  blocker: string | null;
}

/**
 * Switch between customer and provider, for people who picked the wrong role at
 * signup. Opened from Profile and from the "looks like an ad" warning when posting.
 */
export default function SwitchRoleScreen() {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const { switchRole } = useAuth();
  const insets = useSafeAreaInsets();
  const s = t.switchRole;

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Preview>('/api/account/role')
      .then(setPreview)
      .catch((e) => setLoadError((e as Error).message));
  }, []);

  async function handleSwitch() {
    if (!preview || busy) return;
    setBusy(true);
    try {
      await switchRole(preview.target);
      Alert.alert(t.common.done, s.done, [{ text: t.common.ok, onPress: () => router.replace('/(tabs)') }]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
      setBusy(false);
    }
  }

  const toProvider = preview?.target === 'PROVIDER';
  const accent = toProvider ? '#EA580C' : '#2563EB';

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
    >
      {!preview && !loadError && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      {preview && (
        <>
          <Text style={[styles.current, { color: colors.textSecondary }]}>
            {s.current.replace('{role}', preview.role === 'PROVIDER' ? s.provider : s.customer)}
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accent }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {toProvider ? s.toProviderTitle : s.toCustomerTitle}
            </Text>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
              {toProvider ? s.toProviderDesc : s.toCustomerDesc}
            </Text>
          </View>

          {preview.blocker ? (
            <Text style={styles.error}>{translateServerError(preview.blocker, locale)}</Text>
          ) : (
            <>
              {preview.openTasks > 0 && (
                <Text style={styles.warning}>{s.openTasks.replace('{count}', String(preview.openTasks))}</Text>
              )}
              {preview.pendingResponses > 0 && (
                <Text style={styles.warning}>{s.pendingResponses.replace('{count}', String(preview.pendingResponses))}</Text>
              )}
              <GradientButton
                style={[styles.btn, busy && styles.btnDisabled]}
                onPress={handleSwitch}
                disabled={busy}
                accessibilityLabel={s.confirm}
                accessibilityRole="button"
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{s.confirm}</Text>}
              </GradientButton>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, width: '100%', maxWidth: 560, alignSelf: 'center' },
  current: { fontSize: 15, marginBottom: 16 },
  card: { borderWidth: 2, borderRadius: 16, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardBody: { fontSize: 14, lineHeight: 20 },
  warning: { backgroundColor: '#FFF7ED', color: '#9A3412', padding: 12, borderRadius: 10, fontSize: 14, lineHeight: 20, marginBottom: 12, overflow: 'hidden' },
  error: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 12, borderRadius: 10, fontSize: 14, lineHeight: 20, marginBottom: 12, overflow: 'hidden' },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
