import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useRatingsStore } from '../../store/ratingsStore';

export default function OrderConfirmScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { pendingDeliveryProductIds, markPendingAsDelivered } = useRatingsStore();
  const [markedReceived, setMarkedReceived] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleCopyOrderId = () => {
    if (orderId) {
      Clipboard.setString(orderId);
    }
  };

  const handleTrackOrder = () => {
    router.push({ pathname: '/customer/order-tracking', params: { orderId } });
  };

  const handleContinueShopping = () => {
    router.replace('/customer/home');
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor='#F0FDFA' />

      {/* Subtle teal gradient background layers */}
      <View style={styles.bgBase} />
      <View style={styles.bgLayer} />

      <View style={styles.inner}>
        {/* Animated checkmark circle */}
        <Animated.View style={[styles.checkWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark-circle" size={48} color={colors.textInverse} />
          </View>
        </Animated.View>

        {/* Heading */}
        <Text style={styles.heading}>Order Placed! 🎉</Text>

        {/* Bilingual subtitle */}
        <Text style={styles.subtitleMr}>आपली ऑर्डर यशस्वीपणे दिली गेली!</Text>
        <Text style={styles.subtitleEn}>Your order has been placed successfully!</Text>

        {/* Order ID card */}
        {orderId ? (
          <View style={styles.orderIdCard}>
            <Text style={styles.orderIdLabel}>Order ID:</Text>
            <Text style={styles.orderIdValue}>#{orderId}</Text>
            <TouchableOpacity onPress={handleCopyOrderId} hitSlop={8} style={styles.copyBtn}>
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Estimated delivery */}
        <View style={styles.deliveryRow}>
          <View style={styles.deliveryIconWrap}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.deliveryText}>2–5 Business Days</Text>
        </View>

        {/* Mark as received — enables rating on product cards */}
        {pendingDeliveryProductIds.length > 0 && !markedReceived && (
          <TouchableOpacity
            style={styles.receivedBtn}
            onPress={() => { markPendingAsDelivered(); setMarkedReceived(true); }}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done-outline" size={18} color={colors.success} />
            <Text style={styles.receivedBtnText}>I've Received My Order</Text>
          </TouchableOpacity>
        )}
        {markedReceived && (
          <View style={styles.receivedConfirm}>
            <Ionicons name="star-outline" size={15} color={colors.primary} />
            <Text style={styles.receivedConfirmText}>
              You can now rate these products from the home screen.
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.btnGroup}>
          <TouchableOpacity style={styles.trackBtn} onPress={handleTrackOrder}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={styles.trackBtnText}>Track Order</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shopBtn} onPress={handleContinueShopping}>
            <Ionicons name="storefront-outline" size={18} color={colors.textInverse} />
            <Text style={styles.shopBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDFA',
  },

  // ── Background layers for gradient feel ──
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F0FDFA',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryPastel,
    opacity: 0.45,
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
    bottom: '45%',
  },

  // ── Content ──
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  // ── Checkmark ──
  checkWrap: {
    marginBottom: spacing.xl,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },

  // ── Text ──
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitleMr: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitleEn: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },

  // ── Order ID ──
  orderIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.divider,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignSelf: 'stretch',
  },
  orderIdLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  orderIdValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  copyBtn: {
    padding: spacing.xs,
  },

  // ── Estimated Delivery ──
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  deliveryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // ── Mark received ──
  receivedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.successLight,
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  receivedBtnText: {
    ...typography.buttonSm,
    color: colors.success,
  },
  receivedConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  receivedConfirmText: {
    ...typography.caption,
    color: colors.primary,
    flex: 1,
    lineHeight: 16,
  },

  // ── Buttons ──
  btnGroup: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  trackBtnText: {
    ...typography.button,
    color: colors.primary,
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    ...shadows.md,
  },
  shopBtnText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
