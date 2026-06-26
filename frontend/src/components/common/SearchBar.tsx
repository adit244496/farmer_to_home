import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  onFocus?: () => void;
  showFilter?: boolean;
  onFilterPress?: () => void;
  editable?: boolean;
  autoFocus?: boolean;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search fresh produce...',
  onSubmit,
  onFocus: onFocusProp,
  showFilter = false,
  onFilterPress,
  editable = true,
  autoFocus = false,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocusProp?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const inner = (
    <View
      style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused,
        !editable && styles.inputWrapperStatic,
      ]}
    >
      <Ionicons
        name="search-outline"
        size={20}
        color={isFocused ? colors.primary : colors.textMuted}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.input, { outlineWidth: 0, outlineStyle: 'none' } as any]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoFocus={autoFocus}
        editable={editable}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={styles.rightIconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : (
        <View style={styles.rightIconButton}>
          <Ionicons name="mic-outline" size={20} color={colors.accent} />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {editable ? (
        inner
      ) : (
        <TouchableOpacity onPress={onFocusProp} activeOpacity={0.85} style={styles.stretch}>
          {inner}
        </TouchableOpacity>
      )}
      {showFilter && (
        <TouchableOpacity style={styles.filterButton} onPress={onFilterPress} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stretch: {
    flex: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.divider,
    borderRadius: borderRadius.lg,
    height: 48,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  inputWrapperStatic: {
    backgroundColor: colors.divider,
  },
  searchIcon: {
    marginLeft: 14,
    marginRight: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    height: '100%',
  },
  rightIconButton: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
});
