import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '@/components/AppText';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Icon, type IconName } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useConfig } from '@/lib/useConfig';
import { FAQ_URL, openInAppBrowser, openPrivacyPolicy, openTermsOfService } from '@/lib/legal';
import { openStoreReview, reportMailto, shareApp } from '@/lib/app-links';
import { Alert } from '@/lib/dialog';
import { GradientFill } from '@/components/Premium';

type Item = { icon: IconName; tint: string; label: string; run: () => void };

const BRAND = '#2563EB';
const LOGO = require('../assets/icon.png');

// ponytail: Modal + Animated slide instead of @react-navigation/drawer, which needs
// gesture-handler/reanimated native code and therefore a new store build. No swipe-to-open.
const WIDTH = Dimensions.get('window').width;

export function SideDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { config } = useConfig();
  const insets = useSafeAreaInsets();
  const x = useRef(new Animated.Value(-WIDTH)).current;
  const pending = useRef<(() => void) | undefined>(undefined);
  const m = t.menu;
  const version = Constants.expoConfig?.version ?? '';

  useEffect(() => {
    if (visible) Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 18 }).start();
  }, [visible, x]);

  // On iOS the in-app browser is presented on top of the topmost view controller. Opened while
  // this Modal was still on screen, it landed on the Modal, which then tore it down when it
  // dismissed (FAQ / privacy / terms crashed the app). So on iOS the action waits for onDismiss,
  // which only iOS fires.
  function close(then?: () => void) {
    Animated.timing(x, { toValue: -WIDTH, duration: 180, useNativeDriver: true }).start(() => {
      if (Platform.OS === 'ios') pending.current = then;
      onClose();
      if (Platform.OS !== 'ios') then?.();
    });
  }

  function onDismiss() {
    const then = pending.current;
    pending.current = undefined;
    then?.();
  }

  function report() {
    const email = config.company.supportEmail || config.company.email;
    const url = reportMailto(email, m.reportSubject, m.reportBody, {
      version, platform: Platform.OS, osVersion: String(Platform.Version), userId: user?.id,
    });
    Linking.openURL(url).catch(() => Alert.alert(m.report, `${m.noMail} ${email}`));
  }

  const sections: { title: string; items: Item[] }[] = [
    {
      title: m.sectionHelp,
      items: [
        { icon: 'help-circle', tint: '#2563EB', label: m.faq, run: () => { openInAppBrowser(FAQ_URL).catch(() => {}); } },
        { icon: 'chatbubble-ellipses', tint: '#0EA5E9', label: m.contact, run: () => router.push('/contact') },
        { icon: 'bug', tint: '#EF4444', label: m.report, run: report },
      ],
    },
    {
      title: m.sectionApp,
      items: [
        { icon: 'information-circle', tint: '#8B5CF6', label: m.about, run: () => router.push('/about') },
        { icon: 'share-social', tint: '#10B981', label: m.share, run: () => { shareApp(m.shareMessage); } },
        {
          icon: 'star', tint: '#F59E0B', label: Platform.OS === 'ios' ? m.rateIos : m.rateAndroid,
          run: () => { openStoreReview().catch(() => {}); },
        },
      ],
    },
    {
      title: m.sectionLegal,
      items: [
        { icon: 'document-text', tint: '#64748B', label: t.legal.privacy, run: () => { openPrivacyPolicy().catch(() => {}); } },
        { icon: 'shield-checkmark', tint: '#64748B', label: t.legal.terms, run: () => { openTermsOfService().catch(() => {}); } },
      ],
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()} onDismiss={onDismiss} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={() => close()} accessibilityLabel={t.navigation.back} />
      <Animated.View style={[styles.panel, { width: WIDTH, backgroundColor: colors.bg, transform: [{ translateX: x }] }]}>
        {/* Brand header */}
        <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          <GradientFill />
          <View style={styles.heroTop}>
            <Image source={LOGO} style={styles.logo} />
            <View style={{ flex: 1 }}>
              <Text style={styles.brandName}>Dastiyor</Text>
              <Text style={styles.brandTag} numberOfLines={2}>{t.about.tagline}</Text>
            </View>
            <TouchableOpacity onPress={() => close()} style={styles.closeBtn} accessibilityLabel={t.navigation.back} accessibilityRole="button">
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {sections.map((sec) => (
            <View key={sec.title} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{sec.title.toUpperCase()}</Text>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {sec.items.map((it, i) => (
                  <TouchableOpacity
                    key={it.label}
                    style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                    onPress={() => close(it.run)}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel={it.label}
                  >
                    <View style={[styles.tile, { backgroundColor: it.tint + (isDark ? '33' : '1A') }]}>
                      <Icon name={it.icon} size={20} color={it.tint} variant="Linear" />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={2}>{it.label}</Text>
                    <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          <Text style={[styles.version, { color: colors.textTertiary }]}>Dastiyor · v{version}</Text>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
  panel: {
    position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 6, height: 0 }, elevation: 24,
  },
  hero: { backgroundColor: BRAND, paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  brandName: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  brandTag: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 11 },
  tile: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 4 },
});
