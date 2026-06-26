import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Button } from './Button';

type EmptyStateVariant = 'default' | 'search' | 'cart' | 'orders';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** @deprecated use actionLabel */
  ctaLabel?: string;
  /** @deprecated use onAction */
  onCta?: () => void;
  variant?: EmptyStateVariant;
  style?: ViewStyle;
}

interface VariantPreset {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

const VARIANT_PRESETS: Record<EmptyStateVariant, VariantPreset> = {
  default: {
    icon: 'file-tray-outline',
    title: 'Nothing here yet',
    subtitle: 'Check back later for updates.',
  },
  search: {
    icon: 'search-outline',
    title: 'No results found',
    subtitle: 'Try different keywords or adjust your filters.',
  },
  cart: {
    icon: 'bag-outline',
    title: 'Your cart is empty',
    subtitle: 'Add some fresh produce from our farmers to get started.',
  },
  orders: {
    icon: 'receipt-outline',
    title: 'No orders yet',
    subtitle: 'Your order history will appear here once you place an order.',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  ctaLabel,
  onCta,
  variant = 'default',
  style,
}) => {
  // Support legacy prop names
  const resolvedActionLabel = actionLabel ?? ctaLabel;
  const resolvedOnAction = onAction ?? onCta;
  const preset = VARIANT_PRESETS[variant];
  const displayIcon = icon ?? preset.icon;
  const displayTitle = title ?? preset.title;
  const displaySubtitle = subtitle ?? preset.subtitle;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={displayIcon} size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.subtitle}>{displaySubtitle}</Text>
      {resolvedActionLabel && resolvedOnAction && (
        <Button
          title={resolvedActionLabel}
          onPress={resolvedOnAction}
          variant="accent"
          size="md"
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.huge,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xxl,
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  actionButton: {
    minWidth: 160,
  },
});
