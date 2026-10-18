import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { Icon } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { openInAppBrowser } from '@/lib/legal';

const WEBSITE = 'https://www.dastiyor.com';

export default function AboutScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const a = t.about;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.brand, { color: colors.accent }]}>Dastiyor</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>{a.tagline}</Text>
        <Text style={[styles.body, { color: colors.text }]}>{a.body}</Text>
      </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  label: { fontSize: 15, flex: 1 },
  value: { fontSize: 15, fontWeight: '600' },
});
