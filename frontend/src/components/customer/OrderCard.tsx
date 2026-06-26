import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Order } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/formatting';
import { Badge } from '../common/Badge';
import { useTranslation } from 'react-i18next';

const STATUS_ACCENT_COLOR: Record<string, string> = {
  pending: colors.warning,
  placed: colors.warning,
  confirmed: colors.primary,
  packed: colors.primaryLight,
  dispatched: colors.info,
  delivered: colors.success,
  completed: colors.success,
  cancelled: colors.error,
};

interface OrderCardProps {
  order: Order;
  onPress?: () => void;
  style?: object;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress, style }) => {
  const { t, i18n } = useTranslation('orders');
  const lang = i18n.language as 'en' | 'mr';

  const accentColor = STATUS_ACCENT_COLOR[order.status] ?? colors.textMuted;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/customer/order/${order.id}`);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: accentColor }, style]}
      onPress={handlePress}
      activeOpacity={0.95}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.orderId}>Order #{order.order_id}</Text>
          <Text style={styles.date}>{formatDate(order.placed_at, lang)}</Text>
        </View>
        <Badge status={order.status} />
      </View>

      {/* Thumbnails */}
      <View style={styles.itemsRow}>
        {order.items.slice(0, 3).map((item) => {
          const primaryImage =
            item.product.images?.find((img) => img.is_primary) || item.product.images?.[0];
          return (
            <View key={item.id} style={styles.thumbnail}>
              {primaryImage ? (
                <Image
                  source={{ uri: primaryImage.image_url }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumbnailImage, styles.thumbnailPlaceholder]}>
                  <Ionicons name="leaf-outline" size={14} color={colors.border} />
                </View>
              )}
            </View>
          );
        })}
        {order.items.length > 3 && (
          <View style={[styles.thumbnail, styles.overflowThumbnail]}>
            <Text style={styles.overflowText}>+{order.items.length - 3}</Text>
          </View>
        )}
        <Text style={styles.itemCount}>
          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.totalLabel}>
          {t('grandTotal')}:{' '}
          <Text style={styles.totalAmount}>{formatCurrency(order.total_amount)}</Text>
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowThumbnail: {
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.primaryPastel,
  },
  overflowText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  itemCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
});
