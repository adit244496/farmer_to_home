import React, { useState, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { orderService } from '../../services/order.service';
import { useLanguage } from '../../hooks/useLanguage';
import { formatCurrency } from '../../utils/formatting';
import { OrderItem, Product } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductReview {
  rating: number;      // 0 = not rated yet, 1–5 = star rating
  comment: string;
  photos: string[];
}

type ReviewsState = Record<number, ProductReview>; // key = product id

// ─── Helper ───────────────────────────────────────────────────────────────────

const MAX_COMMENT_LENGTH = 300;

function buildInitialReviews(items: OrderItem[]): ReviewsState {
  const state: ReviewsState = {};
  items.forEach((item) => {
    state[item.product.id] = { rating: 0, comment: '', photos: [] };
  });
  return state;
}

// ─── StarRating sub-component ─────────────────────────────────────────────────

interface StarRatingProps {
  productId: number;
  rating: number;
  onRate: (productId: number, star: number) => void;
}

function StarRating({ productId, rating, onRate }: StarRatingProps) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onRate(productId, star)}
          activeOpacity={0.7}
          style={starStyles.starButton}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={32}
            color={star <= rating ? colors.accent : colors.border}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: spacing.md,
  },
  starButton: {
    padding: spacing.xs,
  },
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReviewSubmitScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { t } = useTranslation('orders');
  const insets = useSafeAreaInsets();
  const { getLocalizedText } = useLanguage();

  const [items, setItems] = useState<OrderItem[]>([]);
  const [reviews, setReviews] = useState<ReviewsState>({});
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Load order items ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const order = await orderService.getOrderDetail(Number(orderId));
        setItems(order.items);
        setReviews(buildInitialReviews(order.items));
      } catch (err) {
        Alert.alert(
          t('error', 'Error'),
          t('loadError', 'Could not load order details. Please try again.'),
        );
      } finally {
        setIsLoadingOrder(false);
      }
    })();
  }, [orderId, t]);

  // ── Derived: all products rated ────────────────────────────────────────────
  const allRated =
    items.length > 0 &&
    items.every((item) => (reviews[item.product.id]?.rating ?? 0) > 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleRate(productId: number, star: number) {
    setReviews((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], rating: star },
    }));
  }

  function handleCommentChange(productId: number, text: string) {
    if (text.length > MAX_COMMENT_LENGTH) return;
    setReviews((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], comment: text },
    }));
  }

  async function handleAddPhoto(productId: number) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setReviews((prev) => ({
          ...prev,
          [productId]: {
            ...prev[productId],
            photos: [...(prev[productId]?.photos ?? []), uri],
          },
        }));
      }
    } catch (err) {
      Alert.alert(
        t('photoError', 'Photo Error'),
        t('photoErrorMsg', 'Could not open photo library. Please try again.'),
      );
    }
  }

  function handleRemovePhoto(productId: number, photoUri: string) {
    setReviews((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        photos: prev[productId].photos.filter((p) => p !== photoUri),
      },
    }));
  }

  async function handleSubmit() {
    if (!allRated || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await orderService.submitReview({
        order_id: Number(orderId),
        reviews: items.map((item) => ({
          product_id: item.product.id,
          rating: reviews[item.product.id].rating,
          comment: reviews[item.product.id].comment,
          photos: reviews[item.product.id].photos,
        })),
      });
      Alert.alert(
        t('reviewSubmitted', 'Reviews Submitted'),
        t('reviewSubmittedMsg', 'Thank you for your feedback!'),
        [{ text: t('ok', 'OK'), onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert(
        t('error', 'Error'),
        t('submitError', 'Could not submit reviews. Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoadingOrder) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('rateYourPurchase', 'Rate Your Purchase')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('loading', 'Loading...')}</Text>
        </View>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rateYourPurchase', 'Rate Your Purchase')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxxl + 72 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {items.map((item) => {
            const productReview = reviews[item.product.id] ?? {
              rating: 0,
              comment: '',
              photos: [],
            };
            const primaryImage =
              item.product.images?.find((img) => img.is_primary) ||
              item.product.images?.[0];
            const productName = getLocalizedText(
              item.product.name_en,
              item.product.name_mr,
            );
            const farmerName = item.farmer?.full_name ?? item.product.farmer?.full_name;

            return (
              <View key={item.product.id} style={styles.productCard}>
                {/* ── Product Header ─────────────────────────────────── */}
                <View style={styles.productHeader}>
                  {primaryImage ? (
                    <Image
                      source={{ uri: primaryImage.image_url }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <Ionicons name="leaf-outline" size={24} color={colors.border} />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {productName}
                    </Text>
                    {!!farmerName && (
                      <Text style={styles.farmerName}>
                        {t('by', 'by')} {farmerName}
                      </Text>
                    )}
                    <Text style={styles.productPrice}>
                      {formatCurrency(item.unit_price)} / {item.product.unit}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* ── Star Rating ────────────────────────────────────── */}
                <Text style={styles.ratingLabel}>
                  {productReview.rating === 0
                    ? t('tapToRate', 'Tap to rate')
                    : `${productReview.rating} / 5 ${t('stars', 'stars')}`}
                </Text>
                <StarRating
                  productId={item.product.id}
                  rating={productReview.rating}
                  onRate={handleRate}
                />

                {/* ── Comment Input ──────────────────────────────────── */}
                <View style={styles.commentWrap}>
                  <TextInput
                    style={[styles.commentInput, { outlineWidth: 0, outlineStyle: 'none' } as any]}
                    value={productReview.comment}
                    onChangeText={(text) => handleCommentChange(item.product.id, text)}
                    placeholder={t('writeReview', 'Write your review here...')}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={MAX_COMMENT_LENGTH}
                  />
                  <Text style={styles.charCounter}>
                    {productReview.comment.length}/{MAX_COMMENT_LENGTH}
                  </Text>
                </View>

                {/* ── Photo Upload ───────────────────────────────────── */}
                <View style={styles.photoSection}>
                  {productReview.photos.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.photoScroll}
                      contentContainerStyle={styles.photoScrollContent}
                    >
                      {productReview.photos.map((photoUri) => (
                        <View key={photoUri} style={styles.photoThumbWrap}>
                          <Image
                            source={{ uri: photoUri }}
                            style={styles.photoThumb}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={styles.photoRemoveBtn}
                            onPress={() => handleRemovePhoto(item.product.id, photoUri)}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}

                  <TouchableOpacity
                    style={styles.addPhotoButton}
                    onPress={() => handleAddPhoto(item.product.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="image-outline" size={18} color={colors.primary} />
                    <Text style={styles.addPhotoText}>{t('addPhoto', 'Add Photo')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* ── Submit Button ────────────────────────────────────────────── */}
        <View
          style={[
            styles.submitContainer,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!allRated || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!allRated || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.textInverse} />
                <Text style={styles.submitButtonText}>
                  {t('submitReviews', 'Submit Reviews')}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {!allRated && (
            <Text style={styles.submitHint}>
              {t('rateAllHint', 'Please rate all products to submit.')}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  spinnerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textInverse,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  // ── Scroll
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  // ── Product Card
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
  },
  productImagePlaceholder: {
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    gap: 3,
  },
  productName: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  farmerName: {
    ...typography.caption,
    color: colors.textMuted,
  },
  productPrice: {
    ...typography.captionBold,
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: spacing.md,
  },

  // ── Star Rating label
  ratingLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ── Comment input
  commentWrap: {
    marginTop: spacing.sm,
    position: 'relative',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingBottom: spacing.xl,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCounter: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    ...typography.caption,
    color: colors.textMuted,
  },

  // ── Photo section
  photoSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  photoScroll: {
    marginBottom: spacing.xs,
  },
  photoScrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  photoThumbWrap: {
    position: 'relative',
  },
  photoThumb: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  addPhotoText: {
    ...typography.captionBold,
    color: colors.primary,
  },

  // ── Submit area
  submitContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  submitHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
