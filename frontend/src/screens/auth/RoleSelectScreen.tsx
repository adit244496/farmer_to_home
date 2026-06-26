import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { useLanguage } from '../../hooks/useLanguage';
import { authService } from '../../services/auth.service';

const LOGO = require('../../../assets/logo_eng_white.png');

type LoginMethod = 'mobile' | 'email';

export const RoleSelectScreen: React.FC = () => {
  const { toggleLanguage, language } = useLanguage();
  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('mobile');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const switchMethod = (method: LoginMethod) => {
    setLoginMethod(method);
    setError('');
    setPhone('');
    setEmail('');
  };

  const handleSendOTP = async () => {
    setError('');

    if (loginMethod === 'mobile') {
      const cleaned = phone.replace(/\D/g, '').slice(0, 10);
      if (!cleaned || !/^\d{10}$/.test(cleaned)) {
        setError(language === 'mr' ? 'वैध 10-अंकी नंबर टाका' : 'Enter a valid 10-digit number');
        return;
      }
      setLoading(true);
      try {
        await authService.requestOTP(cleaned);
        router.push({ pathname: '/auth/otp-verify', params: { phone: cleaned, role: 'customer', loginMethod: 'phone' } });
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string; detail?: string } } };
        setError(
          apiErr?.response?.data?.message ||
            apiErr?.response?.data?.detail ||
            (language === 'mr' ? 'काहीतरी चुकले' : 'Something went wrong')
        );
      } finally {
        setLoading(false);
      }
    } else {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError(language === 'mr' ? 'वैध ईमेल पत्ता टाका' : 'Enter a valid email address');
        return;
      }
      setLoading(true);
      try {
        await authService.requestEmailOTP(trimmed);
        router.push({ pathname: '/auth/otp-verify', params: { email: trimmed, role: 'customer', loginMethod: 'email' } });
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string; detail?: string } } };
        setError(
          apiErr?.response?.data?.message ||
            apiErr?.response?.data?.detail ||
            (language === 'mr' ? 'काहीतरी चुकले' : 'Something went wrong')
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const tagline = language === 'mr' ? 'तुमचा खात्रीशीर शेतकरी' : 'Your Trusted Family Farmer';

  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const inputReady = loginMethod === 'mobile' ? phoneValid : emailValid;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F0F4F3" barStyle="dark-content" />

      {/* Decorative background blobs */}
      <View style={[styles.blobTopRight, { pointerEvents: 'none' }]} />
      <View style={[styles.blobBottomLeft, { pointerEvents: 'none' }]} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.langPill} onPress={toggleLanguage}>
          <Text style={[styles.langOpt, language === 'mr' && styles.langOptActive]}>मर</Text>
          <View style={styles.langDivider} />
          <Text style={[styles.langOpt, language === 'en' && styles.langOptActive]}>EN</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, isWide && styles.cardWide]}>

            {/* Card top accent bar */}
            <View style={styles.cardAccent} />

            {/* Logo + tagline */}
            <View style={styles.logoSection}>
              <View style={styles.logoWrap}>
                <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
              </View>
              <Text style={styles.tagline}>{tagline}</Text>
            </View>

            <View style={styles.sep} />

            {/* Welcome heading */}
            <Text style={styles.welcomeHeading}>
              {language === 'mr' ? 'स्वागत आहे!' : 'Welcome Back!'}
            </Text>
            <Text style={styles.welcomeSub}>
              {language === 'mr'
                ? 'लॉगिन किंवा नोंदणीसाठी माहिती प्रविष्ट करा'
                : 'Enter your details to continue'}
            </Text>

            {/* Mobile / Email toggle */}
            <View style={styles.methodToggle}>
              <TouchableOpacity
                style={[styles.methodTab, loginMethod === 'mobile' && styles.methodTabActive]}
                onPress={() => switchMethod('mobile')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={14}
                  color={loginMethod === 'mobile' ? colors.surface : colors.textMuted}
                />
                <Text style={[styles.methodTabText, loginMethod === 'mobile' && styles.methodTabTextActive]}>
                  {language === 'mr' ? 'मोबाइल' : 'Mobile'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodTab, loginMethod === 'email' && styles.methodTabActive]}
                onPress={() => switchMethod('email')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="mail-outline"
                  size={14}
                  color={loginMethod === 'email' ? colors.surface : colors.textMuted}
                />
                <Text style={[styles.methodTabText, loginMethod === 'email' && styles.methodTabTextActive]}>
                  {language === 'mr' ? 'ईमेल' : 'Email'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input field */}
            <Text style={styles.fieldLabel}>
              {loginMethod === 'mobile'
                ? (language === 'mr' ? 'मोबाइल नंबर' : 'Mobile Number')
                : (language === 'mr' ? 'ईमेल पत्ता' : 'Email Address')}
            </Text>

            {loginMethod === 'mobile' ? (
              <View
                style={[
                  styles.phoneRow,
                  isFocused && styles.inputFocused,
                  !!error && styles.inputError,
                ]}
              >
                <View style={styles.prefixBadge}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  value={phone.length > 5 ? phone.slice(0, 5) + ' ' + phone.slice(5) : phone}
                  onChangeText={(t) => {
                    setPhone(t.replace(/\D/g, '').slice(0, 10));
                    if (error) setError('');
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={language === 'mr' ? '10 अंकी नंबर' : '10-digit number'}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={11}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOTP}
                  autoFocus={false}
                  autoComplete="off"
                  autoCorrect={false}
                  autoCapitalize="none"
                  importantForAutofill="no"
                  style={[styles.phoneInput, { outlineWidth: 0, outlineStyle: 'none' } as any]}
                />
                {phoneValid && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.checkIcon} />
                )}
              </View>
            ) : (
              <View
                style={[
                  styles.emailRow,
                  isFocused && styles.inputFocused,
                  !!error && styles.inputError,
                ]}
              >
                <View style={styles.emailIconBox}>
                  <Ionicons name="mail-outline" size={18} color={colors.primary} />
                </View>
                <TextInput
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError('');
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={language === 'mr' ? 'तुमचा ईमेल पत्ता' : 'your@email.com'}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleSendOTP}
                  autoFocus={false}
                  autoComplete="off"
                  autoCorrect={false}
                  autoCapitalize="none"
                  importantForAutofill="no"
                  style={[styles.emailInput, { outlineWidth: 0, outlineStyle: 'none' } as any]}
                />
                {emailValid && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.checkIcon} />
                )}
              </View>
            )}

            {loginMethod === 'mobile' && (
              <Text style={styles.inputHint}>
                {language === 'mr'
                  ? 'OTP तुमच्या मोबाइलवर पाठवला जाईल'
                  : 'An OTP will be sent to your mobile'}
              </Text>
            )}

            {loginMethod === 'email' && (
              <Text style={styles.inputHint}>
                {language === 'mr'
                  ? 'OTP तुमच्या ईमेलवर पाठवला जाईल'
                  : 'An OTP will be sent to your email'}
              </Text>
            )}

            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Send OTP button */}
            <TouchableOpacity
              style={[styles.otpBtn, (loading || !inputReady) && styles.otpBtnDisabled]}
              onPress={handleSendOTP}
              disabled={loading || !inputReady}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.otpBtnText}>
                    {language === 'mr' ? 'OTP पाठवा' : 'Send OTP'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.otpBtnIcon} />
                </>
              )}
            </TouchableOpacity>

            {/* Trust signals */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Ionicons name="shield-checkmark-outline" size={13} color={colors.primary} />
                <Text style={styles.trustText}>{language === 'mr' ? 'सुरक्षित' : 'Secure'}</Text>
              </View>
              <View style={styles.trustDot} />
              <View style={styles.trustItem}>
                <Ionicons name="people-outline" size={13} color={colors.primary} />
                <Text style={styles.trustText}>{language === 'mr' ? 'विश्वासू शेतकरी' : 'Trusted Farmers'}</Text>
              </View>
              <View style={styles.trustDot} />
              <View style={styles.trustItem}>
                <Ionicons name="leaf-outline" size={13} color={colors.primary} />
                <Text style={styles.trustText}>{language === 'mr' ? 'ताजे उत्पादन' : 'Fresh Produce'}</Text>
              </View>
            </View>

            {/* Or divider */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>{language === 'mr' ? 'किंवा' : 'or'}</Text>
              <View style={styles.orLine} />
            </View>

            {/* Register link */}
            <TouchableOpacity
              style={styles.registerRow}
              onPress={() => router.push('/auth/customer-register')}
              activeOpacity={0.7}
            >
              <Text style={styles.registerLabel}>
                {language === 'mr' ? 'नवीन आहात?' : 'New here?'}
              </Text>
              <Text style={styles.registerLink}>
                {language === 'mr' ? '  नोंदणी करा →' : '  Register →'}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#F0F4F3',
  },

  /* Decorative blobs */
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.primary,
    opacity: 0.06,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.accent,
    opacity: 0.07,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  farmerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.full,
  },
  farmerBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },

  /* Language pill */
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 3,
    paddingVertical: 3,
    ...shadows.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langOpt: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    borderRadius: borderRadius.full,
  },
  langOptActive: {
    color: colors.surface,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  langDivider: {
    width: 1,
    height: 13,
    backgroundColor: colors.border,
  },

  /* Scroll */
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
    justifyContent: 'center',
  },
  scrollWide: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },

  /* Card */
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: 0,
    overflow: 'hidden',
    ...shadows.lg,
    width: '100%',
  },
  cardWide: {
    maxWidth: 420,
    width: '100%',
  },

  /* Card top accent bar */
  cardAccent: {
    height: 4,
    backgroundColor: colors.primary,
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.md,
  },

  /* Logo section */
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logoWrap: {
    marginBottom: 0,
  },
  logoImg: {
    width: 180,
    height: 78,
  },
  tagline: {
    fontSize: 12,
    color: colors.accent,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontWeight: '600',
  },

  sep: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },

  /* Welcome text */
  welcomeHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  welcomeSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },

  /* Method toggle */
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
  },
  methodTabActive: {
    backgroundColor: colors.primary,
    ...shadows.xs,
  },
  methodTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  methodTabTextActive: {
    color: colors.surface,
  },

  /* Field label */
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  /* Phone input */
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: '#FAFAFA',
    height: 50,
    paddingRight: spacing.sm,
    overflow: 'hidden',
  },
  prefixBadge: {
    height: '100%' as any,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
    minWidth: 52,
  },
  prefixText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
    letterSpacing: 1,
    paddingVertical: 0,
  },

  /* Email input */
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: '#FAFAFA',
    height: 50,
    paddingRight: spacing.sm,
    overflow: 'hidden',
  },
  emailIconBox: {
    height: '100%' as any,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
    minWidth: 48,
  },
  emailInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    paddingVertical: 0,
  },

  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 0,
  },
  inputError: {
    borderColor: colors.error,
    shadowColor: colors.error,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
  },
  checkIcon: {
    marginLeft: spacing.xs,
  },

  /* Input hint (mobile + email) */
  inputHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 14,
  },

  /* Error */
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    lineHeight: 15,
  },

  /* OTP button */
  otpBtn: {
    height: 48,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
    shadowColor: colors.accent,
  },
  otpBtnDisabled: {
    opacity: 0.45,
  },
  otpBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  otpBtnIcon: {
    marginLeft: spacing.sm,
  },

  /* Trust signals */
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trustText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },

  /* Or divider */
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  orText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    paddingHorizontal: 4,
  },

  /* Register */
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  registerLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  registerLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
    lineHeight: 18,
  },

  /* Admin link */
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  adminLinkText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});

export default RoleSelectScreen;
