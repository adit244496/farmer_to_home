import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 45;

export const OTPVerifyScreen: React.FC = () => {
  const params = useLocalSearchParams<{ phone?: string; role?: string; email?: string; loginMethod?: string }>();
  const phone = params.phone ?? '';
  const email = params.email ?? '';
  const role = params.role ?? 'customer';
  const loginMethod = params.loginMethod ?? 'phone';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setUser = useAuthStore((state) => state.setUser);

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COUNTDOWN);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCountdown();
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCountdown]);

  const handleVerify = async (otpString: string) => {
    if (otpString.length < OTP_LENGTH) {
      setError('Please enter the complete OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = loginMethod === 'email'
        ? await authService.verifyEmailOTP(email, otpString)
        : await authService.verifyOTP(phone, otpString);
      setUser(response.user);

      if (response.is_new_user) {
        router.replace({
          pathname: '/auth/complete-profile',
          params: loginMethod === 'email' ? { email } : { phone },
        });
      } else {
        router.replace('/customer/home');
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(
        apiErr?.response?.data?.message ||
          apiErr?.response?.data?.detail ||
          'Invalid OTP. Please try again.'
      );
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (error) setError('');

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === OTP_LENGTH - 1) {
      const otpString = newOtp.join('');
      if (otpString.length === OTP_LENGTH) {
        handleVerify(otpString);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      const newOtp = [...otp];
      if (newOtp[index]) {
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendLoading(true);
    try {
      if (loginMethod === 'email') {
        await authService.requestEmailOTP(email);
      } else {
        await authService.requestOTP(phone);
      }
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
      startCountdown();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(apiErr?.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const otpString = otp.join('');
  const maskedPhone = phone.length === 10
    ? `+91 ${phone.slice(0, 2)}XXXXXX${phone.slice(-2)}`
    : `+91 ${phone}`;
  const maskedEmail = email.includes('@')
    ? (() => {
        const [user, domain] = email.split('@');
        return `${user.slice(0, 2)}${'*'.repeat(Math.max(user.length - 2, 2))}@${domain}`;
      })()
    : email;
  const displayIdentifier = loginMethod === 'email' ? maskedEmail : maskedPhone;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OTP Verification</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {/* Lock icon in teal circle */}
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={32} color={colors.primary} />
          </View>

          <Text style={styles.title}>OTP Verification</Text>

          {/* Sent to info */}
          <View style={styles.sentToRow}>
            <Text style={styles.sentToText}>Sent to </Text>
            <Text style={styles.sentToPhone}>{displayIdentifier}</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={15} color={colors.primary} style={styles.editIcon} />
            </TouchableOpacity>
          </View>

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : null,
                  error ? styles.otpBoxError : null,
                  { outlineWidth: 0, outlineStyle: 'none' } as any,
                ]}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Verify button */}
          <TouchableOpacity
            style={[
              styles.verifyBtn,
              (otpString.length < OTP_LENGTH || loading) && styles.verifyBtnDisabled,
            ]}
            onPress={() => handleVerify(otpString)}
            disabled={otpString.length < OTP_LENGTH || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.verifyBtnText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendSection}>
            {canResend ? (
              <TouchableOpacity
                style={[styles.resendBtn, resendLoading && styles.resendBtnDisabled]}
                onPress={handleResend}
                disabled={resendLoading}
                activeOpacity={0.8}
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={15} color={colors.primary} />
                    <Text style={styles.resendBtnText}>Resend OTP</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.resendCountdownRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={styles.resendCountdown}>
                  OTP expires in{' '}
                  <Text style={styles.resendCountdownNum}>{countdown}s</Text>
                </Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primaryLight + '40',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sentToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  sentToText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sentToPhone: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  editIcon: {
    marginLeft: 4,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  otpBox: {
    width: 48,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryPastel,
  },
  otpBoxError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  verifyBtn: {
    height: 52,
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  resendSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryPastel,
  },
  resendBtnDisabled: {
    opacity: 0.5,
  },
  resendBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  resendCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resendCountdown: {
    ...typography.body,
    color: colors.textMuted,
  },
  resendCountdownNum: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
});

export default OTPVerifyScreen;
