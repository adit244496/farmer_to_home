import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  required?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      secureTextEntry,
      disabled = false,
      style,
      inputStyle,
      required,
      onFocus: onFocusProp,
      onBlur: onBlurProp,
      multiline,
      numberOfLines,
      ...rest
    },
    ref
  ) => {
    const [isSecureVisible, setIsSecureVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isPassword = secureTextEntry !== undefined;
    const hasError = Boolean(error);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocusProp?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlurProp?.(e);
    };

    return (
      <View style={[styles.container, style]}>
        {label && (
          <View style={styles.labelRow}>
            <Text style={styles.label}>{label}</Text>
            {required && <Text style={styles.required}> *</Text>}
          </View>
        )}
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            hasError && styles.inputWrapperError,
            disabled && styles.inputWrapperDisabled,
            multiline && styles.inputWrapperMultiline,
          ]}
        >
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={20}
              color={isFocused ? colors.primary : colors.textMuted}
              style={styles.leftIcon}
            />
          )}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              leftIcon ? styles.inputWithLeftIcon : null,
              (rightIcon || isPassword) ? styles.inputWithRightIcon : null,
              multiline && styles.inputMultiline,
              inputStyle,
              { outlineWidth: 0, outlineStyle: 'none' } as any,
            ]}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={isPassword ? !isSecureVisible : false}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            multiline={multiline}
            numberOfLines={numberOfLines}
            {...rest}
          />
          {isPassword && (
            <TouchableOpacity
              onPress={() => setIsSecureVisible(!isSecureVisible)}
              style={styles.rightIconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isSecureVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={isFocused ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          )}
          {!isPassword && rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightIconButton}
              disabled={!onRightIconPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={rightIcon}
                size={20}
                color={isFocused ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
        {hasError ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={13} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  required: {
    color: colors.error,
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  inputWrapperDisabled: {
    backgroundColor: '#F9FAFB',
  },
  inputWrapperMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    ...typography.body,
    color: colors.textPrimary,
    height: 48,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  inputMultiline: {
    height: undefined,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  leftIcon: {
    marginLeft: 14,
  },
  rightIconButton: {
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    lineHeight: 16,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
});
