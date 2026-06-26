import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import apiClient from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

const APP_ICON = require('../../../assets/icon.png');

export const CompleteProfileScreen: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const { setUser, user } = useAuthStore((state) => ({
    setUser: state.setUser,
    user: state.user,
  }));

  // Determine login method from existing user data
  const loggedInViaEmail = !!(user?.email);
  const loggedInViaPhone = !!(user?.phone);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(t('auth:nameRequired'));
      return;
    }
    setNameError('');
    setSubmitError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { name: name.trim() };
      // Only send email if user doesn't already have one and provided one
      if (!loggedInViaEmail && email.trim()) {
        body.email = email.trim();
      }
      const response = await apiClient.patch('/users/me/', body);
      setUser(response.data);
      router.replace('/customer/home');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setSubmitError(apiErr?.response?.data?.detail || t('common:unknownError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/customer/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Complete Profile</Text>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Orange accent bar */}
      <View style={styles.accentBar} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand + welcome */}
          <View style={styles.welcomeSection}>
            <View style={styles.iconContainer}>
              <Image source={APP_ICON} style={styles.appIcon} resizeMode="contain" />
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            </View>

            <Text style={styles.welcomeTitle}>Welcome!</Text>
            <Text style={styles.welcomeSubtitle}>
              Your account is ready.{'\n'}
              {loggedInViaEmail
                ? `Signed in as ${user?.email}`
                : loggedInViaPhone
                ? `Signed in with +91 ${user?.phone}`
                : 'Add your details so farmers know who you are.'}
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>

            <Input
              label="Your Name"
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (nameError) setNameError('');
              }}
              placeholder="Enter your full name"
              leftIcon="person-outline"
              error={nameError}
              required
              autoCapitalize="words"
              autoFocus
            />

            {/* Show email field only if user logged in via phone (we don't have email yet) */}
            {!loggedInViaEmail && (
              <Input
                label="Email (optional)"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}

            {/* If logged in via email, show a read-only email chip */}
            {loggedInViaEmail && (
              <View style={styles.verifiedRow}>
                <View style={styles.verifiedChip}>
                  <Ionicons name="mail" size={14} color={colors.primary} />
                  <Text style={styles.verifiedChipText}>{user?.email}</Text>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                </View>
              </View>
            )}

            {/* If logged in via phone, show a read-only phone chip */}
            {loggedInViaPhone && (
              <View style={styles.verifiedRow}>
                <View style={styles.verifiedChip}>
                  <Ionicons name="call" size={14} color={colors.primary} />
                  <Text style={styles.verifiedChipText}>+91 {user?.phone}</Text>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                </View>
              </View>
            )}

            {submitError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            ) : null}

            <Button
              title="Save & Continue"
              onPress={handleSave}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.saveBtn}
            />

            <TouchableOpacity onPress={handleSkip} style={styles.skipRow}>
              <Text style={styles.skipRowText}>I'll do this later</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { width: 60 },
  headerTitle: {
    ...typography.h3,
    color: colors.surface,
    flex: 1,
    textAlign: 'center',
  },
  skipBtn: { width: 60, alignItems: 'flex-end' },
  skipText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '500' },

  // Orange accent bar below header
  accentBar: {
    height: 4,
    backgroundColor: colors.accent,
  },

  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  // Welcome / branding
  welcomeSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  appIcon: {
    width: 88,
    height: 88,
    borderRadius: 20,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  welcomeTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },

  // Form card
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderTopWidth: 3,
    borderTopColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    ...shadows.card,
  },

  // Verified identity chips
  verifiedRow: {
    marginBottom: spacing.md,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '0D',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  verifiedChipText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },

  saveBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  skipRow: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  skipRowText: {
    ...typography.body,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});

export default CompleteProfileScreen;
