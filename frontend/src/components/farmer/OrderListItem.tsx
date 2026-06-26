import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/formatting';
import { Badge } from '../common/Badge';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';

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

const CONTEXT_ACTION_LABEL: Record<string, string> = {
  pending: 'Confirm',
  placed: 'Confirm',
  confirmed: 'Pack',
  packed: 'Dispatch',
  dispatched: 'Deliver',
};

interface OrderListItemProps {
  order: Order;
  onPress: (order: Order) => void;
  onAction?: (order: Order) => void;
  actionLabel?: string;
}

export const OrderListItem: React.FC<OrderListItemProps> = ({
  order,
  onPress,
  onAction,
  actionLabel,
}) => {
  const { language } = useLanguage();

  const accentColor = STATUS_ACCENT_COLOR[order.status] ?? colors.textMuted;
  const contextLabel = actionLabel ?? CONTEXT_ACTION_LABEL[order.status];

  const itemsText = `${order.items.length} item${order.items.length !== 1 ? 's' : ''}`;
  const customerCity =
    order.delivery_address?.city ?? order.customer.full_name.split(' ')[0];

  const isActionableTeal = ['pending', 'placed', 'confirmed'].includes(order.status);

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: accentColor }]}
      onPress={() => onPress(order)}
      activeOpacity={0.95}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <Text style={styles.orderId}>#{order.order_id}</Text>
        <Badge status={order.status} size="sm" />
      </View>

      {/* Items + amount */}
      <View style={styles.summaryRow}>
        <Ionicons name="cube-outline" size={14} color={colors.textMuted} />
        <Text style={styles.summaryText}>
          {itemsText} · {formatCurrency(order.total_amount)}
        </Text>
      </View>

      {/* Customer city */}
      <View style={styles.customerRow}>
        <Ionicons name="location-outline" size={13} color={colors.textMuted} />
        <Text style={styles.customerText} numberOfLines={1}>
          {customerCity}
        </Text>
        <Text style={styles.dateText}>{formatDate(order.placed_at, language as 'en' | 'mr')}</Text>
      </View>

      {/* Action */}
      {contextLabel && onAction && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isActionableTeal ? styles.actionButtonTeal : styles.actionButtonOrange,
            ]}
            onPress={() => onAction(order)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.actionButtonText,
                isActionableTeal ? styles.actionButtonTextTeal : styles.actionButtonTextOrange,
              ]}
            >
              {contextLabel}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={isActionableTeal ? colors.primary : colors.accent}
            />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.xs,
    borderLeftWidth: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  customerText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    alignItems: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  actionButtonTeal: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryPastel,
  },
  actionButtonOrange: {
    borderColor: colors.accent,
    backgroundColor: colors.accentPastel,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  actionButtonTextTeal: {
    color: colors.primary,
  },
  actionButtonTextOrange: {
    color: colors.accentDark,
  },
});
