import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfig } from '@/lib/useConfig';


export default function ContactScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { config } = useConfig();
  const insets = useSafeAreaInsets();
  const c = t.contact;
  const co = config.company;

  // Admin can clear any field; a cleared one is left out rather than shown empty.
  type Row = { icon: IconName; label: string; value: string; url?: string };
  const rows = ([
    { icon: 'mail-outline', label: c.email, value: co.email, url: `mailto:${co.email}` },
    { icon: 'help-buoy-outline', label: c.support, value: co.supportEmail, url: `mailto:${co.supportEmail}` },
    { icon: 'call-outline', label: c.phone, value: co.phone, url: `tel:${co.phone.replace(/[^\d+]/g, '')}` },
    { icon: 'location-outline', label: c.address, value: co.address },
  ] as Row[]).filter((r) => r.value);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>{c.intro}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {rows.map((r, i) => (
          <TouchableOpacity
            key={r.label}
            disabled={!r.url}
            onPress={() => { if (r.url) Linking.openURL(r.url).catch(() => {}); }}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            accessibilityRole={r.url ? 'link' : 'text'}
          >
            <Icon name={r.icon} size={22} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{r.label}</Text>
              <Text style={[styles.value, { color: r.url ? colors.accent : colors.text }]}>{r.value}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  card: { borderRadius: 16, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  label: { fontSize: 13 },
  value: { fontSize: 16, fontWeight: '600', marginTop: 2 },
});
