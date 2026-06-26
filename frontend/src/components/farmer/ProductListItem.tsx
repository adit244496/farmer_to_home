import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatting';
import { Badge } from '../common/Badge';
import { useLanguage } from '../../hooks/useLanguage';
import { useTranslation } from 'react-i18next';

interface ProductListItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onStockUpdate?: (product: Product) => void;
  /** @deprecated use onStockUpdate */
  onUpdateStock?: (product: Product) => void;
}

export const ProductListItem: React.FC<ProductListItemProps> = ({
  product,
  onEdit,
  onDelete,
  onStockUpdate,
  onUpdateStock,
}) => {
  const handleStockUpdate = onStockUpdate ?? onUpdateStock;
  const { getLocalizedText } = useLanguage();
  const { t } = useTranslation('farmer');

  const primaryImage =
    product.images?.find((img) => img.is_primary) || product.images?.[0];
  const productName = getLocalizedText(product.name_en, product.name_mr);

  const isOutOfStock = product.stock_quantity === 0;
  const isVeryLowStock = product.stock_quantity >= 1 && product.stock_quantity <= 1;
  const isLowStock = product.stock_quantity >= 2 && product.stock_quantity <= 9;
  const isGoodStock = product.stock_quantity > 9;

  const stockColor = isOutOfStock
    ? colors.error
    : isVeryLowStock
    ? colors.error
    : isLowStock
    ? colors.accent
    : colors.success;

  const badgeStatus = isOutOfStock
    ? 'out_of_stock'
    : isLowStock || isVeryLowStock
    ? 'low_stock'
    : product.is_active
    ? 'active'
    : 'inactive';

  return (
    <View style={styles.container}>
      {/* Image */}
      {primaryImage ? (
        <Image source={{ uri: primaryImage.image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="leaf-outline" size={22} color={colors.border} />
        </View>
      )}

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={2}>{productName}</Text>
          <Badge status={badgeStatus} size="sm" />
        </View>
        <Text style={styles.category}>{product.category}</Text>
        <Text style={styles.price}>
          {formatCurrency(product.price_per_unit)}/{product.unit}
        </Text>
        <View style={styles.stockRow}>
          <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
          <Text style={[styles.stockText, { color: stockColor }]}>
            {t('stock')}: {product.stock_quantity} {product.unit}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutlineTeal]}
            onPress={() => onEdit(product)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={14} color={colors.primary} />
            <Text style={styles.actionBtnTextTeal}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutlineOrange]}
            onPress={() => handleStockUpdate?.(product)}
            activeOpacity={0.8}
          >
            <Ionicons name="layers-outline" size={14} color={colors.accent} />
            <Text style={styles.actionBtnTextOrange}>Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnGhostRed]}
            onPress={() => onDelete(product)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={14} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.xs,
    alignItems: 'flex-start',
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  imagePlaceholder: {
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    marginLeft: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: spacing.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    lineHeight: 19,
    flex: 1,
  },
  category: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.primary,
    marginBottom: 5,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
  },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  actionBtnOutlineTeal: {
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  actionBtnTextTeal: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  actionBtnOutlineOrange: {
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  actionBtnTextOrange: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.accent,
  },
  actionBtnGhostRed: {
    borderColor: 'transparent',
    backgroundColor: colors.errorLight,
    paddingHorizontal: 8,
  },
});
