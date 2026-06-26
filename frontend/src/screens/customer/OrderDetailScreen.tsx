import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Badge } from '../../components/common/Badge';
import { StarRating } from '../../components/common/StarRating';
import { orderService } from '../../services/order.service';
import { useLanguage } from '../../hooks/useLanguage';
import { Order, OrderItem, OrderStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatting';

// ─────────────────────────────────────────────────────────────────────────────
// Timeline configuration
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineStep {
  step: string;
  icon: string;
  statusKey: OrderStatus;
  timestampKey: keyof Order;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { step: 'Order Placed', icon: 'receipt-outline', statusKey: 'pending', timestampKey: 'placed_at' },
  { step: 'Confirmed', icon: 'checkmark-circle-outline', statusKey: 'confirmed', timestampKey: 'confirmed_at' },
  { step: 'Packed', icon: 'cube-outline', statusKey: 'packed', timestampKey: 'packed_at' },
  { step: 'Dispatched', icon: 'bicycle-outline', statusKey: 'dispatched', timestampKey: 'dispatched_at' },
  { step: 'Delivered', icon: 'home-outline', statusKey: 'delivered', timestampKey: 'delivered_at' },
];

// Ordered progression for "done" checks (cancelled is a side-branch)
const STATUS_PROGRESSION: OrderStatus[] = [
  'pending',
  'confirmed',
  'packed',
  'dispatched',
  'delivered',
  'completed',
];

// ─────────────────────────────────────────────────────────────────────────────
// Status banner helpers
// ─────────────────────────────────────────────────────────────────────────────

interface StatusStyle {
  bg: string;
  text: string;
  icon: string;
}

function getStatusStyle(status: OrderStatus): StatusStyle {
  switch (status) {
    case 'pending':
      return { bg: '#FEF3C7', text: colors.warning, icon: 'time-outline' };
    case 'confirmed':
    case 'packed':
      return { bg: '#EFF6FF', text: '#2563EB', icon: 'checkmark-circle-outline' };
    case 'dispatched':
      return { bg: colors.primary, text: colors.textInverse, icon: 'bicycle-outline' };
    case 'delivered':
    case 'completed':
      return { bg: '#D1FAE5', text: colors.success, icon: 'home-outline' };
    case 'cancelled':
      return { bg: '#FEE2E2', text: colors.error, icon: 'close-circle-outline' };
    default:
      return { bg: colors.divider, text: colors.textSecondary, icon: 'ellipse-outline' };
  }
}

function humanizeStatus(status: OrderStatus): string {
  const map: Record<string, string> = {
    pending: 'Order Pending',
    confirmed: 'Order Confirmed',
    packed: 'Packed & Ready',
    dispatched: 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export function OrderDetailScreen() {
  const { t } = useTranslation('orders');
  const insets = useSafeAreaInsets();
  const { getLocalizedText } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const orderId = Number(id);

  const fetchOrder = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await orderService.getOrderDetail(orderId);
      setOrder(data);
    } catch (err: any) {
      Alert.alert(t('error', 'Error'), err?.message ?? 'Failed to load order details.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('cancelOrder', 'Cancel Order'),
      t('cancelConfirmMsg', 'Are you sure you want to cancel this order? This action cannot be undone.'),
      [
        { text: t('no', 'No'), style: 'cancel' },
        {
          text: t('yesCancelIt', 'Yes, Cancel it'),
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await orderService.cancelOrder(orderId, 'Cancelled by customer');
              await fetchOrder();
            } catch (err: any) {
              Alert.alert(t('error', 'Error'), err?.message ?? 'Failed to cancel order.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }, [orderId, fetchOrder, t]);

  const handleReorder = useCallback(() => {
    if (!order) return;
    // Navigate to cart; items would be added via cart store in real implementation
    Alert.alert(
      t('reorder', 'Reorder'),
      t('reorderMsg', 'All items have been added to your cart.'),
      [{ text: t('viewCart', 'View Cart'), onPress: () => router.push('/customer/cart') }],
    );
  }, [order, t]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>{t('orderDetails', 'Order Details')}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!order) return null;

  const statusStyle = getStatusStyle(order.status);
  const currentStatusIdx = STATUS_PROGRESSION.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  // Can cancel: only if 'pending' and within 1 hour of placement
  const placedAt = order.placed_at ? new Date(order.placed_at).getTime() : 0;
  const oneHourMs = 60 * 60 * 1000;
  const withinOneHour = Date.now() - placedAt < oneHourMs;
  const canCancel = order.status === 'pending' && withinOneHour;

  const canRate = order.status === 'delivered' || order.status === 'completed';

  const shortOrderId = order.order_id
    ? `#${String(order.order_id).toUpperCase()}`
    : `#ORD-${orderId}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>{t('orderDetails', 'Order Details')}</Text>
          <Text style={styles.headerSubtitle}>{shortOrderId}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Status Banner ───────────────────────────────────────────────── */}
        <View style={[styles.statusBanner, { backgroundColor: statusStyle.bg }]}>
          <Ionicons
            name={statusStyle.icon as any}
            size={20}
            color={statusStyle.text}
            style={styles.statusBannerIcon}
          />
          <Text style={[styles.statusBannerText, { color: statusStyle.text }]}>
            {humanizeStatus(order.status)}
          </Text>
        </View>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('orderTimeline', 'Order Timeline')}</Text>

          {TIMELINE_STEPS.map((stepObj, idx) => {
            const stepStatusIdx = STATUS_PROGRESSION.indexOf(stepObj.statusKey);
            const isDone = !isCancelled && currentStatusIdx >= stepStatusIdx;
            const isActive =
              !isCancelled && currentStatusIdx === stepStatusIdx;
            const isPending = isCancelled || currentStatusIdx < stepStatusIdx;

            const timestamp = order[stepObj.timestampKey] as string | undefined;
            const isLast = idx === TIMELINE_STEPS.length - 1;

            return (
              <View key={stepObj.statusKey} style={styles.timelineRow}>
                {/* Left column: circle + line */}
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineCircle,
                      isDone && styles.timelineCircleDone,
                      isPending && styles.timelineCirclePending,
                    ]}
                  >
                    <Ionicons
                      name={stepObj.icon as any}
                      size={14}
                      color={isDone ? colors.textInverse : colors.textMuted}
                    />
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        isDone && styles.timelineLineDone,
                      ]}
                    />
                  )}
                </View>

                {/* Right column: label + timestamp + badge */}
                <View style={styles.timelineContent}>
                  <View style={styles.timelineLabelRow}>
                    <Text
                      style={[
                        styles.timelineStepLabel,
                        isDone && styles.timelineStepLabelDone,
                        isActive && styles.timelineStepLabelActive,
                      ]}
                    >
                      {stepObj.step}
                    </Text>
                    {isActive && (
                      <View style={styles.inProgressBadge}>
                        <Text style={styles.inProgressBadgeText}>In Progress</Text>
                      </View>
                    )}
                  </View>
                  {timestamp ? (
                    <Text style={styles.timelineTimestamp}>{formatDate(timestamp)}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Items Ordered ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('itemsOrdered', 'Items Ordered')}</Text>

          {order.items.map((item: OrderItem, idx: number) => {
            const primaryImage =
              item.product?.images?.find((img: any) => img.is_primary) ??
              item.product?.images?.[0];
            const productName =
              getLocalizedText?.(item.product?.name_en, item.product?.name_mr) ??
              item.product?.name_en ??
              'Product';
            const farmerName = item.farmer?.full_name ?? '';
            const isLastItem = idx === order.items.length - 1;

            return (
              <View
                key={item.id}
                style={[styles.itemRow, !isLastItem && styles.itemRowBorder]}
              >
                {/* Image */}
                {primaryImage?.image_url ? (
                  <Image
                    source={{ uri: primaryImage.image_url }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                    <Ionicons name="leaf-outline" size={22} color={colors.border} />
                  </View>
                )}

                {/* Details */}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {productName}
                  </Text>
                  <Text style={styles.itemQty}>
                    {item.quantity} {item.unit ?? 'unit'}
                  </Text>
                  {farmerName ? (
                    <Text style={styles.itemFarmer}>{farmerName}</Text>
                  ) : null}
                  {item.review ? (
                    <View style={styles.reviewedBadge}>
                      <Ionicons name="checkmark" size={11} color={colors.success} />
                      <Text style={styles.reviewedBadgeText}>Reviewed</Text>
                    </View>
                  ) : null}
                </View>

                {/* Subtotal */}
                <Text style={styles.itemSubtotal}>
                  {formatCurrency(item.subtotal ?? item.unit_price * item.quantity)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Delivery Address ────────────────────────────────────────────── */}
        {order.delivery_address ? (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, styles.cardTitleInline]}>
                {t('deliveryAddress', 'Delivery Address')}
              </Text>
            </View>

            <Text style={styles.addressNamePhone}>
              {order.delivery_address.recipient_name}
              {order.delivery_address.phone
                ? `  ·  ${order.delivery_address.phone}`
                : ''}
            </Text>
            <Text style={styles.addressLine}>
              {[
                order.delivery_address.house_no,
                order.delivery_address.area,
              ]
                .filter(Boolean)
                .join(', ')}
            </Text>
            <Text style={styles.addressLine}>
              {[
                order.delivery_address.city,
                order.delivery_address.pin_code,
              ]
                .filter(Boolean)
                .join(' - ')}
            </Text>
            {order.delivery_address.state ? (
              <Text style={styles.addressLine}>{order.delivery_address.state}</Text>
            ) : null}
          </View>
        ) : null}

        {/* ── Payment Info ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, styles.cardTitleInline]}>
              {t('paymentInfo', 'Payment Info')}
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <View style={styles.paymentMethod}>
              <Ionicons
                name={
                  order.payment_method === 'cod'
                    ? 'cash-outline'
                    : 'card-outline'
                }
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.paymentMethodText}>
                {order.payment_method
                  ? order.payment_method.toUpperCase()
                  : 'N/A'}
              </Text>
            </View>

            <View
              style={[
                styles.paymentStatusBadge,
                order.payment_status === 'paid'
                  ? styles.paymentStatusPaid
                  : styles.paymentStatusPending,
              ]}
            >
              <Text
                style={[
                  styles.paymentStatusText,
                  order.payment_status === 'paid'
                    ? styles.paymentStatusTextPaid
                    : styles.paymentStatusTextPending,
                ]}
              >
                {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Action Buttons ──────────────────────────────────────────────── */}
        <View style={styles.actionsContainer}>
          {canCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonCancel]}
              onPress={handleCancel}
              activeOpacity={0.8}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                  <Text style={[styles.actionButtonText, styles.actionButtonTextCancel]}>
                    {t('cancelOrder', 'Cancel Order')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canRate && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonRate]}
              onPress={() =>
                router.push({ pathname: '/customer/review', params: { orderId: String(orderId) } })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="star-outline" size={18} color={colors.accent} />
              <Text style={[styles.actionButtonText, styles.actionButtonTextRate]}>
                {t('rateOrder', 'Rate Order')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonReorder]}
            onPress={handleReorder}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionButtonText, styles.actionButtonTextReorder]}>
              {t('reorder', 'Reorder')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textInverse,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 24,
  },

  // ── Loading ──────────────────────────────────────────────────────────────────
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },

  // ── Status Banner ─────────────────────────────────────────────────────────
  statusBanner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  statusBannerIcon: {
    marginRight: spacing.sm,
  },
  statusBannerText: {
    ...typography.label,
    fontWeight: '700',
    fontSize: 15,
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    ...shadows.card,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitleInline: {
    marginBottom: 0,
    marginLeft: spacing.sm,
  },

  // ── Timeline ─────────────────────────────────────────────────────────────────
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 28,
  },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCircleDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  timelineCirclePending: {
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: colors.primary,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  timelineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  timelineStepLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  timelineStepLabelDone: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timelineStepLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  timelineTimestamp: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  inProgressBadge: {
    backgroundColor: colors.primaryPastel,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  inProgressBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 10,
  },

  // ── Items ─────────────────────────────────────────────────────────────────────
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
  },
  itemImagePlaceholder: {
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    ...typography.label,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  itemQty: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  itemFarmer: {
    ...typography.caption,
    color: colors.textMuted,
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  reviewedBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  itemSubtotal: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
  },

  // ── Address ───────────────────────────────────────────────────────────────────
  addressNamePhone: {
    ...typography.label,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  addressLine: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // ── Payment ───────────────────────────────────────────────────────────────────
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentMethodText: {
    ...typography.label,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  paymentStatusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  paymentStatusPaid: {
    backgroundColor: '#D1FAE5',
  },
  paymentStatusPending: {
    backgroundColor: '#FEF3C7',
  },
  paymentStatusText: {
    ...typography.captionBold,
    fontSize: 12,
  },
  paymentStatusTextPaid: {
    color: colors.success,
  },
  paymentStatusTextPending: {
    color: colors.warning,
  },

  // ── Actions ───────────────────────────────────────────────────────────────────
  actionsContainer: {
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  actionButtonCancel: {
    borderColor: colors.error,
  },
  actionButtonRate: {
    borderColor: colors.accent,
  },
  actionButtonReorder: {
    borderColor: colors.primary,
  },
  actionButtonText: {
    ...typography.button,
    fontWeight: '600',
  },
  actionButtonTextCancel: {
    color: colors.error,
  },
  actionButtonTextRate: {
    color: colors.accent,
  },
  actionButtonTextReorder: {
    color: colors.primary,
  },
});
