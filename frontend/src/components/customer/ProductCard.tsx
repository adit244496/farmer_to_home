import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LeafIcon } from '../common/LeafIcon';
import { router } from 'expo-router';
import { Product } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../theme';
import { formatCurrency } from '../../utils/formatting';
import { useLanguage } from '../../hooks/useLanguage';
import { useCartStore } from '../../store/cartStore';
import { useRatingsStore } from '../../store/ratingsStore';
import { RatingModal } from './RatingModal';

const { width } = Dimensions.get('window');
const GRID_CARD_WIDTH       = (width - spacing.lg * 3) / 2;
const HORIZONTAL_CARD_WIDTH = 160;

type ProductCardVariant = 'grid' | 'list' | 'horizontal' | 'compact' | 'expanded';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onAddToCart?: (product: Product) => void;
  variant?: ProductCardVariant;
  style?: object;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 387 → "387"   1 234 → "1.2k"   12 345 → "12.3k" */
const fmt = (n: number): string => {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return (k % 1 === 0 ? `${k}` : `${k.toFixed(1)}`) + 'k';
};

/** delivery_mins → "Today" / "26 Jun" etc. */
const deliveryLabel = (mins?: number): string | null => {
  if (!mins) return null;
  const now      = new Date();
  const delivery = new Date(now.getTime() + mins * 60 * 1000);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 0);
  if (delivery <= todayEnd) return 'Today';
  const tomorrowEnd = new Date(todayEnd); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  if (delivery <= tomorrowEnd) return 'Tomorrow';
  return delivery.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ─── Quantity stepper ─────────────────────────────────────────────────────────

interface StepperProps { qty: number; small?: boolean; onIncrease: () => void; onDecrease: () => void }

const QuantityStepper: React.FC<StepperProps> = ({ qty, small, onIncrease, onDecrease }) => {
  const stop = (e: any, fn: () => void) => { e.stopPropagation(); fn(); };
  return (
    <View style={[styles.stepper, small && styles.stepperSm]}>
      <TouchableOpacity style={[styles.stepBtn, small && styles.stepBtnSm]}
        onPress={(e) => stop(e, onDecrease)} activeOpacity={0.7}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
        <Ionicons name="remove" size={small ? 12 : 14} color="#fff" />
      </TouchableOpacity>
      <Text style={[styles.stepQty, small && styles.stepQtySm]}>{qty}</Text>
      <TouchableOpacity style={[styles.stepBtn, small && styles.stepBtnSm]}
        onPress={(e) => stop(e, onIncrease)} activeOpacity={0.7}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
        <Ionicons name="add" size={small ? 12 : 14} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

// ─── Mini star row ────────────────────────────────────────────────────────────

const MiniStars: React.FC<{ count: number }> = ({ count }) => (
  <View style={styles.miniStars}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons key={s}
        name={s <= count ? 'star' : s - count < 1 ? 'star-half' : 'star-outline'}
        size={10} color="#F59E0B" />
    ))}
  </View>
);

// ─── ProductCard ──────────────────────────────────────────────────────────────

