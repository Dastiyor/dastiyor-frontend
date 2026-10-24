import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/AppText';
import Constants from 'expo-constants';
import { Icon, type IconName } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { openInAppBrowser } from '@/lib/legal';

const WEBSITE = 'https://www.dastiyor.com';

export default function AboutScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const a = t.about;

  const lists: { icon: IconName; tint: string; title: string; items: readonly string[] }[] = [
    { icon: 'person-outline', tint: '#2563EB', title: a.customersTitle, items: a.customers },
    { icon: 'briefcase-outline', tint: '#10B981', title: a.providersTitle, items: a.providers },
    { icon: 'shield-checkmark-outline', tint: '#8B5CF6', title: a.trustTitle, items: a.trust },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.brand, { color: colors.accent }]}>Dastiyor</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>{a.tagline}</Text>
        <Text style={[styles.body, { color: colors.text }]}>{a.body}</Text>
        <Text style={[styles.body, { color: colors.text }]}>{a.mission}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.heading, { color: colors.text }]}>{a.howTitle}</Text>
        {a.how.map((step, i) => (
          <View key={step.title} style={styles.step}>
            <View style={[styles.stepNum, { backgroundColor: colors.iconBg }]}>
              <Text style={[styles.stepNumText, { color: colors.accent }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step.text}</Text>
            </View>
          </View>
        ))}
      </View>

      {lists.map((list) => (
        <View key={list.title} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.headingRow}>
            <View style={[styles.tile, { backgroundColor: list.tint + (isDark ? '33' : '1A') }]}>
              <Icon name={list.icon} size={20} color={list.tint} />
            </View>
            <Text style={[styles.heading, { color: colors.text }]}>{list.title}</Text>
          </View>
          {list.items.map((item) => (
            <View key={item} style={styles.bullet}>
              <Icon name="checkmark" size={18} color={list.tint} />
              <Text style={[styles.bulletText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.row} onPress={() => { openInAppBrowser(WEBSITE).catch(() => {}); }} accessibilityRole="link">
          <Icon name="globe-outline" size={20} color={colors.accent} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>{a.website}</Text>
          <Text style={[styles.value, { color: colors.accent }]}>dastiyor.com</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <Icon name="phone-portrait-outline" size={20} color={colors.accent} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>{a.version}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{Constants.expoConfig?.version ?? '—'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20, marginBottom: 12, gap: 8 },
  brand: { fontSize: 28, fontWeight: '800' },
  tagline: { fontSize: 14 },
  body: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  heading: { fontSize: 17, fontWeight: '700' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  tile: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 12, marginTop: 8 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 14, fontWeight: '800' },
  stepTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  stepText: { fontSize: 14, lineHeight: 20 },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  label: { fontSize: 15, flex: 1 },
  value: { fontSize: 15, fontWeight: '600' },
});
