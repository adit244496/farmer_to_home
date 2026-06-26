import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { CartItemComponent } from '../../components/customer/CartItem';
import { EmptyState } from '../../components/common/EmptyState';
import { useCartStore } from '../../store/cartStore';
import { useLanguage } from '../../hooks/useLanguage';
import { formatCurrency } from '../../utils/formatting';
import { CartItem } from '../../types';

interface FarmerGroup {
  farmerId: string;
  farmerName: string;
  items: CartItem[];
}

export function CartScreen() {
  const { t } = useTranslation('orders');
  const insets = useSafeAreaInsets();
  const { getLocalizedText } = useLanguage();

  const {
    items,
    promoCode,
    discountAmount,
    subtotal,
    totalAmount,
    deliveryCharge,
    updateQuantity,
    removeItem,
    applyPromo,
    removePromo,
  } = useCartStore();

  const [promoInput, setPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // ── Group cart items by farmer ──
  const farmerGroups: FarmerGroup[] = React.useMemo(() => {
    const map: Record<string, FarmerGroup> = {};
    items.forEach((item) => {
      const fid = String(item.product.farmer.id);
      if (!map[fid]) {
        map[fid] = {
          farmerId: fid,
          farmerName: item.product.farmer.full_name,
          items: [],
        };
      }
      map[fid].items.push(item);
    });
    return Object.values(map);
  }, [items]);

  // ── Promo handlers ──
  const handleApplyPromo = useCallback(async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setIsApplyingPromo(true);
    setPromoError(null);
    try {
      await applyPromo(code);
      setPromoInput('');
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        t('promoInvalid', 'Invalid promo code.');
      setPromoError(message);
    } finally {
      setIsApplyingPromo(false);
    }
  }, [promoInput, applyPromo, t]);

  const handleRemovePromo = useCallback(() => {
    removePromo();
    setPromoError(null);
  }, [removePromo]);

  const totalItemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // ── Empty state ──
  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={colors.surface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('myCart', 'My Cart')}
          </Text>
          <View style={styles.headerRight} />
        </View>
        <EmptyState
          icon="cart-outline"
          title={t('emptyCartTitle', 'Your cart is empty')}
          subtitle={t('emptyCartSub', 'Add fresh produce from our local farmers to get started.')}
          actionLabel={t('browseProducts', 'Browse Products')}
          onAction={() => router.push('/customer/home')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('myCart', 'My Cart')} ({totalItemCount} {t('items', 'items')})
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Items grouped by farmer ── */}
        {farmerGroups.map((group) => (
          <View key={group.farmerId} style={styles.farmerGroup}>
            {/* Farmer section header */}
            <View style={styles.farmerSectionHeader}>
              <Ionicons name="leaf-outline" size={14} color={colors.primary} />
              <Text style={styles.farmerSectionName}>{group.farmerName}</Text>
            </View>
            {group.items.map((item) => (
              <CartItemComponent
                key={item.id}
                item={item}
                onQuantityChange={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </View>
        ))}

        {/* ── Promo code section ── */}
        <View style={styles.promoSection}>
          {promoCode ? (
            /* Applied state */
            <View style={styles.promoAppliedRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.promoAppliedName}>{promoCode}</Text>
              <Text style={styles.promoAppliedSaving}>
                -{formatCurrency(discountAmount)} {t('off', 'off')}
              </Text>
              <TouchableOpacity
                style={styles.promoRemoveButton}
                onPress={handleRemovePromo}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            /* Input state */
            <>
              <View style={styles.promoInputRow}>
                <TextInput
                  style={[
                    styles.promoInput,
                    promoError ? styles.promoInputError : null,
                    { outlineWidth: 0, outlineStyle: 'none' } as any,
                  ]}
                  value={promoInput}
                  onChangeText={(text) => {
                    setPromoInput(text);
                    if (promoError) setPromoError(null);
                  }}
                  placeholder={t('enterPromoCode', 'Enter promo code')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleApplyPromo}
                />
                <TouchableOpacity
                  style={[
                    styles.promoApplyButton,
                    (isApplyingPromo || !promoInput.trim()) && styles.promoApplyButtonDisabled,
                  ]}
                  onPress={handleApplyPromo}
                  disabled={isApplyingPromo || !promoInput.trim()}
                  activeOpacity={0.8}
                >
                  {isApplyingPromo ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.promoApplyText}>
                      {t('apply', 'Apply')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              {promoError && (
                <Text style={styles.promoErrorText}>{promoError}</Text>
              )}
            </>
          )}
        </View>

        {/* ── Order Summary card ── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('orderSummary', 'Order Summary')}</Text>

          {/* Subtotal */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('subtotal', 'Subtotal')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>

          {/* Delivery */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('delivery', 'Delivery')}</Text>
            {deliveryCharge === 0 ? (
              <Text style={styles.freeDeliveryText}>{t('free', 'FREE')}</Text>
            ) : (
              <Text style={styles.summaryValue}>{formatCurrency(deliveryCharge)}</Text>
            )}
          </View>

          {/* Promo discount row */}
          {promoCode && discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.promoSummaryLabel}>
                {t('promo', 'Promo')} ({promoCode})
              </Text>
              <Text style={styles.promoSummaryValue}>
                -{formatCurrency(discountAmount)}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.summaryDivider} />

          {/* Grand Total */}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>{t('grandTotal', 'Grand Total')}</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(totalAmount)}</Text>
          </View>

          {/* Free delivery nudge */}
          {subtotal < 500 && deliveryCharge > 0 && (
            <View style={styles.freeDeliveryNudge}>
              <Ionicons name="bicycle-outline" size={13} color={colors.accent} />
              <Text style={styles.freeDeliveryNudgeText}>
                {t('addMore', 'Add')} {formatCurrency(500 - subtotal)}{' '}
                {t('forFreeDelivery', 'more for free delivery!')}
              </Text>
            </View>
          )}
        </View>

        {/* ── Sticky-bottom checkout (at end of scroll content) ── */}
        <View style={[styles.checkoutBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            style={[
              styles.checkoutButton,
              items.length === 0 && styles.checkoutButtonDisabled,
            ]}
            onPress={() => router.push('/customer/checkout')}
            disabled={items.length === 0}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutButtonText}>
              {t('proceedToCheckout', 'Proceed to Checkout')}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  headerBackButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.surface,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 36,
  },

  // ── Scroll content ──
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xs,
  },

  // ── Farmer groups ──
  farmerGroup: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  farmerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryPastel,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  farmerSectionName: {
    ...typography.captionBold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Promo section ──
  promoSection: {
    backgroundColor: colors.divider,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  promoInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  promoInputError: {
    borderColor: colors.error,
  },
  promoApplyButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    minHeight: 44,
  },
  promoApplyButtonDisabled: {
    opacity: 0.5,
  },
  promoApplyText: {
    ...typography.button,
    color: colors.surface,
    fontSize: 13,
  },
  promoErrorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  promoAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  promoAppliedName: {
    ...typography.captionBold,
    color: colors.success,
    flex: 1,
  },
  promoAppliedSaving: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  promoRemoveButton: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Order Summary card ──
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.md,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  freeDeliveryText: {
    ...typography.body,
    color: colors.success,
    fontWeight: '700',
  },
  promoSummaryLabel: {
    ...typography.body,
    color: colors.success,
  },
  promoSummaryValue: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  grandTotalValue: {
    ...typography.price,
    color: colors.accent,
    fontSize: 22,
  },
  freeDeliveryNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    backgroundColor: colors.accentPastel,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  freeDeliveryNudgeText: {
    ...typography.caption,
    color: colors.accent,
  },

  // ── Checkout bar ──
  checkoutBar: {
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  checkoutButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutButtonText: {
    ...typography.button,
    color: colors.surface,
  },
});
