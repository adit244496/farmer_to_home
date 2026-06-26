import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography } from '../../theme';

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const getIconColor = (variant: ButtonVariant): string => {
  switch (variant) {
    case 'outline':
    case 'ghost':
      return colors.primary;
    case 'secondary':
      return colors.primary;
    default:
      return colors.textInverse;
  }
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const iconColor = getIconColor(variant);
  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 22 : 18;

  const spinnerColor =
    variant === 'outline' || variant === 'ghost' || variant === 'secondary'
      ? colors.primary
      : colors.textInverse;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <View style={styles.content}>
          <ActivityIndicator size="small" color={spinnerColor} style={styles.spinnerLeft} />
          <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
            {title}
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.iconLeft} />
          )}
          <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.iconRight} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  // Variants
  variant_primary: {
    backgroundColor: colors.primary,
  },
  variant_accent: {
    backgroundColor: colors.accent,
  },
  variant_secondary: {
    backgroundColor: colors.primaryPastel,
  },
  variant_outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: colors.error,
  },
  variant_dark: {
    backgroundColor: '#111827',
  },
  // Sizes
  size_sm: {
    height: 36,
    paddingHorizontal: 16,
  },
  size_md: {
    height: 48,
    paddingHorizontal: 20,
  },
  size_lg: {
    height: 56,
    paddingHorizontal: 24,
  },
  // Text styles
  text: {
    ...typography.button,
  },
  text_primary: {
    color: colors.textInverse,
  },
  text_accent: {
    color: colors.textInverse,
  },
  text_secondary: {
    color: colors.primary,
  },
  text_outline: {
    color: colors.primary,
  },
  text_ghost: {
    color: colors.primary,
  },
  text_danger: {
    color: colors.textInverse,
  },
  text_dark: {
    color: colors.textInverse,
  },
  textSize_sm: {
    ...typography.buttonSm,
  },
  textSize_md: {
    ...typography.button,
  },
  textSize_lg: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  iconLeft: {
    marginRight: spacing.xs,
  },
  iconRight: {
    marginLeft: spacing.xs,
  },
  spinnerLeft: {
    marginRight: spacing.xs,
  },
});
