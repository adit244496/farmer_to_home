import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useRatingsStore } from '../../store/ratingsStore';
import { orderService } from '../../services/order.service';
import { formatCurrency } from '../../utils/formatting';
import { Address, CartItem } from '../../types';

type PaymentMethod = 'cod' | 'upi' | 'card' | 'netbanking';

const STEPS = ['Address', 'Summary', 'Payment'];

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  desc: string;
  badge: string | null;
} = [
  {
    id: 'cod',
    icon: 'cash-outline',
    title: 'Cash on Delivery',
    desc: 'Pay when delivered',
    badge: 'No extra charges',
  },
  {
    id: 'upi',
    icon: 'phone-portrait-outline',
    title: 'UPI',
    desc: 'Pay via UPI apps',
    badge: null,
  },
  {
    id: 'card',
    icon: 'card-outline',
    title: 'Credit / Debit Card',
    desc: 'Visa, Mastercard, Rupay',
    badge: null,
  },
  {
    id: 'netbanking',
    icon: 'business-outline',
    title: 'Net Banking',
    desc: 'All major banks',
    badge: null,
  },
] as any;

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { items, subtotal, deliveryCharge, discountAmount, totalAmount, promoCode, clearCart } =
    useCartStore();
  const { user } = useAuthStore();
  const { setPendingDelivery } = useRatingsStore();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const data: Address[] = await orderService.getAddresses();
      setAddresses(data);
      const defaultAddr = data.find((a) => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else if (data.length > 0) {
        setSelectedAddressId(data[0].id);
      }
    } catch {
      Alert.alert('Error', 'Failed to load addresses. Please try again.');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      if (!selectedAddressId) {
        Alert.alert('Select Address', 'Please select a delivery address to continue.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else {
      handlePlaceOrder();
    }
  };

  const handleBack = () => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
    else router.back();
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) return;
    setPlacingOrder(true);
    try {
      const payload: { delivery_address_id: number; payment_method: string; promo_code?: string } =
        {
          delivery_address_id: selectedAddressId,
          payment_method: paymentMethod,
        };
      if (promoCode) payload.promo_code = promoCode;

      const order = await orderService.placeOrder(payload);
      // Capture product IDs before clearing cart so user can mark delivery later
      setPendingDelivery(items.map((i) => i.product.id));
      clearCart();
      router.push({ pathname: '/customer/order-confirm', params: { orderId: String(order.id) } });
    } catch {
      Alert.alert('Order Failed', 'Something went wrong. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Group cart items by farmer
  const groupedItems = (items as CartItem[]).reduce<Record<string, CartItem[]>>((acc, item) => {
    const key = (item as any).farmer_name || (item as any).product?.farmer?.full_name || 'Farmer';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const paymentOptions: Array<{
    id: PaymentMethod;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    desc: string;
    badge: string | null;
  }> = [
    { id: 'cod', icon: 'cash-outline', title: 'Cash on Delivery', desc: 'Pay when delivered', badge: 'No extra charges' },
    { id: 'upi', icon: 'phone-portrait-outline', title: 'UPI', desc: 'Pay via UPI apps', badge: null },
    { id: 'card', icon: 'card-outline', title: 'Credit / Debit Card', desc: 'Visa, Mastercard, Rupay', badge: null },
    { id: 'netbanking', icon: 'business-outline', title: 'Net Banking', desc: 'All major banks', badge: null },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicatorRow}>
        {STEPS.map((label, index) => {
          const stepNum = (index + 1) as 1 | 2 | 3;
          const isDone = currentStep > stepNum;
          const isActive = currentStep === stepNum;
          return (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isDone || isActive ? styles.stepCircleActive : styles.stepCirclePending,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={13} color={colors.textInverse} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isActive ? styles.stepNumberActive : styles.stepNumberPending,
                      ]}
                    >
                      {stepNum}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive ? styles.stepLabelActive : styles.stepLabelInactive,
                  ]}
                >
                  {label}
                </Text>
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    currentStep > stepNum ? styles.stepLineActive : styles.stepLineInactive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── STEP 1: ADDRESS ─── */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Select Delivery Address</Text>

            {loadingAddresses ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : (
              <>
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={[styles.addressCard, isSelected && styles.addressCardSelected]}
                      onPress={() => setSelectedAddressId(addr.id)}
                      activeOpacity={0.85}
                    >
                      {/* Teal left accent bar on selected */}
                      {isSelected && <View style={styles.addressAccentBar} />}

                      <View style={styles.addressCardBody}>
                        {/* Top row: chips + radio */}
                        <View style={styles.addressCardTopRow}>
                          <View style={styles.chipsRow}>
                            {(addr as any).label ? (
                              <View style={styles.labelChip}>
                                <Text style={styles.labelChipText}>{(addr as any).label}</Text>
                              </View>
                            ) : null}
                            {addr.is_default && (
                              <View style={styles.defaultChip}>
                                <Text style={styles.defaultChipText}>Default</Text>
                              </View>
                            )}
                          </View>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected ? styles.radioSelected : styles.radioUnselected,
                            ]}
                          >
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        </View>

                        <Text style={styles.recipientName}>{addr.recipient_name}</Text>
                        <Text style={styles.addrLine}>{addr.address_line1}</Text>
                        {(addr as any).address_line2 ? (
                          <Text style={styles.addrLine}>{(addr as any).address_line2}</Text>
                        ) : null}
                        <Text style={styles.addrLine}>
                          {addr.city}, {addr.state} – {addr.pincode}
                        </Text>
                        {addr.phone ? (
                          <Text style={styles.addrPhone}>{addr.phone}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.addAddressBtn}
                  onPress={() => router.push('/customer/addresses/new')}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.addAddressText}>+ Add New Address</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ─── STEP 2: ORDER SUMMARY ─── */}
        {currentStep === 2 && (
          <View>
            {/* Selected address strip */}
            <View style={styles.selectedAddrStrip}>
              <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.selectedAddrText} numberOfLines={1}>
                {selectedAddress?.address_line1 ?? 'Selected address'}
                {selectedAddress ? `, ${selectedAddress.city}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setCurrentStep(1)} hitSlop={8}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Order Items</Text>

            {Object.entries(groupedItems).map(([farmerName, farmerItems]) => (
              <View key={farmerName} style={styles.farmerGroup}>
                <View style={styles.farmerGroupHeader}>
                  <Ionicons name="leaf-outline" size={13} color={colors.primary} />
                  <Text style={styles.farmerGroupName}>{farmerName}</Text>
                </View>
                {farmerItems.map((item) => {
                  const imageUrl =
                    (item as any).image_url ??
                    ((item as any).product?.images?.find((i: any) => i.is_primary) ||
                      (item as any).product?.images?.[0])?.image_url ??
                    null;
                  const name =
                    (item as any).name ??
                    (item as any).product?.name_en ??
                    'Product';
                  const unitPrice = (item as any).unit_price ?? (item as any).price ?? 0;
                  const unit = (item as any).unit ?? '';
                  return (
                    <View key={(item as any).id} style={styles.itemRow}>
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.itemImg} resizeMode="cover" />
                      ) : (
                        <View style={styles.itemImgPlaceholder}>
                          <Ionicons name="image-outline" size={16} color={colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.itemMeta}>
                        <Text style={styles.itemName} numberOfLines={2}>{name}</Text>
                        <Text style={styles.itemQty}>
                          {item.quantity} {unit}
                        </Text>
                      </View>
                      <Text style={styles.itemSubtotal}>
                        {formatCurrency(item.quantity * unitPrice)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Charges table */}
            <View style={styles.chargesCard}>
              <Text style={styles.chargesHeading}>Price Details</Text>

              <View style={styles.chargeRow}>
                <Text style={styles.chargeLabel}>Subtotal</Text>
                <Text style={styles.chargeValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.chargeRow}>
                <Text style={styles.chargeLabel}>Delivery</Text>
                {deliveryCharge === 0 ? (
                  <Text style={[styles.chargeValue, styles.freeText]}>FREE</Text>
                ) : (
                  <Text style={styles.chargeValue}>{formatCurrency(deliveryCharge)}</Text>
                )}
              </View>
              {discountAmount > 0 && (
                <View style={styles.chargeRow}>
                  <Text style={[styles.chargeLabel, { color: colors.success }]}>
                    Promo {promoCode ? `(${promoCode})` : ''}
                  </Text>
                  <Text style={[styles.chargeValue, { color: colors.success }]}>
                    -{formatCurrency(discountAmount)}
                  </Text>
                </View>
              )}
              <View style={styles.chargeDivider} />
              <View style={styles.chargeRow}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandValue}>{formatCurrency(totalAmount)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── STEP 3: PAYMENT ─── */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>

            {paymentOptions.map((opt) => {
              const isSelected = paymentMethod === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.payCard, isSelected && styles.payCardSelected]}
                  onPress={() => setPaymentMethod(opt.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.payIconWrap}>
                    <Ionicons name={opt.icon} size={24} color={colors.primary} />
                  </View>
                  <View style={styles.payInfo}>
                    <Text style={styles.payTitle}>{opt.title}</Text>
                    <Text style={styles.payDesc}>{opt.desc}</Text>
                    {opt.badge && (
                      <View style={styles.payBadge}>
                        <Text style={styles.payBadgeText}>{opt.badge}</Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected ? styles.radioSelected : styles.radioUnselected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      {/* ─── BOTTOM BAR ─── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {currentStep === 3 && (
          <Text style={styles.secureText}>🔒 Secure Checkout</Text>
        )}
        <View style={styles.bottomBtns}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backOutlineBtn} onPress={handleBack}>
              <Text style={styles.backOutlineText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.continueBtn, placingOrder && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={placingOrder}
          >
            {placingOrder ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Text style={styles.continueBtnText}>
                {currentStep === 3 ? 'Place Order' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  // ── Step Indicator ──
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCirclePending: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepNumberActive: {
    color: colors.textInverse,
  },
  stepNumberPending: {
    color: colors.textMuted,
  },
  stepLabel: {
    ...typography.caption,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  stepLabelInactive: {
    color: colors.textMuted,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.xs,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepLineInactive: {
    backgroundColor: colors.border,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // ── Address Cards ──
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  addressCardSelected: {
    borderColor: colors.primary,
  },
  addressAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  addressCardBody: {
    padding: spacing.md,
    paddingLeft: spacing.xl,
  },
  addressCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  labelChip: {
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  labelChipText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  defaultChip: {
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  defaultChipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  radioUnselected: {
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  recipientName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  addrLine: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  addrPhone: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  addAddressText: {
    ...typography.button,
    color: colors.primary,
  },

  // ── Order Summary ──
  selectedAddrStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  selectedAddrText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flex: 1,
  },
  changeLink: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '600',
  },
  farmerGroup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  farmerGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryPastel,
  },
  farmerGroupName: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  itemImg: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
  },
  itemImgPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: { flex: 1 },
  itemName: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  itemQty: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemSubtotal: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  chargesCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  chargesHeading: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  chargeLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  chargeValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  freeText: {
    color: colors.success,
    fontWeight: '700',
  },
  chargeDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  grandLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  grandValue: {
    ...typography.price,
    color: colors.primary,
  },

  // ── Payment ──
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
    gap: spacing.md,
  },
  payCardSelected: {
    borderColor: colors.primary,
  },
  payIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payInfo: { flex: 1 },
  payTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  payDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  payBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  payBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },

  // ── Bottom Bar ──
  bottomBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  secureText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  bottomBtns: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backOutlineBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backOutlineText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  continueBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  continueBtnDisabled: {
    opacity: 0.65,
  },
  continueBtnText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
