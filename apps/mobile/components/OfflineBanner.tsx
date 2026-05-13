import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setOnNetworkError } from '@/lib/api-client';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOnNetworkError(() => {
      setOffline(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setOffline(false), 4000);
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
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
        },
      ]}
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>Нет подключения к интернету</Text>
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
    paddingVertical: 10,
    paddingTop: 52,
    zIndex: 10000,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
