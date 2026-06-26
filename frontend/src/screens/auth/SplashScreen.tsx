import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, StatusBar, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { colors, typography, borderRadius, shadows } from '../../theme';

const LOGO = require('../../../assets/logo_eng_white.png');

export const SplashScreen: React.FC = () => {
  const { isAuthenticated, role, initialize, isLoading } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Fade in + slide up over 800ms
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    initialize();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          router.replace('/customer/home');
        } else {
          router.replace('/auth/role-select');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, role]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      {/* Decorative circle top-left */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        {/* Logo on white card */}
        <View style={styles.logoCard}>
          <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
        </View>

        <Text style={styles.tagline}>
          शेतापासून घरापर्यंत · Farm to Doorstep
        </Text>
      </Animated.View>

      {/* Bottom powered-by */}
      <Animated.View style={[styles.bottomArea, { opacity: fadeAnim }]}>
        <View style={styles.dotRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorCircle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 24,
    ...shadows.lg,
    width: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.80)',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: colors.surface,
    width: 20,
  },
});

export default SplashScreen;
