import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { PromotionStatus } from '@dastiyor/types';
import { Text } from '@/components/AppText';
import { ChipGroup } from '@/components/ChipGroup';
import { GradientButton } from '@/components/Premium';
import { api } from '@/lib/api-client';
import { Alert } from '@/lib/dialog';
import { formatDushanbe } from '@/lib/intl';
import { useTheme } from '@/contexts/ThemeContext';

export interface PromotionLabels {
  title: string; desc: string; credits: string; resets: string; activeUntil: string; promote: string;
  pinTitle: string; pinDesc: string; pin: string; pinnedUntil: string; slotFull: string; noCategories: string;
  started: string; pinned: string; error: string;
}

const fill = (text: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), text);

/**
 * Paid-plan promotions: credits left this period, a 24-hour promotion, and
 * for BUSINESS a 24-hour pin in one of the profile's categories.
 * Renders nothing on FREE or when the server predates /api/promotions.
 * `tr` localizes a canonical Russian category for display; the Russian name is what is sent.
 */
export function PromotionCard({ labels: l, tr }: { labels: PromotionLabels; tr: (value: string) => string }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<PromotionStatus | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get<PromotionStatus>('/api/promotions').then((s) => {
    setStatus(s ?? null);
    setCategory((current) => current ?? s?.pinSlots.find((x) => !x.nextFreeAt)?.category ?? null);
  }).catch(() => {}), []);

  useEffect(() => { load(); }, [load]);

  async function start(pinCategory?: string) {
    setBusy(true);
    try {
      const res = await api.post<{ status: PromotionStatus }>('/api/promotions', pinCategory ? { category: pinCategory } : {});
      setStatus(res.status);
      Alert.alert(pinCategory ? l.pinned : l.started);
    } catch (e) {
      Alert.alert(l.error, (e as Error).message);
      // A slot may have been taken meanwhile: refresh so the chips show when the next one frees up.
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!status?.plan) return null;

  const outOfCredits = status.remaining <= 0;
  const free = status.pinSlots.filter((s) => !s.nextFreeAt);
  const full = status.pinSlots.filter((s) => s.nextFreeAt);
  const chosen = free.some((s) => s.category === category) ? category : null;
  const sub = { color: colors.textSecondary };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{l.title}</Text>
      <Text style={sub}>{l.desc}</Text>
      <Text style={{ color: colors.text, fontWeight: '600' }}>{fill(l.credits, { remaining: status.remaining, limit: status.limit })}</Text>
      {status.periodEnd && <Text style={[styles.note, sub]}>{fill(l.resets, { date: formatDushanbe(status.periodEnd) })}</Text>}

      {status.promotion ? (
        <Text style={styles.active}>{fill(l.activeUntil, { date: formatDushanbe(status.promotion.endsAt) })}</Text>
      ) : (
        <GradientButton style={[styles.btn, (busy || outOfCredits) && styles.off]} disabled={busy || outOfCredits} onPress={() => start()} accessibilityRole="button">
          <Text style={styles.btnText}>{l.promote}</Text>
        </GradientButton>
      )}

      {status.canPin && (
        <View style={[styles.pin, { borderTopColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{l.pinTitle}</Text>
          <Text style={sub}>{l.pinDesc}</Text>
          {status.pin ? (
            <Text style={styles.active}>{fill(l.pinnedUntil, { category: tr(status.pin.category ?? ''), date: formatDushanbe(status.pin.endsAt) })}</Text>
          ) : status.pinSlots.length === 0 ? (
            <Text style={sub}>{l.noCategories}</Text>
          ) : (
            <>
              {free.length > 0 && (
                <ChipGroup
                  options={free.map((s) => ({ value: s.category, label: tr(s.category) }))}
                  value={chosen ?? ''}
                  onChange={setCategory}
                  getLabel={(o) => (o as { label: string }).label}
                  getValue={(o) => (o as { value: string }).value}
                />
              )}
              {full.map((s) => (
                <Text key={s.category} style={[styles.note, sub]}>{`${tr(s.category)}: ${fill(l.slotFull, { date: formatDushanbe(s.nextFreeAt!) })}`}</Text>
              ))}
              <GradientButton
                style={[styles.btn, (busy || outOfCredits || !chosen) && styles.off]}
                disabled={busy || outOfCredits || !chosen}
                onPress={() => chosen && start(chosen)}
                accessibilityRole="button"
              >
                <Text style={styles.btnText}>{l.pin}</Text>
              </GradientButton>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 6, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  note: { fontSize: 12, lineHeight: 17 },
  active: { color: '#2563EB', fontWeight: '700' },
  btn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  off: { opacity: 0.6 },
  pin: { borderTopWidth: 1, marginTop: 8, paddingTop: 10, gap: 6 },
});
