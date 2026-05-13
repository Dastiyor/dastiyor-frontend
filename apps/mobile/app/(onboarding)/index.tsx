import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { type Locale } from '@/lib/i18n';
import * as SecureStore from 'expo-secure-store';
import {
  Illustration1,
  Illustration2,
  Illustration3,
} from '@/components/OnboardingIllustrations';

const { width, height } = Dimensions.get('window');
const ILLUS_HEIGHT = Math.round(height * 0.50);

interface Slide {
  id: string;
  Illustration: React.ComponentType<{ width: number; height: number }>;
  title: string;
  subtitle: string;
}

const SLIDES: Record<Locale, Slide[]> = {
  ru: [
    {
      id: '1',
      Illustration: Illustration1,
      title: 'Найдите исполнителя',
      subtitle: 'Размещайте задания и получайте отклики от проверенных мастеров Таджикистана.',
    },
    {
      id: '2',
      Illustration: Illustration2,
      title: 'Опишите задачу',
      subtitle: 'Укажите что нужно сделать, бюджет и сроки. Исполнители сами напишут вам.',
    },
    {
      id: '3',
      Illustration: Illustration3,
      title: 'Безопасно и надёжно',
      subtitle: 'Все исполнители проходят проверку. Оставляйте отзывы и выбирайте лучших.',
    },
  ],
  tj: [
    {
      id: '1',
      Illustration: Illustration1,
      title: 'Иҷрокунандаро ёбед',
      subtitle: 'Супоришҳо гузоред ва аз мутахассисони санҷидашудаи Тоҷикистон посух гиред.',
    },
    {
      id: '2',
      Illustration: Illustration2,
      title: 'Вазифаро тавсиф кунед',
      subtitle: 'Нишон диҳед чӣ бояд карда шавад, буҷет ва мӯҳлат. Иҷрокунандагон менависанд.',
    },
    {
      id: '3',
      Illustration: Illustration3,
      title: 'Бехатар ва боэтимод',
      subtitle: 'Ҳамаи иҷрокунандагон санҷида мешаванд. Шарҳ гузоред ва беҳтаринро интихоб кунед.',
    },
  ],
  en: [
    {
      id: '1',
      Illustration: Illustration1,
      title: 'Find Trusted Professionals',
      subtitle: 'Connect with vetted experts for cleaning, repairs, and more.',
    },
    {
      id: '2',
      Illustration: Illustration2,
      title: 'Book in Seconds',
      subtitle: "Choose a service, pick a time, and confirm. It's that simple.",
    },
    {
      id: '3',
      Illustration: Illustration3,
      title: 'Quality Guaranteed',
      subtitle: 'Your satisfaction is our priority. Secure payments and verified reviews.',
    },
  ],
};

const NEXT_LABELS: Record<Locale, string[]> = {
  ru: ['Далее', 'Далее', 'Начать'],
  tj: ['Навбатӣ', 'Навбатӣ', 'Оғоз кардан'],
  en: ['Next', 'Next', 'Get Started'],
};

const SKIP_LABELS: Record<Locale, string> = {
  ru: 'Пропустить',
  tj: 'Гузаштан',
  en: 'Skip',
};

const LANG_OPTIONS: { locale: Locale; label: string; sub: string }[] = [
  { locale: 'ru', label: 'Русский', sub: 'Russian' },
  { locale: 'tj', label: 'Тоҷикӣ', sub: 'Tajik' },
  ...(__DEV__ ? [{ locale: 'en' as Locale, label: 'English', sub: 'English' }] : []),
];

const LANG_CODE: Record<Locale, string> = { ru: 'RU', tj: 'TJ', en: 'EN' };

const SELECT_LANG_LABEL: Record<Locale, string> = {
  ru: 'Выберите язык',
  tj: 'Забонро интихоб кунед',
  en: 'Select Language',
};

export default function OnboardingScreen() {
  const { locale, setLocale } = useLanguage();
  const [index, setIndex] = useState(0);
  const [langModal, setLangModal] = useState(false);
  const insets = useSafeAreaInsets();

  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const slides = SLIDES[locale] ?? SLIDES.ru;
  const nextLabels = NEXT_LABELS[locale] ?? NEXT_LABELS.ru;
  const skipLabel = SKIP_LABELS[locale] ?? SKIP_LABELS.ru;

  async function finish() {
    await SecureStore.setItemAsync('onboarding_done', '1').catch(() => {});
    router.replace('/(auth)/register');
  }

  function next() {
    if (index < slides.length - 1) {
      const nextIndex = index + 1;
      flatRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setIndex(nextIndex);
    } else {
      finish();
    }
  }

  async function pickLang(loc: Locale) {
    await setLocale(loc);
    setLangModal(false);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Slide strip (illustration only, full-width) */}
      <Animated.FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(newIndex);
        }}
        style={styles.flatList}
        renderItem={({ item }) => (
          <View style={styles.illustrationSlide}>
            <item.Illustration width={width} height={ILLUS_HEIGHT} />
          </View>
        )}
      />

      {/* Overlay header (lang + skip) sits on top of illustration */}
      <View style={[styles.header, { top: insets.top + 8 }]}>
        {index === 0 ? (
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setLangModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={18} color="#464554" />
            <Text style={styles.langBtnText}>{LANG_CODE[locale]}</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.7}>
          <Text style={styles.skipText}>{skipLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom white content */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });
            const bg = scrollX.interpolate({
              inputRange,
              outputRange: ['#dde0e1', '#4648d4', '#dde0e1'],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, backgroundColor: bg }]}
              />
            );
          })}
        </View>

        {/* Text */}
        <View style={styles.textGroup}>
          <Text style={styles.title}>{slides[index]?.title}</Text>
          <Text style={styles.subtitle}>{slides[index]?.subtitle}</Text>
        </View>

        {/* Next button */}
        <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.nextText}>{nextLabels[index]}</Text>
          {index < slides.length - 1 && (
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Language Modal */}
      <Modal
        visible={langModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLangModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{SELECT_LANG_LABEL[locale]}</Text>
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
                  <Text style={[styles.langOptionLabel, active && styles.langOptionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.langOptionSub}>{opt.sub}</Text>
                  {active && (
                    <Ionicons name="checkmark" size={18} color="#4648d4" style={styles.langCheck} />
                  )}
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
  },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#464554',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#464554',
  },
  flatList: {
    height: ILLUS_HEIGHT,
    flexGrow: 0,
  },
  illustrationSlide: {
    width,
    height: ILLUS_HEIGHT,
    overflow: 'hidden',
  },
  bottom: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  textGroup: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#191c1d',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#5a5a72',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 300,
  },
  nextBtn: {
    backgroundColor: '#4648d4',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
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
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.1,
  },
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1d',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 4,
  },
  langOptionActive: {
    backgroundColor: '#f3f4f5',
  },
  langOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#191c1d',
    flex: 1,
  },
  langOptionLabelActive: {
    color: '#4648d4',
  },
  langOptionSub: {
    fontSize: 13,
    color: '#767586',
    marginRight: 4,
  },
  langCheck: {
    marginLeft: 2,
  },
});
