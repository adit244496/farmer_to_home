import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../types';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { useRatingsStore } from '../../store/ratingsStore';
import { useLanguage } from '../../hooks/useLanguage';

interface RatingModalProps {
  product: Product;
  visible: boolean;
  onClose: () => void;
}

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
const STAR_LABELS_MR = ['', 'खराब', 'ठीक', 'चांगले', 'खूप चांगले', 'उत्कृष्ट'];

export const RatingModal: React.FC<RatingModalProps> = ({ product, visible, onClose }) => {
  const [stars, setStars]         = useState(0);
  const [comment, setComment]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { rateProduct }           = useRatingsStore();
  const { getLocalizedText, language } = useLanguage();

  const productName = getLocalizedText(product.name_en, product.name_mr);
  const isMr = language === 'mr';
  const l = (en: string, mr: string) => isMr ? mr : en;

  const handleSubmit = () => {
    if (stars === 0) return;
    rateProduct(product.id, stars, comment);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setStars(0);
      setComment('');
      onClose();
    }, 1600);
  };

  const handleClose = () => {
    setStars(0);
    setComment('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{l('Rate Product', 'उत्पादन रेट करा')}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {submitted ? (
            /* ── Success state ── */
            <View style={styles.successState}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={36} color="#fff" />
              </View>
              <Text style={styles.successTitle}>{l('Thank you!', 'धन्यवाद!')}</Text>
              <Text style={styles.successSub}>
                {l('Your rating helps other customers.', 'तुमचे रेटिंग इतर ग्राहकांना मदत करते.')}
              </Text>
            </View>
          ) : (
            <>
              {/* Product name */}
              <Text style={styles.productName} numberOfLines={2}>{productName}</Text>

              {/* Star picker */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStars(s)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name={s <= stars ? 'star' : 'star-outline'}
                      size={44}
                      color={s <= stars ? '#F59E0B' : colors.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.starLabel, stars === 0 && { opacity: 0 }]}>
                {isMr ? STAR_LABELS_MR[stars] : STAR_LABELS[stars]}
              </Text>

              {/* Comment */}
              <Text style={styles.commentLabel}>
                {l('Share your experience (optional)', 'तुमचा अनुभव सांगा (पर्यायी)')}
              </Text>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder={l('Write a short review…', 'छोटा अभिप्राय लिहा…')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={styles.charCount}>{comment.length}/300</Text>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
                  <Text style={styles.cancelLabel}>{l('Cancel', 'रद्द करा')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, stars === 0 && styles.submitDisabled]}
                  onPress={handleSubmit}
                  disabled={stars === 0}
                  activeOpacity={0.85}
                >
                  <Ionicons name="star" size={15} color="#fff" />
                  <Text style={styles.submitLabel}>{l('Submit Rating', 'रेटिंग द्या')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xxl,
    ...shadows.lg,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
    marginBottom: spacing.md,
  },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.divider, alignItems: 'center', justifyContent: 'center',
  },

  // Product
  productName: {
    ...typography.h3, color: colors.textPrimary,
    textAlign: 'center', marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    lineHeight: 24,
  },

  // Stars
  starsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing.md,
    marginBottom: spacing.sm,
  },
  starLabel: {
    ...typography.buttonSm, color: '#F59E0B',
    textAlign: 'center', marginBottom: spacing.lg, height: 20,
  },

  // Comment
  commentLabel: {
    ...typography.bodySm, color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  commentInput: {
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body, color: colors.textPrimary,
    minHeight: 80,
    backgroundColor: colors.background,
    marginBottom: 4,
  },
  charCount: {
    ...typography.caption, color: colors.textMuted,
    textAlign: 'right', marginBottom: spacing.lg,
  },

  // Actions
  actions: {
    flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: borderRadius.md,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelLabel: { ...typography.buttonSm, color: colors.textSecondary },
  submitBtn: {
    flex: 2, flexDirection: 'row', paddingVertical: 12,
    borderRadius: borderRadius.md, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    ...shadows.sm,
  },
  submitDisabled: { backgroundColor: colors.border },
  submitLabel: { ...typography.buttonSm, color: '#fff' },

  // Success
  successState: {
    alignItems: 'center', paddingVertical: spacing.xxxl,
  },
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg, ...shadows.md,
  },
  successTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  successSub: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
