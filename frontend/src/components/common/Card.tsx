import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, shadows } from '../../theme';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: CardVariant;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
}) => {
  const cardStyle: ViewStyle[] = [styles.base, styles[`variant_${variant}`], style as ViewStyle];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.97}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  variant_default: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  variant_elevated: {
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  variant_outlined: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variant_flat: {
    backgroundColor: colors.background,
  },
});
