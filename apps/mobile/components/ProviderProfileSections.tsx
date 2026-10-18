import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import type { PublicProfile } from '@dastiyor/types';
import type { Locale } from '@/lib/i18n';
import { plural } from '@/lib/intl';
import { useTheme } from '@/contexts/ThemeContext';
import { TierBadge } from '@/components/TierBadge';

type Sections = Pick<PublicProfile, 'experienceYears' | 'city' | 'categories' | 'isVerified' | 'tier' | 'ratingBreakdown' | 'reviewCount' | 'portfolio'>;

export interface ProviderSectionLabels {
  verified: string;
  years: readonly [string, string, string];
  portfolio: string;
  ratingBreakdown: string;
  tiers: Record<'basic' | 'standard' | 'premium', string>;
}

/** Facts, rating breakdown and portfolio on the provider screen. Values are canonical; `tr` is display only. */
export function ProviderProfileSections({ profile: p, labels: l, tr, locale }: {
  profile: Sections; labels: ProviderSectionLabels; tr: (v: string) => string; locale: Locale;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<{ uri: string; label: string } | null>(null);
  const max = Math.max(1, ...Object.values(p.ratingBreakdown));

  return (
    <View>
      <View style={styles.facts}>
        <TierBadge tier={p.tier} label={p.tier ? l.tiers[p.tier] : ''} />
        {p.isVerified && (
          <View style={styles.fact}>
            <Icon name="checkmark-circle" size={16} color="#059669" />
            <Text style={[styles.factText, { color: '#059669' }]}>{l.verified}</Text>
          </View>
        )}
        {p.city && (
          <View style={styles.fact}>
            <Icon name="location-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.factText, { color: colors.textSecondary }]}>{tr(p.city)}</Text>
          </View>
        )}
        {p.experienceYears != null && (
          <View style={styles.fact}>
            <Icon name="briefcase-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.factText, { color: colors.textSecondary }]}>{`${p.experienceYears} ${plural(p.experienceYears, locale, l.years)}`}</Text>
          </View>
        )}
      </View>

      {p.categories.length > 0 && (
        <View style={styles.chips}>
          {p.categories.map((c) => (
            <View key={c} style={[styles.chip, { backgroundColor: colors.iconBg }]}>
              <Text style={[styles.chipText, { color: colors.accent }]}>{tr(c)}</Text>
            </View>
          ))}
        </View>
      )}

      {p.portfolio.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{l.portfolio}</Text>
          {p.portfolio.map((proj) => (
            <View key={proj.id} style={styles.project}>
              <Text style={[styles.projectTitle, { color: colors.text }]}>{proj.title}</Text>
              {proj.description ? <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>{proj.description}</Text> : null}
              <View style={styles.photos}>
                {proj.images.map((uri, i) => {
                  const label = `${proj.title} ${i + 1}`;
                  return (
                    <TouchableOpacity key={uri + i} onPress={() => setOpen({ uri, label })} accessibilityLabel={label} accessibilityRole="imagebutton">
                      <Image source={{ uri }} style={styles.thumb} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}

      {p.reviewCount > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{l.ratingBreakdown}</Text>
          {([5, 4, 3, 2, 1] as const).map((star) => (
            <View key={star} style={styles.barRow} accessible accessibilityLabel={`${star}★: ${p.ratingBreakdown[star]}`}>
              <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{star}★</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.barFill, { width: `${(p.ratingBreakdown[star] / max) * 100}%` }]} />
              </View>
              <Text style={[styles.barCount, { color: colors.textSecondary }]}>{p.ratingBreakdown[star]}</Text>
            </View>
          ))}
        </View>
      )}

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <View style={styles.viewer}>
          {open && <Image source={{ uri: open.uri }} style={styles.full} resizeMode="contain" accessibilityLabel={`${open.label} full`} />}
          <TouchableOpacity style={styles.close} onPress={() => setOpen(null)} accessibilityLabel="Close" accessibilityRole="button">
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  facts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 12 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factText: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginBottom: 16 },
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 13, fontWeight: '600' },
  card: { marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  project: { marginBottom: 12 },
  projectTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 96, height: 96, borderRadius: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  barLabel: { width: 28, fontSize: 12 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
  barCount: { width: 24, fontSize: 12, textAlign: 'right' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
  close: { position: 'absolute', top: 48, right: 20, padding: 8 },
});
