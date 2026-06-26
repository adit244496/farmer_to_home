import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Review } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { formatDate } from '../../utils/formatting';
import { StarRating } from '../common/StarRating';
import { useLanguage } from '../../hooks/useLanguage';

interface ReviewCardProps {
  review: Review;
  style?: object;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
};

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, style }) => {
  const { language } = useLanguage();
  const initials = getInitials(review.customer.full_name);

  return (
    <View style={[styles.container, style]}>
      {/* Header: avatar + name + date */}
      <View style={styles.header}>
        <View style={styles.customerRow}>
          {review.customer.profile_photo ? (
            <Image
              source={{ uri: review.customer.profile_photo }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{review.customer.full_name}</Text>
            <Text style={styles.date}>
              {formatDate(review.created_at, language as 'en' | 'mr')}
            </Text>
          </View>
        </View>
        <StarRating rating={review.rating} size={14} />
      </View>

      {/* Comment */}
      <Text style={styles.comment}>{review.comment}</Text>

      {/* Photos */}
      {review.photos && review.photos.length > 0 && (
        <View style={styles.photosRow}>
          {review.photos.map((photo, idx) => (
            <Image
              key={idx}
              source={{ uri: photo }}
              style={styles.reviewPhoto}
              resizeMode="cover"
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: spacing.sm,
    ...shadows.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  comment: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  photosRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.sm,
  },
});
