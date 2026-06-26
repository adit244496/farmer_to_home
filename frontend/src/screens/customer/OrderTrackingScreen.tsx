import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  StatusBar,
  Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { orderService } from '../../services/order.service';
import { formatDate } from '../../utils/formatting';
import { Order } from '../../types';

// ─── Step definitions ─────────────────────────────────────────────────────────

interface TrackingStep {
  key: 'pending' | 'confirmed' | 'packed' | 'dispatched' | 'delivered';
  label: string;
  icon: string;
}

const TRACKING_STEPS: TrackingStep[] = [
  { key: 'pending',    label: 'Order Placed', icon: 'receipt-outline' },
  { key: 'confirmed',  label: 'Confirmed',    icon: 'checkmark-circle-outline' },
  { key: 'packed',     label: 'Packed',       icon: 'cube-outline' },
  { key: 'dispatched', label: 'Dispatched',   icon: 'bicycle-outline' },
  { key: 'delivered',  label: 'Delivered',    icon: 'home-outline' },
];

// Maps order status → which step index is "active" (0-based)
const STATUS_TO_ACTIVE_IDX: Record<string, number> = {
  pending:    0,
  confirmed:  1,
  packed:     2,
  dispatched: 3,
  delivered:  4,
  completed:  4,
};

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending:    '#F57F17',
    confirmed:  colors.primary,
    packed:     '#1565C0',
    dispatched: '#6A1B9A',
    delivered:  colors.success,
    completed:  colors.success,
    cancelled:  colors.error,
  };
  return map[status] ?? colors.textSecondary;
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending:    'Pending',
    confirmed:  'Confirmed',
    packed:     'Packed',
    dispatched: 'Dispatched',
    delivered:  'Delivered',
    completed:  'Completed',
    cancelled:  'Cancelled',
  };
  return map[status] ?? status;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('orders');
  const insets = useSafeAreaInsets();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Pulse animation on active step dot ───────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // ── Data loading with 30-second auto-poll ────────────────────────────────
  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      const data = await orderService.getOrderDetail(Number(id));
      setOrder(data);
    } catch (err) {
      if (!order) {
        Alert.alert(
          t('error', 'Error'),
          t('loadError', 'Could not load order details. Please try again.'),
        );
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadOrder();
    intervalRef.current = setInterval(loadOrder, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeStepIdx = order ? (STATUS_TO_ACTIVE_IDX[order.status] ?? 0) : 0;
  const allDone = order?.status === 'delivered' || order?.status === 'completed';

  function getTimestamp(stepKey: string): string | null {
    if (!order) return null;
    const map: Record<string, string | undefined> = {
      pending:    order.placed_at,
      confirmed:  order.confirmed_at,
      packed:     order.packed_at,
      dispatched: order.dispatched_at,
      delivered:  order.delivered_at,
    };
    return map[stepKey] ?? null;
  }

  function handleCopyTracking() {
    if (!order?.tracking_number) return;
    Clipboard.setString(order.tracking_number);
    Alert.alert(
      t('copied', 'Copied'),
      t('trackingCopied', 'Tracking number copied to clipboard.'),
    );
  }

  function handleContactFarmer() {
    if (!order) return;
    const farmerNames = [...new Set(order.items.map((i) => i.farmer.full_name))].join(', ');
    const farmerPhone = (order.items[0]?.product?.farmer as any)?.phone as string | undefined;
    const body = farmerPhone
      ? `${farmerNames}\n${t('phone', 'Phone')}: ${farmerPhone}`
      : `${farmerNames}\n${t('contactMsg', 'Please contact via the app messaging feature.')}`;
    Alert.alert(t('contactFarmer', 'Contact Farmer'), body);
  }

  // ── First-load spinner ────────────────────────────────────────────────────
  if (isLoading && !order) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('trackOrder', 'Track Order')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('loading', 'Loading...')}</Text>
        </View>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('trackOrder', 'Track Order')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      >
        {order && (
          <>
            {/* ── Order Info Card ────────────────────────────────────── */}
            <View style={styles.orderInfoCard}>
              <View style={styles.orderInfoRow}>
                <View style={styles.orderInfoLeft}>
                  <Text style={styles.orderId}>{order.order_id}</Text>
                  <Text style={styles.orderDate}>
                    {t('placedOn', 'Placed on')} {formatDate(order.placed_at)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(order.status)}18` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getStatusColor(order.status) },
                    ]}
                  >
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 5-Step Tracker Card ────────────────────────────────── */}
            <View style={styles.trackerCard}>
              <Text style={styles.cardTitle}>{t('orderStatus', 'Order Status')}</Text>

              {TRACKING_STEPS.map((step, idx) => {
                const isDone = allDone || (!allDone && activeStepIdx > idx);
                const isActive = !allDone && activeStepIdx === idx;
                const timestamp = getTimestamp(step.key);
                const isLastStep = idx === TRACKING_STEPS.length - 1;

                return (
                  <View key={step.key} style={styles.stepRow}>
                    {/* Left: circle + connector line */}
                    <View style={styles.stepLeft}>
                      {isActive ? (
                        <Animated.View
                          style={[
                            styles.stepCircle,
                            styles.stepCircleActive,
                            { transform: [{ scale: pulseAnim }] },
                          ]}
                        >
                          <Ionicons
                            name={step.icon as any}
                            size={13}
                            color={colors.textInverse}
                          />
                        </Animated.View>
                      ) : isDone ? (
                        <View style={[styles.stepCircle, styles.stepCircleDone]}>
                          <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                        </View>
                      ) : (
                        <View style={[styles.stepCircle, styles.stepCirclePending]}>
                          <Ionicons
                            name={step.icon as any}
                            size={13}
                            color={colors.textMuted}
                          />
                        </View>
                      )}

                      {!isLastStep && (
                        <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                      )}
                    </View>

                    {/* Right: step text */}
                    <View style={styles.stepContent}>
                      <Text
                        style={[
                          styles.stepLabel,
                          isDone && styles.stepLabelDone,
                          isActive && styles.stepLabelActive,
                        ]}
                      >
                        {step.label}
                      </Text>
                      {timestamp ? (
                        <Text style={styles.stepTimestamp}>{formatDate(timestamp)}</Text>
                      ) : !isDone && !isActive ? (
                        <Text style={styles.stepPending}>{t('pending', 'Pending')}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ── Tracking Info Card (only when tracking_number exists) ── */}
            {!!order.tracking_number && (
              <View style={styles.trackingCard}>
                <Text style={styles.cardTitle}>{t('trackingInfo', 'Tracking Info')}</Text>

                <View style={styles.trackingRow}>
                  <View style={styles.trackingLeft}>
                    <View style={styles.trackingIconWrap}>
                      <Ionicons name="cube-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.trackingTexts}>
                      {!!order.carrier && (
                        <Text style={styles.carrierName}>{order.carrier}</Text>
                      )}
                      <Text style={styles.trackingNumber} selectable>
                        {order.tracking_number}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={handleCopyTracking}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="copy-outline" size={15} color={colors.primary} />
                    <Text style={styles.copyButtonText}>{t('copy', 'Copy')}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.carrierLink}
                  onPress={() =>
                    Alert.alert(
                      t('trackOnCarrier', 'Track on Carrier Website'),
                      `${t('enterTrackingMsg', 'Visit the carrier website and enter tracking number:')} ${order.tracking_number}`,
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="open-outline" size={13} color={colors.primaryLight} />
                  <Text style={styles.carrierLinkText}>
                    {t('trackOnCarrierWebsite', 'Track on carrier website')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Contact Farmer Button ──────────────────────────────── */}
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactFarmer}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text style={styles.contactButtonText}>
                {t('contactFarmer', 'Contact Farmer')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  spinnerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textInverse,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  // ── Scroll
  scrollContent: {
    padding: spacing.lg,
  },

  // ── Order Info Card
  orderInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderInfoLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  orderId: {
    ...typography.h4,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  orderDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    ...typography.captionBold,
  },

  // ── Tracker Card
  trackerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepLeft: {
    alignItems: 'center',
    width: 28,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: {
    backgroundColor: colors.primary,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCirclePending: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  stepLineDone: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    flex: 1,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
    minHeight: 28,
  },
  stepLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  stepLabelDone: {
    color: colors.textSecondary,
  },
  stepLabelActive: {
    ...typography.h4,
    color: colors.primary,
  },
  stepTimestamp: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  stepPending: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },

  // ── Tracking Info Card
  trackingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  trackingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  trackingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingTexts: {
    flex: 1,
  },
  carrierName: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  trackingNumber: {
    ...typography.h4,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  copyButtonText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  carrierLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  carrierLinkText: {
    ...typography.caption,
    color: colors.primaryLight,
    textDecorationLine: 'underline',
  },

  // ── Contact Farmer Button
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  contactButtonText: {
    ...typography.button,
    color: colors.primary,
  },
});
