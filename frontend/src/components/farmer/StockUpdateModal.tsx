import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../types';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { Button } from '../common/Button';
import { useTranslation } from 'react-i18next';

interface StockUpdateModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onUpdate: (productId: number, delta: number) => Promise<void>;
}

export const StockUpdateModal: React.FC<StockUpdateModalProps> = ({
  visible,
  product,
  onClose,
  onUpdate,
}) => {
  const { t } = useTranslation('farmer');
  const [delta, setDelta] = useState(0);
  const [directInput, setDirectInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!product) return null;

  const currentStock = product.stock_quantity;
  const targetStock =
    directInput !== '' ? Math.max(0, parseInt(directInput) || 0) : Math.max(0, currentStock + delta);
  const previewDelta = targetStock - currentStock;

  const handleUpdateStock = async () => {
    if (previewDelta === 0) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(product.id, previewDelta);
      setDelta(0);
      setDirectInput('');
      onClose();
    } catch {
      Alert.alert(t('common:error'), t('common:serverError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDelta(0);
    setDirectInput('');
    onClose();
  };

  const handleDecrement = () => {
    if (directInput !== '') {
      setDirectInput('');
    }
    setDelta((d) => d - 1);
  };

  const handleIncrement = () => {
    if (directInput !== '') {
      setDirectInput('');
    }
    setDelta((d) => d + 1);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('updateStockTitle')}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Product name */}
          <Text style={styles.productName} numberOfLines={1}>{product.name_en}</Text>

          {/* Current stock display */}
          <View style={styles.currentStockCard}>
            <Ionicons name="cube-outline" size={18} color={colors.primary} />
            <Text style={styles.currentStockLabel}>{t('currentStock')}:</Text>
            <Text style={styles.currentStockValue}>
              {currentStock} {product.unit}
            </Text>
          </View>

          {/* Large quantity display */}
          <View style={styles.qtyDisplayRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleDecrement}
              activeOpacity={0.8}
            >
              <Ionicons name="remove" size={26} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.qtyCenter}>
              <Text
                style={[
                  styles.deltaText,
                  previewDelta > 0 && styles.deltaPositive,
                  previewDelta < 0 && styles.deltaNegative,
                ]}
              >
                {delta > 0 ? `+${delta}` : delta}
              </Text>
              <Text style={styles.previewLabel}>
                {t('newQuantity')}:{' '}
                <Text style={styles.previewValue}>{targetStock}</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.controlBtn, styles.controlBtnPlus]}
              onPress={handleIncrement}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* OR separator */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or type directly</Text>
            <View style={styles.orLine} />
          </View>

          {/* Direct input */}
          <View style={styles.directInputRow}>
            <Text style={styles.directInputLabel}>{t('newQuantity')}:</Text>
            <TextInput
              style={[styles.directInput, { outlineWidth: 0, outlineStyle: 'none' } as any]}
              value={directInput}
              onChangeText={(val) => {
                setDirectInput(val);
                setDelta(0);
              }}
              keyboardType="numeric"
              placeholder={String(currentStock)}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.directInputUnit}>{product.unit}</Text>
          </View>

          {/* Update button */}
          <Button
            title="Update Stock"
            onPress={handleUpdateStock}
            loading={isLoading}
            variant="accent"
            fullWidth
            style={styles.updateButton}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.xxl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xxl,
    ...shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  currentStockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryPastel,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  currentStockLabel: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '500' as const,
    flex: 1,
  },
  currentStockValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.primaryDark,
  },
  qtyDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryPastel,
  },
  controlBtnPlus: {
    backgroundColor: colors.primaryPastel,
  },
  qtyCenter: {
    alignItems: 'center',
    flex: 1,
  },
  deltaText: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  deltaPositive: {
    color: colors.success,
  },
  deltaNegative: {
    color: colors.error,
  },
  previewLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  previewValue: {
    fontWeight: '700' as const,
    color: colors.textPrimary,
    fontSize: 14,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  orText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500' as const,
  },
  directInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    backgroundColor: colors.divider,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  directInputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  directInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: 4,
  },
  directInputUnit: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500' as const,
  },
  updateButton: {},
});