export const ProductCard: React.FC<ProductCardProps> = ({
  product, onPress, onAddToCart, variant = 'grid', style,
}) => {
  const { getLocalizedText, language }     = useLanguage();
  const { items, addItem, updateQuantity } = useCartStore();
  const { getUserRating, isDelivered }     = useRatingsStore();
  const [hovered, setHovered]              = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const primaryImage  = product.images?.find((img) => img.is_primary) || product.images?.[0];
  const imageUrl      = primaryImage?.image_url;
  const productName   = getLocalizedText(product.name_en, product.name_mr);
  const isOutOfStock  = product.stock_quantity === 0;
  const userRating    = getUserRating(product.id);
  const delivered     = isDelivered(product.id);
  const isMr          = language === 'mr';
  const l             = (en: string, mr: string) => isMr ? mr : en;
  const dlLabel       = deliveryLabel(product.delivery_mins);

  const cartItem = items.find((i) => i.product.id === product.id);
  const cartQty  = cartItem?.quantity ?? 0;

  const normalizedVariant: 'grid' | 'list' | 'horizontal' =
    variant === 'compact' ? 'grid' : variant === 'expanded' ? 'list' : variant;

  const handlePress        = () => { if (onPress) onPress(); else router.push(`/customer/product/${product.id}`); };
  const handleFarmerPress  = (e: any) => { e.stopPropagation(); router.push(`/customer/farmer/${product.farmer.id}`); };
  const handleFirstAdd     = (e: any) => { e.stopPropagation(); if (onAddToCart) onAddToCart(product); else addItem(product, product.min_order_qty || 1); };
  const handleIncrease     = () => updateQuantity(product.id, cartQty + 1);
  const handleDecrease     = () => updateQuantity(product.id, cartQty - 1);

  // ── Dual rating row: farmer name + ★ farmer rating (same line)  |  ★ product rating ──
  const dualRatingRow = (compact = false) => (
    <View style={styles.dualRatingRow}>
      {/* Left: farmer name and farmer rating on the same line */}
      <TouchableOpacity onPress={handleFarmerPress} activeOpacity={0.7} style={styles.farmerGroup}>
        <Text style={[styles.farmerName, compact && styles.farmerNameSm]} numberOfLines={1}>
          {product.farmer.full_name}
        </Text>
        <View style={styles.inlineRating}>
          <Ionicons name="star" size={9} color={colors.primary} />
          <Text style={styles.inlineRatingText}>
            {' '}{product.farmer.rating.toFixed(1)}{' '}
            <Text style={styles.ratingCount}>({fmt(product.farmer.total_ratings)})</Text>
          </Text>
        </View>
      </TouchableOpacity>

      {/* Right: product rating pinned to right */}
      <View style={styles.productRating}>
        <Ionicons name="star" size={9} color="#F59E0B" />
        <Text style={styles.productRatingText}>
          {' '}{product.rating.toFixed(1)}{' '}
          <Text style={styles.ratingCount}>({fmt(product.total_ratings)})</Text>
        </Text>
      </View>
    </View>
  );

  // ── Rate strip (only when product has been delivered) ─────────────────────
  const rateStrip = delivered ? (
    <TouchableOpacity
      style={styles.rateStrip}
      onPress={(e) => { e.stopPropagation(); setShowRatingModal(true); }}
      activeOpacity={0.75}
    >
      {userRating ? (
        <>
          <MiniStars count={userRating.stars} />
          <Text style={styles.rateStripLabel}>{l('Your rating', 'तुमचे रेटिंग')}</Text>
          <Ionicons name="pencil-outline" size={11} color={colors.textMuted} style={{ marginLeft: 'auto' as any }} />
        </>
      ) : (
        <>
          <Ionicons name="star-outline" size={12} color={colors.primary} />
          <Text style={styles.rateStripLabelEmpty}>{l('Rate this product', 'उत्पादन रेट करा')}</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.primary} style={{ marginLeft: 'auto' as any }} />
        </>
      )}
    </TouchableOpacity>
  ) : null;

  // ── Delivery date row (bottom of card) ────────────────────────────────────
  const deliveryRow = dlLabel ? (
    <View style={styles.deliveryRow}>
      <Ionicons name="bicycle-outline" size={11} color={colors.success} />
      <Text style={styles.deliveryText}>
        {l('Delivered by', 'डिलिव्हरी')} <Text style={styles.deliveryDate}>{dlLabel}</Text>
      </Text>
    </View>
  ) : null;

  // ── Price block ───────────────────────────────────────────────────────────
  const priceTag = (
    <View>
      {product.discount_percent ? (
        <Text style={styles.discountBadge}>{product.discount_percent}% OFF</Text>
      ) : null}
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatCurrency(product.price_per_unit)}</Text>
        <Text style={styles.unit}>/{product.unit}</Text>
        {product.original_price ? (
          <Text style={styles.originalPrice}>{formatCurrency(product.original_price)}</Text>
        ) : null}
      </View>
    </View>
  );

  // ── Image block (no delivery badge here anymore) ──────────────────────────
  const imageBlock = (height: number) => (
    <View style={[styles.imageContainer, { height }]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="leaf" size={32} color={colors.primaryLight} />
        </View>
      )}
      {product.is_organic && (
        <View style={styles.badgeOverlay}>
          <View style={styles.organicBadge}>
            <LeafIcon size={12} color="#fff" strokeWidth={2.5} />
            <Text style={styles.organicText}>Organic</Text>
          </View>
        </View>
      )}
      {isOutOfStock && (
        <View style={styles.outOfStockOverlay}>
          <Text style={styles.outOfStockText}>Out of Stock</Text>
        </View>
      )}
    </View>
  );

  // ── Add / stepper ──────────────────────────────────────────────────────────
  const addControl = (small = false) => {
    if (isOutOfStock) return null;
    if (cartQty > 0) return <QuantityStepper qty={cartQty} small={small} onIncrease={handleIncrease} onDecrease={handleDecrease} />;
    return (
      <TouchableOpacity style={[styles.addBtn, small && styles.addBtnSm]} onPress={handleFirstAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={small ? 14 : 18} color="#fff" />
      </TouchableOpacity>
    );
  };

  const modal = <RatingModal product={product} visible={showRatingModal} onClose={() => setShowRatingModal(false)} />;

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST variant
  // ═══════════════════════════════════════════════════════════════════════════
  if (normalizedVariant === 'list') {
    return (
      <>
        {modal}
        <TouchableOpacity style={[styles.listCard, style]} onPress={handlePress} activeOpacity={0.95}>
          <View style={styles.listImageWrap}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.listImage} resizeMode="cover" />
            ) : (
              <View style={[styles.listImage, styles.imagePlaceholder]}>
                <Ionicons name="leaf-outline" size={24} color={colors.border} />
              </View>
            )}
            {isOutOfStock && (
              <View style={[styles.outOfStockOverlay, { borderRadius: borderRadius.sm }]}>
                <Text style={[styles.outOfStockText, { fontSize: 10 }]}>Out of Stock</Text>
              </View>
            )}
          </View>
          <View style={styles.listContent}>
            {dualRatingRow(true)}
            <Text style={styles.productName} numberOfLines={2}>{productName}</Text>
            <View style={styles.listBottom}>
              {priceTag}
              {addControl(false)}
            </View>
            {deliveryRow}
            {rateStrip}
          </View>
        </TouchableOpacity>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HORIZONTAL variant
  // ═══════════════════════════════════════════════════════════════════════════
  if (normalizedVariant === 'horizontal') {
    return (
      <>
        {modal}
        <TouchableOpacity style={[styles.horizontalCard, style]} onPress={handlePress} activeOpacity={0.95}>
          {imageBlock(120)}
          <View style={styles.horizontalContent}>
            {dualRatingRow(true)}
            <Text style={styles.productNameSm} numberOfLines={2}>{productName}</Text>
            <View style={styles.horizontalBottom}>
              <Text style={styles.priceSm}>{formatCurrency(product.price_per_unit)}</Text>
              {addControl(true)}
            </View>
          </View>
        </TouchableOpacity>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GRID variant (default)
  // ═══════════════════════════════════════════════════════════════════════════
  const hasExternalWidth = style && (style as any).width !== undefined;
  return (
    <>
      {modal}
      <Pressable
        style={[
          styles.gridCard,
          !hasExternalWidth && { width: GRID_CARD_WIDTH },
          Platform.OS === 'web' && styles.gridCardCursor,
          style,
          Platform.OS === 'web' && hovered && styles.gridCardHovered,
        ]}
        onPress={handlePress}
        // @ts-ignore
        onMouseEnter={() => Platform.OS === 'web' && setHovered(true)}
        onMouseLeave={() => Platform.OS === 'web' && setHovered(false)}
      >
        {imageBlock(160)}
        <View style={styles.gridContent}>
          {dualRatingRow()}
          <Text style={styles.productName} numberOfLines={2}>{productName}</Text>
          {product.benefits && product.benefits.length > 0 && (
            <View style={styles.benefitsRow}>
              {product.benefits.slice(0, 2).map((b) => (
                <View key={b} style={styles.benefitChip}>
                  <Text style={styles.benefitChipText}>✦ {b}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.gridBottom}>
            {priceTag}
            {addControl(false)}
          </View>
          {deliveryRow}
          {rateStrip}
        </View>
      </Pressable>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Grid
  gridCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.card,
    marginBottom: spacing.md,
  },
  gridCardHovered: Platform.select({
    web:     { boxShadow: '0 10px 28px rgba(15,118,110,0.18)', transform: [{ translateY: -3 }] } as any,
    default: {},
  }) as any,
  gridCardCursor:  Platform.select({ web: { cursor: 'pointer' } as any, default: {} }) as any,
  gridContent:     { padding: 10 },
  gridBottom:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },

  // ── List
  listCard: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.card, marginBottom: spacing.sm,
  },
  listImageWrap: { width: 88, height: 88, position: 'relative' },
  listImage:     { width: 88, height: 88 },
  listContent:   { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
  listBottom:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },

  // ── Horizontal
  horizontalCard: {
    width: HORIZONTAL_CARD_WIDTH, backgroundColor: colors.surface,
    borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.card, marginRight: spacing.md,
  },
  horizontalContent: { padding: spacing.sm },
  horizontalBottom:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },

  // ── Image
  imageContainer:    { width: '100%', position: 'relative', overflow: 'hidden' },
  image:             { width: '100%', height: '100%' },
  imagePlaceholder:  { backgroundColor: colors.imageBg, alignItems: 'center', justifyContent: 'center' },
  badgeOverlay:      { position: 'absolute', top: spacing.xs, left: spacing.xs },
  organicBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(22,163,74,0.92)',   // matches admin bg-green-600/90
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  organicText: { color: '#fff', fontSize: 11, fontWeight: '600' as const },
  outOfStockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center' },
  outOfStockText:    { color: '#fff', fontWeight: '700' as const, fontSize: 12, letterSpacing: 0.3 },

  // ── Dual rating row
  // Layout: [farmerName  ★farmerRating]   [★productRating]
  dualRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
    gap: 4,
  },
  farmerGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  farmerName: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    flexShrink: 1,
  },
  farmerNameSm:     { fontSize: 9, letterSpacing: 0.3 },
  inlineRating:     { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  inlineRatingText: { fontSize: 9, color: colors.textMuted, lineHeight: 12 },
  ratingCount:      { fontSize: 9, color: colors.textMuted },
  productRating:    { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  productRatingText:{ fontSize: 9, color: colors.textMuted, lineHeight: 12 },

  // ── Product name / price
  productName:   { fontSize: 14, fontWeight: '700' as const, color: colors.textPrimary, lineHeight: 20, marginBottom: 2 },
  productNameSm: { fontSize: 13, fontWeight: '600' as const, color: colors.textPrimary, lineHeight: 18, marginBottom: 4 },
  discountBadge: { fontSize: 10, fontWeight: '700' as const, color: colors.accent, marginBottom: 1, letterSpacing: 0.3 },
  priceRow:      { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  price:         { fontSize: 17, fontWeight: '800' as const, color: colors.accent, letterSpacing: -0.3 },
  priceSm:       { fontSize: 14, fontWeight: '800' as const, color: colors.accent },
  unit:          { fontSize: 11, color: colors.textMuted, fontWeight: '500' as const },
  originalPrice: { fontSize: 11, color: colors.textMuted, textDecorationLine: 'line-through' as const, marginLeft: 4 },

  // ── Benefits highlights
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 4,
    marginTop: 4,
    marginBottom: 2,
  },
  benefitChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 99,
  },
  benefitChipText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#92400E',
    letterSpacing: 0.1,
  },

  // ── Delivery row (bottom)
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  deliveryText: { fontSize: 10, color: colors.textMuted },
  deliveryDate: { fontWeight: '600' as const, color: colors.success },

  // ── Rate strip (shown only after delivery)
  rateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  miniStars:           { flexDirection: 'row', gap: 1 },
  rateStripLabel:      { fontSize: 10, color: colors.textMuted, fontWeight: '500' as const, flex: 1 },
  rateStripLabelEmpty: { fontSize: 10, color: colors.primary, fontWeight: '600' as const, flex: 1 },

  // ── Add button
  addBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnSm: { width: 26, height: 26, borderRadius: 13 },

  // ── Quantity stepper
  stepper:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: borderRadius.full, height: 32, paddingHorizontal: 4 },
  stepperSm: { height: 26, paddingHorizontal: 2 },
  stepBtn:   { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepBtnSm: { width: 20, height: 20, borderRadius: 10 },
  stepQty:   { minWidth: 22, textAlign: 'center', fontSize: 13, fontWeight: '700' as const, color: '#fff' },
  stepQtySm: { minWidth: 18, fontSize: 11 },
});
