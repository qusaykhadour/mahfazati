import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from './Logo';
import { useStore } from '../lib/store';

const USE_NATIVE = Platform.OS !== 'web';

export function SplashIntro() {
  const theme = useStore().theme;
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleShift = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: USE_NATIVE,
        }),
      ]),
      Animated.timing(titleShift, {
        toValue: 0,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 340,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE,
      }).start(() => setVisible(false));
    }, 1250);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, titleShift, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity, zIndex: 100 }}
    >
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View
          style={{ transform: [{ scale: logoScale }], opacity: logoOpacity, alignItems: 'center' }}
        >
          <Logo size={104} withBackground={false} />
        </Animated.View>

        <Animated.View
          style={{
            alignItems: 'center',
            gap: 6,
            marginTop: 18,
            opacity: logoOpacity,
            transform: [{ translateY: titleShift }],
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 27, fontWeight: '900', letterSpacing: 0.5 }}>
            محفظتي
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12.5 }}>
            مصاريفك وديونك ومدخراتك — محلياً على جهازك
          </Text>
        </Animated.View>

        <View
          style={{
            position: 'absolute',
            bottom: 54,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <View style={{ width: 5, height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.55)' }} />
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>ل.س · $</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
