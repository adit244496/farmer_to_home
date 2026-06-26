import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius } from '../../theme';

type BadgeVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'pending'
  | 'primary'
  | 'accent'
  | 'gray';

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label?: string;
  status?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: ViewStyle;
}

const STATUS_MAP: Record<string, BadgeVariant> = {
  // success
  approved: 'success',
  active: 'success',
  delivered: 'success',
  completed: 'success',
  paid: 'success',
  // error
  rejected: 'error',
  cancelled: 'error',
  cancelled_by_farmer: 'error',
  cancelled_by_customer: 'error',
  out_of_stock: 'error',
  unpaid: 'error',
  failed: 'error',
  // warning / amber
  pending: 'pending',
  placed: 'pending',
  low_stock: 'warning',
  // info / blue
  dispatched: 'info',
  refunded: 'info',
  // primary / teal
  confirmed: 'primary',
  packed: 'primary',
  // gray
  suspended: 'gray',
  inactive: 'gray',
};

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  success: { bg: colors.successLight, text: colors.success, dot: colors.success },
  error: { bg: colors.errorLight, text: colors.error, dot: colors.error },
  warning: { bg: colors.warningLight, text: colors.warning, dot: colors.warning },
  info: { bg: colors.infoLight, text: colors.info, dot: colors.info },
  pending: { bg: colors.warningLight, text: '#B45309', dot: '#B45309' },
  primary: { bg: colors.primaryPastel, text: colors.primaryDark, dot: colors.primary },
  accent: { bg: colors.accentPastel, text: colors.accentDark, dot: colors.accent },
  gray: { bg: colors.divider, text: colors.textSecondary, dot: colors.textMuted },
};

const formatLabel = (status: string): string => {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  status,
  variant,
  size = 'md',
  dot = false,
  style,
}) => {
  const resolvedVariant: BadgeVariant =
    variant ??
    (status ? STATUS_MAP[status.toLowerCase()] ?? 'gray' : 'gray');

  const variantStyle = VARIANT_STYLES[resolvedVariant];
  const displayLabel = label ?? (status ? formatLabel(status) : '');

  return (
    <View
      style={[
        styles.container,
        size === 'sm' ? styles.containerSm : styles.containerMd,
        { backgroundColor: variantStyle.bg },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dotCircle,
            size === 'sm' ? styles.dotSm : styles.dotMd,
            { backgroundColor: variantStyle.dot },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: variantStyle.text },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  containerSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  containerMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dotCircle: {
    borderRadius: 99,
    marginRight: 5,
  },
  dotSm: {
    width: 6,
    height: 6,
  },
  dotMd: {
    width: 7,
    height: 7,
  },
  text: {
    fontWeight: '600' as const,
  },
  textSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  textMd: {
    fontSize: 12,
    lineHeight: 16,
  },
});
