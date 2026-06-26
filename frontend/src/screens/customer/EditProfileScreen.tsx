import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../hooks/useLanguage';
import apiClient from '../../utils/api';

// ─── FormInput ────────────────────────────────────────────────────────────────

interface FormInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  editable?: boolean;
  error?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  editable = true,
  error,
}) => (
  <View style={formInputStyles.wrapper}>
    <Text style={formInputStyles.label}>{label}</Text>
    <View
      style={[
        formInputStyles.inputRow,
        !editable && formInputStyles.inputRowDisabled,
        !!error && formInputStyles.inputRowError,
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={editable ? colors.textSecondary : colors.textMuted}
        style={formInputStyles.icon}
      />
      <TextInput
        style={[formInputStyles.input, !editable && formInputStyles.inputDisabled, { outlineWidth: 0, outlineStyle: 'none' } as any]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
      />
      {!editable && (
        <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
      )}
    </View>
    {error ? <Text style={formInputStyles.errorText}>{error}</Text> : null}
  </View>
);

const formInputStyles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputRowDisabled: {
    backgroundColor: colors.divider,
    borderColor: colors.divider,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    padding: 0,
  },
  inputDisabled: {
    color: colors.textMuted,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});

// ─── EditProfileScreen ────────────────────────────────────────────────────────

interface FormErrors {
  name?: string;
  email?: string;
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, setUser, setLanguage, language } = useAuthStore();
  const { toggleLanguage } = useLanguage();

  const [name, setName] = useState<string>(user?.full_name ?? '');
  const [email, setEmail] = useState<string>(user?.email ?? '');
  const [selectedLang, setSelectedLang] = useState<'mr' | 'en'>(
    (language as 'mr' | 'en') ?? 'en'
  );
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Avatar helpers ──────────────────────────────────────────────────────────

  const getInitials = (): string => {
    const source = name || user?.full_name || '';
    if (!source) return '?';
    return source
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('common.permissionDenied', 'Permission Denied'),
        t('editProfile.photoPermission', 'Please allow access to your photo library.')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedPhoto(result.assets[0].uri);
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = t('editProfile.nameRequired', 'Full name is required.');
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = t('editProfile.emailInvalid', 'Please enter a valid email address.');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      let updatedUser: any;

      if (selectedPhoto) {
        // Upload profile photo + fields as multipart/form-data
        const formData = new FormData();
        formData.append('full_name', name.trim());
        if (email.trim()) formData.append('email', email.trim());
        formData.append('language_preference', selectedLang);

        const filename = selectedPhoto.split('/').pop() ?? 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('profile_photo', {
          uri: selectedPhoto,
          name: filename,
          type: mimeType,
        } as any);

        const response = await apiClient.patch('/users/me/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updatedUser = response.data;
      } else {
        // Plain JSON patch
        const payload: Record<string, string> = {
          full_name: name.trim(),
          language_preference: selectedLang,
        };
        if (email.trim()) payload.email = email.trim();

        const response = await apiClient.patch('/users/me/', payload);
        updatedUser = response.data;
      }

      // Update stores
      setUser(updatedUser);
      if (selectedLang !== language) {
        setLanguage(selectedLang);
      }

      Alert.alert(
        t('editProfile.successTitle', 'Profile Updated'),
        t('editProfile.successMessage', 'Your profile has been updated successfully.'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        t('editProfile.updateFailed', 'Failed to update profile. Please try again.');
      Alert.alert(t('common.error', 'Error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived avatar source ───────────────────────────────────────────────────

  const avatarUri = selectedPhoto ?? user?.profile_photo ?? null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editProfile.title', 'Edit Profile')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials()}</Text>
              </View>
            )}
            {/* Camera button */}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handlePickPhoto}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={16} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Form fields ── */}
        <View style={styles.card}>
          <FormInput
            icon="person-outline"
            label={t('editProfile.fullName', 'Full Name')}
            value={name}
            onChangeText={setName}
            placeholder={t('editProfile.fullNamePlaceholder', 'Enter your full name')}
            autoCapitalize="words"
            error={errors.name}
          />
          <FormInput
            icon="mail-outline"
            label={t('editProfile.email', 'Email (optional)')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('editProfile.emailPlaceholder', 'Enter your email')}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <FormInput
            icon="call-outline"
            label={t('editProfile.phone', 'Phone Number')}
            value={user?.phone_number ?? user?.phone ?? ''}
            editable={false}
          />
        </View>

        {/* ── Language selection ── */}
        <View style={styles.card}>
          <Text style={styles.langCardTitle}>
            {t('editProfile.languageLabel', 'Language / भाषा')}
          </Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[
                styles.langChip,
                selectedLang === 'mr' && styles.langChipSelected,
              ]}
              onPress={() => setSelectedLang('mr')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.langChipText,
                  selectedLang === 'mr' && styles.langChipTextSelected,
                ]}
              >
                मराठी
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langChip,
                selectedLang === 'en' && styles.langChipSelected,
              ]}
              onPress={() => setSelectedLang('en')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.langChipText,
                  selectedLang === 'en' && styles.langChipTextSelected,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {t('editProfile.saveChanges', 'Save Changes')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 80;
const CAMERA_BTN_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },

  // ── Avatar ──
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarInitials: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: CAMERA_BTN_SIZE,
    height: CAMERA_BTN_SIZE,
    borderRadius: CAMERA_BTN_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    ...(shadows.sm as object),
  },

  // ── Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...(shadows.card as object),
  },

  // ── Language ──
  langCardTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  langRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  langChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langChipText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  langChipTextSelected: {
    color: colors.textInverse,
  },

  // ── Save button ──
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...(shadows.md as object),
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.textInverse,
    fontWeight: '700',
  },
});
