import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setOnNetworkError, setOnNetworkRecovered } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  useEffect(() => {
    setOnNetworkError(() => {
      setOffline(true);
      if (timer.current) clearTimeout(timer.current);
      // Auto-dismiss after 6s as fallback if recovery callback never fires
      timer.current = setTimeout(() => setOffline(false), 6000);
    });
    setOnNetworkRecovered(() => {
      setOffline(false);
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    });
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: offline ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [offline]);

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          paddingTop: insets.top + 10,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-(insets.top + 40), 0] }) }],
        },
      ]}
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>{t.common.noInternet}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 10,
    zIndex: 10000,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
