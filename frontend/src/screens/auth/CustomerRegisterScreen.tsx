import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { authService } from '../../services/auth.service';
import { useLanguage } from '../../hooks/useLanguage';

interface FormData {
  full_name: string;
  phone: string;
  email: string;
  house_no: string;
  area: string;
  city: string;
  pin_code: string;
  state: string;
}

interface FormErrors {
  full_name?: string;
  phone?: string;
  email?: string;
  house_no?: string;
  area?: string;
  city?: string;
  pin_code?: string;
  state?: string;
}

export const CustomerRegisterScreen: React.FC = () => {
  const { language } = useLanguage();
  const params = useLocalSearchParams<{ phone?: string }>();

  const [form, setForm] = useState<FormData>({
    full_name: '',
    phone: params.phone ?? '',
    email: '',
    house_no: '',
    area: '',
    city: '',
    pin_code: '',
    state: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const setField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(form.phone.trim())) newErrors.phone = 'Enter a valid 10-digit number';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      newErrors.email = 'Invalid email address';
    if (!form.house_no.trim()) newErrors.house_no = 'House/Flat No. is required';
    if (!form.area.trim()) newErrors.area = 'Area is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.pin_code.trim()) newErrors.pin_code = 'PIN code is required';
    else if (!/^\d{6}$/.test(form.pin_code.trim())) newErrors.pin_code = 'Enter a valid 6-digit PIN';
    if (!form.state.trim()) newErrors.state = 'State is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError('');
    setLoading(true);
    try {
      await authService.registerCustomer({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
      });
      router.push({
        pathname: '/auth/otp-verify',
        params: { phone: form.phone.trim(), role: 'customer' },
      });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; detail?: string } } };
      setSubmitError(
        apiErr?.response?.data?.message ||
          apiErr?.response?.data?.detail ||
          'Something went wrong'
      );
    } finally {
      setLoading(false);
    }
  };

  const SectionLabel = ({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) => (
    <View style={styles.sectionLabelRow}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={styles.sectionLabel}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      {/* Teal header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'mr' ? 'खाते तयार करा' : 'Create Account'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            {/* Personal Info section */}
            <SectionLabel icon="person-outline" title="PERSONAL INFO" />

            <Input
              label="Full Name"
              value={form.full_name}
              onChangeText={(v) => setField('full_name', v)}
              placeholder="Your full name"
              error={errors.full_name}
              leftIcon="person-outline"
              required
              autoCapitalize="words"
            />

            <View style={styles.phoneRow}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <View style={styles.flex1}>
                <Input
                  label="Phone Number"
                  value={form.phone}
                  onChangeText={(v) => setField('phone', v.replace(/\D/g, '').slice(0, 10))}
                  placeholder="XXXXXXXXXX"
                  keyboardType="number-pad"
                  maxLength={10}
                  error={errors.phone}
                  leftIcon="call-outline"
                  required
                  editable={!params.phone}
                />
              </View>
            </View>

            <Input
              label="Email (Optional)"
              value={form.email}
              onChangeText={(v) => setField('email', v)}
              placeholder="your@email.com"
              error={errors.email}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Divider */}
            <View style={styles.sectionDivider} />

            {/* Address section */}
            <SectionLabel icon="location-outline" title="ADDRESS DETAILS" />

            <Input
              label="House / Flat No."
              value={form.house_no}
              onChangeText={(v) => setField('house_no', v)}
              placeholder="e.g. Flat 204, Building B"
              error={errors.house_no}
              leftIcon="home-outline"
              required
            />

            <Input
              label="Area / Street"
              value={form.area}
              onChangeText={(v) => setField('area', v)}
              placeholder="Area or street name"
              error={errors.area}
              leftIcon="map-outline"
              required
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="City"
                  value={form.city}
                  onChangeText={(v) => setField('city', v)}
                  placeholder="City"
                  error={errors.city}
                  required
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="PIN Code"
                  value={form.pin_code}
                  onChangeText={(v) => setField('pin_code', v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="XXXXXX"
                  keyboardType="number-pad"
                  maxLength={6}
                  error={errors.pin_code}
                  required
                />
              </View>
            </View>

            <Input
              label="State"
              value={form.state}
              onChangeText={(v) => setField('state', v)}
              placeholder="e.g. Maharashtra"
              error={errors.state}
              leftIcon="flag-outline"
              required
              autoCapitalize="words"
            />

            {submitError ? (
              <View style={styles.submitErrorRow}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.submitError}>{submitError}</Text>
              </View>
            ) : null}

            {/* Register button */}
            <TouchableOpacity
              style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={styles.registerBtnText}>Creating Account...</Text>
              ) : (
                <Text style={styles.registerBtnText}>
                  {language === 'mr' ? 'नोंदणी करा' : 'Register'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginLabel}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/auth/login?role=customer')}>
                <Text style={styles.loginLink}> Login</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.surface,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.primary,
    letterSpacing: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  prefixBox: {
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  prefixText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  flex1: {
    flex: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  submitErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  submitError: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  registerBtn: {
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default CustomerRegisterScreen;
