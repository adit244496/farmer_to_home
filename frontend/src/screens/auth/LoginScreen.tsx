import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../theme';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { authService } from '../../services/auth.service';
import { useLanguage } from '../../hooks/useLanguage';

export const LoginScreen: React.FC = () => {
  const { language } = useLanguage();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role ?? 'customer';

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isFarmer = role === 'farmer';
  const title = isFarmer
    ? language === 'mr'
      ? 'शेतकरी लॉगिन'
      : 'Farmer Login'
    : language === 'mr'
      ? 'ग्राहक लॉगिन'
      : 'Customer Login';

  const validatePhone = (): boolean => {
    if (!phone.trim()) {
      setError(
        language === 'mr'
          ? 'मोबाइल नंबर आवश्यक आहे'
          : 'Phone number is required'
      );
      return false;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setError(
        language === 'mr'
          ? 'वैध 10-अंकी नंबर टाका'
          : 'Enter a valid 10-digit number'
      );
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    setError('');
    if (!validatePhone()) return;

    setLoading(true);
    try {
      await authService.requestOTP(phone.trim());
      router.push({
        pathname: '/auth/otp-verify',
        params: { phone: phone.trim(), role },
      });
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { message?: string; detail?: string } };
      };
      setError(
        apiErr?.response?.data?.message ||
          apiErr?.response?.data?.detail ||
          (language === 'mr' ? 'काहीतरी चुकले' : 'Something went wrong')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      {/* Teal header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.surface} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Ionicons
            name={isFarmer ? 'leaf' : 'person'}
            size={20}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>

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
          {/* White card */}
          <View style={styles.formCard}>
            <Text style={styles.welcomeTitle}>
              {language === 'mr' ? 'परत स्वागत!' : 'Welcome Back'}
            </Text>
            <Text style={styles.welcomeBody}>
              {language === 'mr'
                ? 'सुरू ठेवण्यासाठी आपला मोबाइल नंबर टाका'
                : 'Enter your mobile number to continue'}
            </Text>

            {/* Phone input */}
            <View style={styles.phoneRow}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>+91</Text>
              </View>

              <View style={styles.phoneInputWrapper}>
                <Input
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text.replace(/\D/g, '').slice(0, 10));
                    if (error) setError('');
                  }}
                  placeholder="XXXXXXXXXX"
                  keyboardType="number-pad"
                  maxLength={10}
                  error={error}
                  style={styles.phoneInput}
                  leftIcon="call-outline"
                />
              </View>
            </View>

            {/* Send OTP button */}
            <TouchableOpacity
              style={[styles.sendOTPBtn, loading && styles.sendOTPBtnDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={styles.sendOTPText}>
                  {language === 'mr' ? 'पाठवत आहे...' : 'Sending...'}
                </Text>
              ) : (
                <>
                  <Text style={styles.sendOTPText}>
                    {language === 'mr' ? 'OTP पाठवा' : 'Send OTP'}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={colors.surface}
                    style={styles.sendOTPIcon}
                  />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register link */}
            <TouchableOpacity
              style={styles.registerRow}
              onPress={() =>
                isFarmer
                  ? router.push('/auth/farmer-register')
                  : router.push('/auth/customer-register')
              }
            >
              <Text style={styles.registerLabel}>
                {language === 'mr' ? 'नवीन आहात?' : 'New here?'}
              </Text>
              <Text style={styles.registerLink}>
                {language === 'mr' ? ' नोंदणी करा →' : ' Register →'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom note */}
          <View style={styles.bottomNote}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={styles.bottomNoteText}>
              {language === 'mr'
                ? 'OTP SMS द्वारे पाठवले जाईल'
                : 'OTP will be sent via SMS'}
            </Text>
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
    height: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.surface,
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  welcomeTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  welcomeBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
  },
  prefixText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  phoneInputWrapper: {
    flex: 1,
  },
  phoneInput: {
    marginBottom: 0,
  },
  sendOTPBtn: {
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    ...shadows.sm,
  },
  sendOTPBtnDisabled: {
    opacity: 0.6,
  },
  sendOTPText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sendOTPIcon: {
    marginLeft: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  bottomNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: spacing.xl,
  },
  bottomNoteText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default LoginScreen;