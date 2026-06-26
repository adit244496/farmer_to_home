import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { useCartStore } from '../../store/cartStore';
import { useLanguage } from '../../hooks/useLanguage';

type HeaderVariant = 'default' | 'transparent' | 'teal';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** @deprecated use onBack */
  onBackPress?: () => void;
  showCart?: boolean;
  cartCount?: number;
  showNotification?: boolean;
  notificationCount?: number;
  showLanguageToggle?: boolean;
  rightComponent?: ReactNode;
  variant?: HeaderVariant;
  /** @deprecated use variant='transparent' */
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  onBackPress,
  showCart = false,
  cartCount,
  showNotification = false,
  notificationCount,
  showLanguageToggle = false,
  rightComponent,
  variant: variantProp = 'default',
  transparent,
}) => {
  const variant: HeaderVariant = transparent ? 'transparent' : variantProp;
  const insets = useSafeAreaInsets();
  const { items } = useCartStore();
  const { toggleLanguage, currentLanguageLabel } = useLanguage();

  const totalCartCount =
    cartCount !== undefined
      ? cartCount
      : items.reduce((sum, item) => sum + item.quantity, 0);

  const isTeal = variant === 'teal';
  const isTransparent = variant === 'transparent';

  const iconColor = isTeal || isTransparent ? colors.textInverse : colors.textPrimary;
  const titleColor = isTeal || isTransparent ? colors.textInverse : colors.textPrimary;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const topPad =
    Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top;

  return (
    <View
      style={[
        styles.container,
        isTeal && styles.containerTeal,
        isTransparent && styles.containerTransparent,
        { paddingTop: topPad },
      ]}
    >
      <View style={styles.content}>
        {/* Left */}
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity onPress={handleBack} style={styles.iconButton} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={26} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center */}
        <View style={styles.titleContainer}>
          {title ? (
            <>
              <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[styles.subtitle, { color: isTeal ? 'rgba(255,255,255,0.75)' : colors.textMuted }]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>

        {/* Right */}
        <View style={styles.right}>
          {showLanguageToggle && (
            <TouchableOpacity
              onPress={toggleLanguage}
              style={[styles.langButton, isTeal && styles.langButtonTeal]}
              activeOpacity={0.8}
            >
              <Text style={[styles.langText, isTeal && styles.langTextTeal]}>
                {currentLanguageLabel}
              </Text>
            </TouchableOpacity>
          )}

          {rightComponent ?? null}

          {showNotification && (
            <TouchableOpacity
              onPress={() => router.push('/customer/notifications')}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={24} color={iconColor} />
              {notificationCount !== undefined && notificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {showCart && (
            <TouchableOpacity
              onPress={() => router.push('/customer/cart')}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Ionicons name="bag-outline" size={24} color={iconColor} />
              {totalCartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {totalCartCount > 99 ? '99+' : totalCartCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  containerTeal: {
    backgroundColor: colors.primary,
    borderBottomWidth: 0,
  },
  containerTransparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.md,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: colors.textMuted,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 44,
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  langButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  langButtonTeal: {
    borderColor: 'rgba(255,255,255,0.7)',
  },
  langText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
  langTextTeal: {
    color: colors.textInverse,
  },
});
