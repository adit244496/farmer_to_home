import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Farmer } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../theme';
import { StarRating } from '../common/StarRating';
import { useLanguage } from '../../hooks/useLanguage';

type FarmerCardVariant = 'card' | 'list' | 'compact';

interface FarmerCardProps {
  farmer: Farmer;
  onPress?: () => void;
  variant?: FarmerCardVariant;
  style?: object;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
};

export const FarmerCard: React.FC<FarmerCardProps> = ({
  farmer,
  onPress,
  variant = 'card',
  style,
}) => {
  const { language } = useLanguage();
  const isNewFarmer = farmer.total_ratings < 5;
  const initials = getInitials(farmer.full_name);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/customer/farmer/${farmer.id}`);
    }
  };

  const avatarBlock = (size: number) => (
    <View style={[styles.avatarWrapper, { width: size, height: size, borderRadius: size / 2 }]}>
      {farmer.profile_photo ? (
        <Image
          source={{ uri: farmer.profile_photo }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.avatarInitials, { fontSize: size * 0.36 }]}>{initials}</Text>
        </View>
      )}
    </View>
  );

  if (variant === 'compact') {
    return (
      <TouchableOpacity style={[styles.compactCard, style]} onPress={handlePress} activeOpacity={0.95}>
        <View style={styles.compactImageWrapper}>
          {farmer.profile_photo ? (
            <Image
              source={{ uri: farmer.profile_photo }}
              style={styles.compactImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.compactImage, styles.compactImageFallback]}>
              <Text style={styles.compactInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>{farmer.full_name}</Text>
          <StarRating rating={farmer.rating} size={11} showNumber />
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'list') {
    return (
      <TouchableOpacity style={[styles.listCard, style]} onPress={handlePress} activeOpacity={0.95}>
        {avatarBlock(44)}
        <View style={styles.listContent}>
          <Text style={styles.name} numberOfLines={1}>{farmer.full_name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.location} numberOfLines={1}>
              {farmer.district}, {farmer.village}
            </Text>
          </View>
        </View>
        <View style={styles.listRight}>
          {isNewFarmer ? (
            <Text style={styles.newLabel}>{language === 'mr' ? 'नवीन' : 'New'}</Text>
          ) : (
            <StarRating rating={farmer.rating} size={12} showNumber />
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  // Default: card
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={handlePress} activeOpacity={0.95}>
      <View style={styles.cardTopRow}>
        {avatarBlock(50)}
        <View style={styles.cardInfo}>
          <Text style={styles.name} numberOfLines={1}>{farmer.full_name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.location} numberOfLines={1}>
              {farmer.district}, {farmer.village}
            </Text>
          </View>
          <View style={styles.ratingRow}>
            {isNewFarmer ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>
                  {language === 'mr' ? 'नवीन शेतकरी' : 'New Farmer'}
                </Text>
              </View>
            ) : (
              <StarRating rating={farmer.rating} size={12} showNumber showCount count={farmer.total_ratings} />
            )}
          </View>
        </View>
      </View>

      {farmer.produce_types && farmer.produce_types.length > 0 && (
        <View style={styles.tagsRow}>
          {farmer.produce_types.slice(0, 4).map((tag, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.statItem}>
          <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
          <Text style={styles.statText}>
            {farmer.total_orders_fulfilled}{' '}
            {language === 'mr' ? 'ऑर्डर' : 'orders fulfilled'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ── Card ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  // ── List ────────────────────────────────────────────────────────────────
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.xs,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  listContent: {
    flex: 1,
  },
  listRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  // ── Compact ─────────────────────────────────────────────────────────────
  compactCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.card,
    marginRight: spacing.md,
  },
  compactImageWrapper: {
    width: '100%',
    height: 80,
    overflow: 'hidden',
  },
  compactImage: {
    width: '100%',
    height: 80,
  },
  compactImageFallback: {
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactInitials: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  compactContent: {
    padding: spacing.sm,
  },
  compactName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  // ── Avatar ──────────────────────────────────────────────────────────────
  avatarWrapper: {
    overflow: 'hidden',
  },
  avatar: {},
  avatarFallback: {
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '700' as const,
    color: colors.primary,
  },
  // ── Common ──────────────────────────────────────────────────────────────
  name: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 5,
  },
  location: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newBadge: {
    backgroundColor: colors.accentPastel,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.accentDark,
  },
  newLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.accent,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  tag: {
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: colors.primaryDark,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
