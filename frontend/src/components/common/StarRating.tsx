import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  /** @deprecated use onRate */
  onRatingChange?: (rating: number) => void;
  showNumber?: boolean;
  showCount?: boolean;
  count?: number;
  color?: string;
  style?: object;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 14,
  interactive = false,
  onRate,
  onRatingChange,
  showNumber = false,
  showCount = false,
  count,
  color,
  style,
}) => {
  const handleRate = onRate ?? onRatingChange;
  const stars = Array.from({ length: maxRating }, (_, i) => i + 1);

  const getStarIcon = (star: number): keyof typeof Ionicons.glyphMap => {
    if (interactive) {
      return rating >= star ? 'star' : 'star-outline';
    }
    if (rating >= star) return 'star';
    if (rating >= star - 0.5) return 'star-half';
    return 'star-outline';
  };

  const filledColor = color ?? colors.primary;

  const getStarColor = (star: number): string => {
    if (interactive) {
      return rating >= star ? filledColor : '#D1D5DB';
    }
    return rating >= star - 0.5 ? filledColor : '#D1D5DB';
  };

  return (
    <View style={[styles.container, style]}>
      {stars.map((star) =>
        interactive ? (
          <TouchableOpacity
            key={star}
            onPress={() => handleRate?.(star)}
            activeOpacity={0.7}
            style={styles.star}
          >
            <Ionicons name={getStarIcon(star)} size={size} color={getStarColor(star)} />
          </TouchableOpacity>
        ) : (
          <View key={star} style={styles.star}>
            <Ionicons name={getStarIcon(star)} size={size} color={getStarColor(star)} />
          </View>
        )
      )}
      {showNumber && (
        <Text style={[styles.number, { fontSize: size, color: filledColor }]}>{rating.toFixed(1)}</Text>
      )}
      {showCount && count !== undefined && (
        <Text style={[styles.count, { fontSize: size - 1 }]}>({count})</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 1,
  },
  number: {
    fontWeight: '700' as const,
    color: colors.primary,
    marginLeft: 4,
    lineHeight: 18,
  },
  count: {
    color: colors.textMuted,
    marginLeft: 3,
    lineHeight: 18,
  },
});
