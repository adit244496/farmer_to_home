import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'small' | 'large';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  text?: string;
  fullScreen?: boolean;
  /** @deprecated use fullScreen */
  overlay?: boolean;
  color?: string;
  style?: object;
}

const NATIVE_SIZE: Record<SpinnerSize, 'small' | 'large'> = {
  sm: 'small',
  md: 'small',
  lg: 'large',
  small: 'small',
  large: 'large',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  fullScreen = false,
  overlay = false,
  color = colors.primary,
  style,
}) => {
  const isFullScreen = fullScreen || overlay;
  return (
    <View style={[styles.container, isFullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size={NATIVE_SIZE[size]} color={color} />
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    zIndex: 999,
  },
  text: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
