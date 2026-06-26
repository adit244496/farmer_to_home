import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography, shadows, webStyles } from '../../theme';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../hooks/useLanguage';

const logoIcon = require('../../../assets/icon.png');

export const WebNavBar: React.FC = () => {
  const router = useRouter();
  const { toggleLanguage, currentLanguageLabel } = useLanguage();
  const items = useCartStore((s) => s.items);
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();

  const isMobile = width < 640;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifHovered, setNotifHovered] = useState(false);
  const [cartHovered, setCartHovered] = useState(false);
  const [profileHovered, setProfileHovered] = useState(false);
  const [langHovered, setLangHovered] = useState(false);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .slice(0, 2)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
    : user?.phone?.slice(-2) ?? 'U';

  return (
    <View style={styles.navBar}>
      <View style={styles.inner}>
        {/* Logo */}
        <TouchableOpacity
          onPress={() => router.push('/customer/home')}
          style={[styles.logoBtn, webStyles.clickable, webStyles.noSelect]}
          activeOpacity={0.85}
        >
          <Image source={logoIcon} style={styles.logoIconImg} resizeMode="contain" />
        </TouchableOpacity>

        {/* Search bar — tablet+ */}
        {!isMobile && (
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Ionicons
              name="search-outline"
              size={17}
              color={searchFocused ? colors.primaryLight : 'rgba(255,255,255,0.6)'}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vegetables, fruits, grains..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onSubmitEditing={() => {
                const q = searchQuery.trim();
                if (q) router.push({ pathname: '/customer/search-results', params: { q } });
              }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={15} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Right actions */}
        <View style={styles.actions}>
          {/* Mobile search */}
          {isMobile && (
            <Pressable
              style={[styles.iconBtn, webStyles.clickable]}
              onPress={() => router.push('/customer/search')}
            >
              <Ionicons name="search-outline" size={22} color="#fff" />
            </Pressable>
          )}

          {/* Language toggle */}
          {!isMobile && (
            <Pressable
              style={[styles.langPill, langHovered && styles.langPillHovered, webStyles.clickable, webStyles.noSelect]}
              onPress={toggleLanguage}
              // @ts-ignore
              onMouseEnter={() => setLangHovered(true)}
              onMouseLeave={() => setLangHovered(false)}
            >
              <Text style={styles.langText}>{currentLanguageLabel}</Text>
            </Pressable>
          )}

          {/* Notifications */}
          {!isMobile && (
            <Pressable
              style={[styles.iconBtn, notifHovered && styles.iconHovered, webStyles.clickable]}
              onPress={() => router.push('/customer/notifications')}
              // @ts-ignore
              onMouseEnter={() => setNotifHovered(true)}
              onMouseLeave={() => setNotifHovered(false)}
            >
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </Pressable>
          )}

          {/* Cart */}
          <Pressable
            style={[styles.iconBtn, cartHovered && styles.iconHovered, webStyles.clickable]}
            onPress={() => router.push('/customer/cart')}
            // @ts-ignore
            onMouseEnter={() => setCartHovered(true)}
            onMouseLeave={() => setCartHovered(false)}
          >
            <View style={styles.cartWrapper}>
              <Ionicons name="cart-outline" size={22} color="#fff" />
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              )}
            </View>
          </Pressable>

          {/* Profile avatar */}
          <Pressable
            style={[styles.avatar, profileHovered && styles.avatarHovered, webStyles.clickable]}
            onPress={() => router.push('/customer/profile')}
            // @ts-ignore
            onMouseEnter={() => setProfileHovered(true)}
            onMouseLeave={() => setProfileHovered(false)}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    position: Platform.OS === 'web' ? ('sticky' as any) : 'relative',
    top: 0,
    zIndex: 100,
    backgroundColor: colors.primary,
    height: 64,
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(15,118,110,0.25)' } as any,
      default: { elevation: 6 },
    }),
  },
  inner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  logoBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  logoIconImg: {
    height: 40,
    width: 40,
    borderRadius: borderRadius.md,
  },

  // Search bar (on teal background)
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    height: 40,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    maxWidth: 520,
  },
  searchBarFocused: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.55)',
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: '#fff',
    padding: 0,
    margin: 0,
    // @ts-ignore
    outlineStyle: 'none',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
    marginLeft: 'auto' as any,
  },
  langPill: {
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  langPillHovered: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#fff',
  },
  langText: {
    ...typography.label,
    color: '#fff',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHovered: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cartWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  avatarHovered: {
    backgroundColor: colors.accentDark,
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
