import React from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface Category {
  id: string;
  name: string;
  icon?: string;
  slug?: string;
}

interface CategoryChipProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  horizontal?: boolean;
  showAll?: boolean;
  allLabel?: string;
  style?: ViewStyle;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  categories,
  selected,
  onSelect,
  horizontal = true,
  showAll = true,
  allLabel = 'All',
  style,
}) => {
  const isSelected = (id: string | null) => selected === id;

  const chips = (
    <>
      {showAll && (
        <TouchableOpacity
          style={[styles.chip, isSelected(null) && styles.chipSelected]}
          onPress={() => onSelect(null)}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, isSelected(null) && styles.chipTextSelected]}>
            {allLabel}
          </Text>
        </TouchableOpacity>
      )}
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[styles.chip, isSelected(cat.id) && styles.chipSelected]}
          onPress={() => onSelect(cat.id)}
          activeOpacity={0.8}
        >
          {cat.icon ? (
            <Text style={[styles.chipIcon]}>{cat.icon} </Text>
          ) : null}
          <Text style={[styles.chipText, isSelected(cat.id) && styles.chipTextSelected]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, style]}
      >
        {chips}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.wrapContainer, style]}>
      {chips}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  wrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    fontSize: 14,
    lineHeight: 18,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  chipTextSelected: {
    color: colors.textInverse,
    fontWeight: '600' as const,
  },
});
