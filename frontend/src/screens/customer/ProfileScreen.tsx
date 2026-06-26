import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../hooks/useLanguage';

// ─── MenuItem ─────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  rightText?: string;
  isDanger?: boolean;
  onPress: () => void;
  isLast?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, rightText, isDanger = false, onPress, isLast = false }) => (
  <TouchableOpacity
    style={[styles.menuItem, !isLast && styles.menuItemBorder]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIconCircle, isDanger && styles.menuIconCircleDanger]}>
      <Ionicons name={icon} size={18} color={isDanger ? colors.error : colors.primary} />
    </View>
    <Text style={[styles.menuLabel, isDanger && styles.menuLabelDanger]}>{label}</Text>
    <View style={styles.menuRight}>
      {rightText ? <Text style={styles.menuRightText}>{rightText}</Text> : null}
      {!isDanger && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </View>
  </TouchableOpacity>
);

interface MenuGroupProps { title: string; children: React.ReactNode }
const MenuGroup: React.FC<MenuGroupProps> = ({ title, children }) => (
  <View style={styles.menuGroup}>
    <Text style={styles.menuGroupTitle}>{title}</Text>
    <View style={styles.menuGroupCard}>{children}</View>
  </View>
);

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuthStore();
  const { toggleLanguage, language } = useLanguage();

  const isDesktop = Platform.OS === 'web' && width >= 768;
  const languageLabel = language === 'mr' ? 'मराठी' : 'English';

  // ── Derived user fields ──────────────────────────────────────────────────────
  const hasName     = !!user?.full_name?.trim();
  const displayName = user?.full_name?.trim() || '';
  const phone       = user?.phone || (user as any)?.phone_number || '';
  const email       = (user as any)?.email || '';
  const contactInfo = phone || email;

  const getInitials = (): string => {
    if (hasName) {
      return displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (phone) return phone.replace(/\D/g, '').slice(-2);
    if (email) return email[0].toUpperCase();
    return 'U';
  };

  // ── Actions ──────────────────────────────────────────────────────────────────
  const doLogout = async () => {
    await logout();
    router.replace('/auth/role-select');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) doLogout();
      return;
    }
    Alert.alert(
      t('profile.logoutTitle', 'Logout'),
      t('profile.logoutMessage', 'Are you sure you want to logout?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('profile.logout', 'Logout'), style: 'destructive', onPress: doLogout },
      ]
    );
  };

  const handleAbout = () => Alert.alert(
    'Farmer to Home',
    'Version 1.0.0\n\nConnecting farmers directly to consumers.\nFresh produce, fair prices.',
    [{ text: 'OK' }]
  );

  const handleHelpSupport = () => Alert.alert(
    t('common.comingSoon', 'Coming Soon'),
    t('profile.helpComingSoon', 'Help & Support will be available soon.'),
    [{ text: 'OK' }]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={isDesktop ? styles.webWrapper : undefined}>

          {/* ── Hero ── */}
          <View style={styles.heroSection}>
            {/* Teal band */}
            <View style={styles.heroBand} />

            {/* Avatar overlapping the band */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarBorder}>
                {user?.profile_photo ? (
                  <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{getInitials()}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Name + contact below avatar */}
            <View style={styles.heroInfo}>
              {hasName ? (
                <Text style={styles.heroName}>{displayName}</Text>
              ) : (
                <Text style={styles.heroNamePlaceholder}>Complete your profile</Text>
              )}
              {contactInfo ? (
                <View style={styles.contactChip}>
                  <Ionicons
                    name={phone ? 'phone-portrait-outline' : 'mail-outline'}
                    size={13}
                    color={colors.primary}
                  />
                  <Text style={styles.contactChipText}>{contactInfo}</Text>
                </View>
              ) : null}
            </View>

            {/* Complete profile nudge */}
            {!hasName && (
              <TouchableOpacity
                style={styles.completeProfileBanner}
                onPress={() => router.push('/customer/edit-profile')}
                activeOpacity={0.85}
              >
                <View style={styles.completeProfileLeft}>
                  <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                  <View>
                    <Text style={styles.completeProfileTitle}>Add your name</Text>
                    <Text style={styles.completeProfileSub}>Personalise your account</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Menu groups ── */}
          <View style={styles.menuContainer}>
            <MenuGroup title={t('profile.account', 'Account')}>
              <MenuItem
                icon="person-outline"
                label={t('profile.editProfile', 'Edit Profile')}
                onPress={() => router.push('/customer/edit-profile')}
              />
              <MenuItem
                icon="location-outline"
                label={t('profile.manageAddresses', 'Manage Addresses')}
                onPress={() => router.push('/customer/addresses')}
                isLast
              />
            </MenuGroup>

            <MenuGroup title={t('profile.preferences', 'Preferences')}>
              <MenuItem
                icon="notifications-outline"
                label={t('profile.notificationSettings', 'Notification Settings')}
                onPress={() => router.push('/customer/notifications')}
              />
              <MenuItem
                icon="globe-outline"
                label={t('profile.language', 'Language')}
                rightText={languageLabel}
                onPress={toggleLanguage}
                isLast
              />
            </MenuGroup>

            <MenuGroup title={t('profile.support', 'Support')}>
              <MenuItem
                icon="help-circle-outline"
                label={t('profile.helpSupport', 'Help & Support')}
                onPress={handleHelpSupport}
              />
              <MenuItem
                icon="information-circle-outline"
                label={t('profile.about', 'About')}
                onPress={handleAbout}
                isLast
              />
            </MenuGroup>

            <MenuGroup title={t('profile.dangerZone', 'Danger Zone')}>
              <MenuItem
                icon="log-out-outline"
                label={t('profile.logout', 'Logout')}
                isDanger
                onPress={handleLogout}
                isLast
              />
            </MenuGroup>
          </View>

          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BAND_HEIGHT    = 110;
const AVATAR_BORDER  = 96;
const AVATAR_SIZE    = 84;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },

  // Web centering
  webWrapper: {
    maxWidth: 600,
    width: '100%' as any,
    alignSelf: 'center' as any,
  },

  // ── Hero ──
  heroSection: {
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as any, default: {} }),
  },
  heroBand: {
    height: BAND_HEIGHT,
    backgroundColor: colors.primary,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginTop: -(AVATAR_BORDER / 2),
    marginBottom: spacing.md,
  },
  avatarBorder: {
    width: AVATAR_BORDER,
    height: AVATAR_BORDER,
    borderRadius: AVATAR_BORDER / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    ...(shadows.lg as object),
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroInfo: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  heroNamePlaceholder: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textMuted,
    textAlign: 'center',
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginTop: 2,
  },
  contactChipText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },

  // Complete profile banner
  completeProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  completeProfileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  completeProfileTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  completeProfileSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // ── Menu ──
  menuContainer: { paddingHorizontal: spacing.lg },
  menuGroup: { marginBottom: spacing.lg },
  menuGroupTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuGroupCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...(shadows.card as object),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIconCircleDanger: { backgroundColor: colors.errorLight },
  menuLabel: { ...typography.body, color: colors.textPrimary, flex: 1, fontWeight: '500' as const },
  menuLabelDanger: { color: colors.error, fontWeight: '600' as const },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  menuRightText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '600' as const,
    marginRight: spacing.xs,
  },

  // ── Version ──
  versionText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    marginTop: spacing.md,
  },
});
