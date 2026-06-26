import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { orderService } from '../../services/order.service';
import { Address } from '../../types';

// ─── Label chip config ────────────────────────────────────────────────────────

type LabelType = 'Home' | 'Work' | 'Other';

const LABEL_CHIPS: Array<{ key: LabelType; emoji: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = [
  { key: 'Home',  emoji: '🏠', icon: 'home-outline' },
  { key: 'Work',  emoji: '💼', icon: 'briefcase-outline' },
  { key: 'Other', emoji: '📍', icon: 'location-outline' },
];

// ─── Field Row ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
}

const FieldRow: React.FC<FieldRowProps> = ({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  autoCapitalize = 'sentences',
  error,
}) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <View style={[fieldStyles.row, error ? fieldStyles.rowError : null]}>
      <Ionicons name={icon} size={18} color={error ? colors.error : colors.textMuted} style={fieldStyles.icon} />
      <TextInput
        style={[fieldStyles.input, { outlineWidth: 0, outlineStyle: 'none' } as any]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
    </View>
    {!!error && <Text style={fieldStyles.errorText}>{error}</Text>}
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: { ...typography.captionBold, color: colors.textSecondary, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  rowError: { borderColor: colors.error },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
  },
  errorText: { ...typography.caption, color: colors.error, marginTop: 3 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export function AddEditAddressScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { addressId } = useLocalSearchParams<{ addressId?: string }>();

  const isEdit = !!addressId;

  // Form state
  const [label, setLabel] = useState<LabelType>('Home');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [stateVal, setStateVal] = useState('Maharashtra');
  const [isDefault, setIsDefault] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Partial<Record<
    'recipientName' | 'phone' | 'houseNo' | 'area' | 'city' | 'pinCode' | 'state',
    string
  >>>({});

  const [loadingAddress, setLoadingAddress] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Load existing address when editing
  useEffect(() => {
    if (!isEdit || !addressId) return;
    (async () => {
      try {
        const list = await orderService.getAddresses();
        const found = list.find((a) => a.id === Number(addressId));
        if (found) {
          setRecipientName(found.recipient_name);
          setPhone(found.phone);
          setHouseNo(found.house_no);
          setArea(found.area);
          setCity(found.city);
          setPinCode(found.pin_code);
          setStateVal(found.state);
          setIsDefault(found.is_default);
        }
      } catch {
        Alert.alert('Error', 'Failed to load address details.');
      } finally {
        setLoadingAddress(false);
      }
    })();
  }, [isEdit, addressId]);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!recipientName.trim()) newErrors.recipientName = 'Recipient name is required.';
    if (!phone.trim() || phone.trim().length < 10) newErrors.phone = 'Enter a valid 10-digit phone number.';
    if (!houseNo.trim()) newErrors.houseNo = 'House / flat number is required.';
    if (!area.trim()) newErrors.area = 'Area / street is required.';
    if (!city.trim()) newErrors.city = 'City is required.';
    if (!pinCode.trim() || pinCode.trim().length !== 6) newErrors.pinCode = 'Enter a valid 6-digit PIN code.';
    if (!stateVal.trim()) newErrors.state = 'State is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;

    const payload: Omit<Address, 'id'> = {
      recipient_name: recipientName.trim(),
      phone: phone.trim(),
      house_no: houseNo.trim(),
      area: area.trim(),
      city: city.trim(),
      pin_code: pinCode.trim(),
      state: stateVal.trim(),
      is_default: isDefault,
    };

    setSaving(true);
    try {
      if (isEdit && addressId) {
        await orderService.updateAddress(Number(addressId), payload);
      } else {
        await orderService.addAddress(payload);
      }
      Alert.alert(
        isEdit ? t('addressUpdated', 'Address Updated') : t('addressAdded', 'Address Added'),
        isEdit
          ? t('addressUpdateSuccess', 'Address updated successfully.')
          : t('addressAddSuccess', 'Address added successfully.'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (loadingAddress) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? t('editAddress', 'Edit Address') : t('addNewAddress', 'Add New Address')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Label chips ── */}
        <Text style={styles.sectionTitle}>{t('addressLabel', 'Address Type')}</Text>
        <View style={styles.labelChipRow}>
          {LABEL_CHIPS.map(({ key, emoji }) => (
            <TouchableOpacity
              key={key}
              style={[styles.labelChip, label === key && styles.labelChipSelected]}
              onPress={() => setLabel(key)}
              activeOpacity={0.8}
            >
              <Text style={styles.labelChipEmoji}>{emoji}</Text>
              <Text style={[styles.labelChipText, label === key && styles.labelChipTextSelected]}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Form fields card ── */}
        <View style={styles.formCard}>
          <FieldRow
            icon="person-outline"
            label={t('recipientName', 'Recipient Name *')}
            value={recipientName}
            onChangeText={(v) => { setRecipientName(v); setErrors((e) => ({ ...e, recipientName: undefined })); }}
            placeholder="Full name"
            autoCapitalize="words"
            error={errors.recipientName}
          />
          <FieldRow
            icon="call-outline"
            label={t('phoneNumber', 'Phone Number *')}
            value={phone}
            onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: undefined })); }}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phone}
          />
          <FieldRow
            icon="home-outline"
            label={t('houseNo', 'House No / Flat *')}
            value={houseNo}
            onChangeText={(v) => { setHouseNo(v); setErrors((e) => ({ ...e, houseNo: undefined })); }}
            placeholder="e.g. 12A, Flat 301"
            error={errors.houseNo}
          />
          <FieldRow
            icon="map-outline"
            label={t('area', 'Area / Street *')}
            value={area}
            onChangeText={(v) => { setArea(v); setErrors((e) => ({ ...e, area: undefined })); }}
            placeholder="e.g. MG Road, Shivaji Nagar"
            error={errors.area}
          />
          <FieldRow
            icon="business-outline"
            label={t('city', 'City *')}
            value={city}
            onChangeText={(v) => { setCity(v); setErrors((e) => ({ ...e, city: undefined })); }}
            placeholder="e.g. Pune"
            error={errors.city}
          />
          <FieldRow
            icon="barcode-outline"
            label={t('pinCode', 'PIN Code *')}
            value={pinCode}
            onChangeText={(v) => { setPinCode(v); setErrors((e) => ({ ...e, pinCode: undefined })); }}
            placeholder="6-digit PIN"
            keyboardType="numeric"
            maxLength={6}
            error={errors.pinCode}
          />
          <FieldRow
            icon="location-outline"
            label={t('state', 'State *')}
            value={stateVal}
            onChangeText={(v) => { setStateVal(v); setErrors((e) => ({ ...e, state: undefined })); }}
            placeholder="State"
            autoCapitalize="words"
            error={errors.state}
          />
        </View>

        {/* ── Set as Default switch ── */}
        <View style={styles.defaultRow}>
          <View style={styles.defaultLabelWrap}>
            <Text style={styles.defaultLabel}>{t('setAsDefault', 'Set as default address')}</Text>
            <Text style={styles.defaultSub}>{t('defaultSub', 'Pre-selected at checkout')}</Text>
          </View>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEdit
                ? t('updateAddress', 'Update Address')
                : t('addAddress', 'Add Address')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },

  /* Scroll */
  scrollContent: {
    padding: spacing.lg,
  },

  /* Section title */
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  /* Label chips */
  labelChipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  labelChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  labelChipEmoji: {
    fontSize: 14,
  },
  labelChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  labelChipTextSelected: {
    color: colors.textInverse,
  },

  /* Form card */
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },

  /* Default switch row */
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
    gap: spacing.md,
  },
  defaultLabelWrap: {
    flex: 1,
  },
  defaultLabel: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  defaultSub: {
    ...typography.caption,
    color: colors.textMuted,
  },

  /* Save button */
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
