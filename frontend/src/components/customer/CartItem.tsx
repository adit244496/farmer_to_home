import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem as CartItemType } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatting';
import { useLanguage } from '../../hooks/useLanguage';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (productId: number, qty: number) => void;
  onRemove: (productId: number) => void;
}

export const CartItemComponent: React.FC<CartItemProps> = ({
  item,
  onQuantityChange,
  onRemove,
}) => {
  const { getLocalizedText } = useLanguage();
  const primaryImage =
    item.product.images?.find((img) => img.is_primary) || item.product.images?.[0];
  const productName = getLocalizedText(item.product.name_en, item.product.name_mr);

  const canDecrement = item.quantity > item.product.min_order_qty;
  const canIncrement = item.quantity < item.product.stock_quantity;

  const handleDecrement = () => {
    if (canDecrement) {
      onQuantityChange(item.product.id, item.quantity - 1);
    } else {
      onRemove(item.product.id);
    }
  };

  const handleIncrement = () => {
    if (canIncrement) {
      onQuantityChange(item.product.id, item.quantity + 1);
    }
  };

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
        <Text style={styles.productName} numberOfLines={2}>{productName}</Text>
        <Text style={styles.farmerName} numberOfLines={1}>
          {item.product.farmer.full_name}
        </Text>
        <Text style={styles.unitPrice}>
          {formatCurrency(item.unit_price)}/{item.product.unit}
        </Text>

        <View style={styles.bottomRow}>
          {/* Stepper */}
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepperButton, styles.stepperMinus]}
              onPress={handleDecrement}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {canDecrement ? (
                <Ionicons name="remove" size={16} color={colors.primary} />
              ) : (
                <Ionicons name="trash-outline" size={14} color={colors.error} />
              )}
            </TouchableOpacity>
            <Text style={styles.qty}>{item.quantity}</Text>
            <TouchableOpacity
              style={[
                styles.stepperButton,
                styles.stepperPlus,
                !canIncrement && styles.stepperDisabled,
              ]}
              onPress={handleIncrement}
              disabled={!canIncrement}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={16} color={colors.textInverse} />
            </TouchableOpacity>
          </View>

          {/* Subtotal */}
          <Text style={styles.subtotal}>{formatCurrency(item.subtotal)}</Text>
        </View>
      </View>

      {/* Remove button */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(item.product.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </TouchableOpacity>
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
    alignItems: 'flex-start',
    ...shadows.xs,
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
    marginRight: spacing.xs,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    lineHeight: 19,
    marginBottom: 2,
  },
  farmerName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    marginBottom: 3,
  },
  unitPrice: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    overflow: 'hidden',
    height: 32,
  },
  stepperButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperMinus: {
    backgroundColor: 'transparent',
  },
  stepperPlus: {
    backgroundColor: colors.accent,
  },
  stepperDisabled: {
    backgroundColor: colors.divider,
    opacity: 0.5,
  },
  qty: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    paddingHorizontal: 10,
    minWidth: 28,
    textAlign: 'center',
  },
  subtotal: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  removeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.divider,
    marginTop: 2,
  },
});
