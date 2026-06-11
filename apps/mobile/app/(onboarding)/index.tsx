import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LogoMark } from '@/components/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { type Locale } from '@/lib/i18n';
import * as storage from '@/lib/storage';
import { useState } from 'react';

const LANG_OPTIONS: { locale: Locale; label: string; sub: string }[] = [
  { locale: 'ru', label: 'Русский', sub: 'Russian' },
  { locale: 'tj', label: 'Тоҷикӣ', sub: 'Tajik' },
  { locale: 'en', label: 'English', sub: 'English' },
];

const LANG_CODE: Record<Locale, string> = { ru: 'RU', tj: 'TJ', en: 'EN' };

const CONTENT: Record<Locale, {
  tagline: string;
  description: string;
  features: { icon: string; title: string; body: string }[];
  cta: string;
  langTitle: string;
}> = {
  ru: {
    tagline: 'Маркетплейс услуг Таджикистана',
    description: 'Разместите задание — мастера сами напишут вам с ценой и сроками.',
    features: [
      { icon: 'search-outline', title: 'Найдите мастера', body: 'Ремонт, уборка, доставка, IT и десятки других категорий.' },
      { icon: 'chatbubble-ellipses-outline', title: 'Общайтесь напрямую', body: 'Чат с исполнителем без посредников и скрытых комиссий.' },
      { icon: 'shield-checkmark-outline', title: 'Надёжно', body: 'Реальные отзывы, рейтинги и проверенные профили.' },
    ],
    cta: 'Начать',
    langTitle: 'Выберите язык',
  },
  tj: {
    tagline: 'Бозори хизматрасонии Тоҷикистон',
    description: 'Супориш гузоред — устоҳо бо нарх ва мӯҳлат худашон менависанд.',
    features: [
      { icon: 'search-outline', title: 'Устоеро ёбед', body: 'Таъмир, тозакорӣ, расонидан, IT ва даҳҳо категорияи дигар.' },
      { icon: 'chatbubble-ellipses-outline', title: 'Мустақим муошират', body: 'Чат бо иҷрокунанда бе миёнарав ва комиссияи пинҳон.' },
      { icon: 'shield-checkmark-outline', title: 'Боэтимод', body: 'Шарҳҳои воқеӣ, рейтингҳо ва профилҳои санҷидашуда.' },
    ],
    cta: 'Оғоз кардан',
    langTitle: 'Забонро интихоб кунед',
  },
  en: {
    tagline: 'Tajikistan\'s Services Marketplace',
    description: 'Post a task and let skilled professionals come to you with offers.',
    features: [
      { icon: 'search-outline', title: 'Find a Pro', body: 'Repairs, cleaning, delivery, IT, and dozens more categories.' },
      { icon: 'chatbubble-ellipses-outline', title: 'Chat Directly', body: 'Talk to your provider with no middlemen or hidden fees.' },
      { icon: 'shield-checkmark-outline', title: 'Trusted & Safe', body: 'Real reviews, ratings, and verified profiles.' },
    ],
    cta: 'Get Started',
    langTitle: 'Select Language',
  },
};

export default function OnboardingScreen() {
  const { locale, setLocale } = useLanguage();
  const [langModal, setLangModal] = useState(false);
  const insets = useSafeAreaInsets();

  const c = CONTENT[locale] ?? CONTENT.ru;

  async function finish() {
    await storage.setItem('onboarding_done', '1').catch(() => {});
    router.replace('/(auth)/register');
  }

  async function pickLang(loc: Locale) {
    await setLocale(loc);
    setLangModal(false);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Lang picker top-right */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.langBtn} onPress={() => setLangModal(true)} activeOpacity={0.7}>
          <Ionicons name="globe-outline" size={16} color="#4648d4" />
          <Text style={styles.langBtnText}>{LANG_CODE[locale]}</Text>
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <LogoMark size={56} />
        </View>
        <Text style={styles.appName}>Dastiyor</Text>
        <Text style={styles.tagline}>{c.tagline}</Text>
        <Text style={styles.description}>{c.description}</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {c.features.map((f) => (
          <View key={f.icon} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon as any} size={22} color="#4648d4" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.cta} onPress={finish} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={c.cta}>
        <Text style={styles.ctaText}>{c.cta}</Text>
        <Ionicons name="arrow-forward" size={20} color="#ffffff" />
      </TouchableOpacity>

      {/* Language modal */}
      <Modal visible={langModal} transparent animationType="fade" onRequestClose={() => setLangModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLangModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{c.langTitle}</Text>
              <TouchableOpacity onPress={() => setLangModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#464554" />
              </TouchableOpacity>
            </View>
            {LANG_OPTIONS.map((opt) => {
              const active = locale === opt.locale;
              return (
                <TouchableOpacity
                  key={opt.locale}
                  style={[styles.langOption, active && styles.langOptionActive]}
                  onPress={() => pickLang(opt.locale)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langOptionLabel, active && styles.langOptionLabelActive]}>{opt.label}</Text>
                  <Text style={styles.langOptionSub}>{opt.sub}</Text>
                  {active && <Ionicons name="checkmark" size={18} color="#4648d4" style={styles.langCheck} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
  },

  topRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e0e0f0',
  },
  langBtnText: { fontSize: 13, fontWeight: '700', color: '#4648d4' },

  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 8,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#eeeeff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#191c1d',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4648d4',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#5a5a72',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  features: {
    gap: 14,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eeeeff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#191c1d', marginBottom: 2 },
  featureBody: { fontSize: 13, color: '#5a5a72', lineHeight: 19 },

  cta: {
    backgroundColor: '#4648d4',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#4648d4',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#ffffff', letterSpacing: 0.1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edeeef',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#191c1d' },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 4,
  },
  langOptionActive: { backgroundColor: '#f3f4f5' },
  langOptionLabel: { fontSize: 15, fontWeight: '600', color: '#191c1d', flex: 1 },
  langOptionLabelActive: { color: '#4648d4' },
  langOptionSub: { fontSize: 13, color: '#767586', marginRight: 4 },
  langCheck: { marginLeft: 2 },
});
