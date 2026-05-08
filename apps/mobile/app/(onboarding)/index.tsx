import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useLanguage } from '@/contexts/LanguageContext';

const { width } = Dimensions.get('window');

const SLIDES_RU = [
  {
    id: '1',
    emoji: '🛠️',
    title: 'Найдите исполнителя',
    subtitle: 'Размещайте задания и получайте отклики от проверенных мастеров и специалистов Таджикистана.',
    bg: '#2563EB',
    accent: '#EFF6FF',
  },
  {
    id: '2',
    emoji: '📋',
    title: 'Опишите задачу',
    subtitle: 'Укажите что нужно сделать, бюджет и сроки. Исполнители сами напишут вам с предложениями.',
    bg: '#0F172A',
    accent: '#F0FDF4',
  },
  {
    id: '3',
    emoji: '🤝',
    title: 'Безопасно и надёжно',
    subtitle: 'Все исполнители проходят проверку. Оставляйте отзывы и выбирайте лучших.',
    bg: '#059669',
    accent: '#F0FDF4',
  },
];

const SLIDES_TJ = [
  {
    id: '1',
    emoji: '🛠️',
    title: 'Иҷрокунандаро ёбед',
    subtitle: 'Супоришҳо гузоред ва аз мутахассисони санҷидашудаи Тоҷикистон посух гиред.',
    bg: '#2563EB',
    accent: '#EFF6FF',
  },
  {
    id: '2',
    emoji: '📋',
    title: 'Вазифаро тавсиф кунед',
    subtitle: 'Нишон диҳед чӣ бояд карда шавад, буҷет ва мӯҳлат. Иҷрокунандагон худ бо пешниҳодҳо менависанд.',
    bg: '#0F172A',
    accent: '#F0FDF4',
  },
  {
    id: '3',
    emoji: '🤝',
    title: 'Бехатар ва боэтимод',
    subtitle: 'Ҳамаи иҷрокунандагон санҷида мешаванд. Шарҳ гузоред ва беҳтаринро интихоб кунед.',
    bg: '#059669',
    accent: '#F0FDF4',
  },
];

const NEXT_RU = ['Далее', 'Далее', 'Начать'];
const NEXT_TJ = ['Навбатӣ', 'Навбатӣ', 'Оғоз кардан'];

export default function OnboardingScreen() {
  const { locale } = useLanguage();
  const slides = locale === 'tj' ? SLIDES_TJ : SLIDES_RU;
  const nextLabels = locale === 'tj' ? NEXT_TJ : NEXT_RU;

  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  async function finish() {
    await SecureStore.setItemAsync('onboarding_done', '1');
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

  function skip() {
    finish();
  }

  const slide = slides[index];

  return (
    <View style={[styles.container, { backgroundColor: slide.bg }]}>
      <TouchableOpacity style={styles.skipBtn} onPress={skip}>
        <Text style={styles.skipText}>{locale === 'tj' ? 'Гузаштан' : 'Пропустить'}</Text>
      </TouchableOpacity>

      <Animated.FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.emojiWrap, { backgroundColor: item.accent + '30' }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextText}>{nextLabels[index]}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  skipText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emojiWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emoji: { fontSize: 64 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 52,
    alignItems: 'center',
    gap: 28,
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  nextBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nextText: { fontSize: 17, fontWeight: '800', color: '#111827' },
});
