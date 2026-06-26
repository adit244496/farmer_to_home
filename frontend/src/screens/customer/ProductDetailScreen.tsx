import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LeafIcon } from '../../components/common/LeafIcon';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { ImageCarousel } from '../../components/customer/ImageCarousel';
import { StarRating } from '../../components/common/StarRating';
import { ReviewCard } from '../../components/customer/ReviewCard';
import { ProductCard } from '../../components/customer/ProductCard';
import { productService } from '../../services/product.service';
import { useCartStore } from '../../store/cartStore';
import { useLanguage } from '../../hooks/useLanguage';
import { Product, Review } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { MOCK_PRODUCTS } from '../../data/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 300;
const CARD_OVERLAP = 20;

export function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { getLocalizedText } = useLanguage();
  const addItem = useCartStore((s) => s.addItem);

  // Data state
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [quantity, setQuantity] = useState(1);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  // Load all data on mount
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    Promise.all([
      productService.getProductDetail(id),
      productService.getProductReviews(id, 1),
      productService.getSimilarProducts(id),
      productService.trackProductView(id),
    ])
      .then(([productData, reviewsData, similar]) => {
        setProduct(productData);
        setReviews(reviewsData.results.slice(0, 3));
        setSimilarProducts(similar);
        setQuantity(productData.min_order_qty || 1);
      })
      .catch(() => {
        const mockProduct = MOCK_PRODUCTS.find((p) => String(p.id) === id);
        if (mockProduct) {
          setProduct(mockProduct);
          setQuantity(mockProduct.min_order_qty || 1);
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const isOutOfStock = product ? product.stock_quantity <= 0 : false;

  const handleDecreaseQty = () => {
    const minQty = product?.min_order_qty || 1;
    setQuantity((q) => Math.max(minQty, q - 1));
  };

  const handleIncreaseQty = () => {
    const maxQty = product?.stock_quantity ?? 999;
    setQuantity((q) => Math.min(maxQty, q + 1));
  };

  const handleAddToCart = useCallback(() => {
    if (product && !isOutOfStock) {
      addItem(product, quantity);
    }
  }, [product, quantity, isOutOfStock, addItem]);

  const handleBuyNow = useCallback(() => {
    if (product && !isOutOfStock) {
      addItem(product, quantity);
      router.push('/customer/cart');
    }
  }, [product, quantity, isOutOfStock, addItem]);

  const handleFarmerPress = () => {
    if (product) {
      router.push(`/customer/farmer/${product.farmer.id}`);
    }
  };

  const renderSimilarProduct = ({ item }: { item: Product }) => (
    <View style={styles.similarProductWrapper}>
      <ProductCard product={item} variant="compact" />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <Text style={styles.errorText}>Product not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLinkBtn}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const productName = getLocalizedText(product.name_en, product.name_mr ?? product.name_en);
  const productDesc = getLocalizedText(
    product.description_en ?? '',
    product.description_mr ?? product.description_en ?? ''
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        {/* Image carousel */}
        <View style={styles.imageContainer}>
          <ImageCarousel images={product.images} height={IMAGE_HEIGHT} />

          {/* Floating back button */}
          <TouchableOpacity
            style={[styles.floatingBackBtn, { top: insets.top + spacing.sm }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Organic badge */}
          {product.is_organic && (
            <View style={[styles.organicBadge, { top: insets.top + spacing.sm }]}>
              <LeafIcon size={12} color="#fff" strokeWidth={2.5} />
              <Text style={styles.organicBadgeText}>Organic</Text>
            </View>
          )}
        </View>

        {/* ── Content card ── */}
        <View style={styles.contentCard}>
          {/* Tags row */}
          {product.tags && product.tags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsRow}
            >
              {product.tags.map((tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Product name */}
          <Text style={styles.productName}>{productName}</Text>

          {/* Farmer row */}
          <TouchableOpacity style={styles.farmerRow} onPress={handleFarmerPress}>
            {product.farmer.profile_photo ? (
              <Image source={{ uri: product.farmer.profile_photo }} style={styles.farmerAvatar} />
            ) : (
              <View style={[styles.farmerAvatar, styles.farmerAvatarPlaceholder]}>
                <Ionicons name="person" size={16} color={colors.textMuted} />
              </View>
            )}
            <Text style={styles.farmerName}>{product.farmer.full_name || 'Farmer'}</Text>
            {product.farmer.total_ratings > 0 && (
              <View style={styles.farmerRatingRow}>
                <StarRating rating={product.farmer.rating} size={12} />
                <Text style={styles.farmerRatingText}>
                  {product.farmer.rating.toFixed(1)} ({product.farmer.total_ratings})
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Price block */}
          <View style={styles.priceBlock}>
            <View style={styles.priceRow}>
              <Text style={styles.priceText}>{formatCurrency(product.price_per_unit)}</Text>
              <Text style={styles.unitText}>/{product.unit}</Text>
              {product.original_price != null && product.original_price > product.price_per_unit && (
                <>
                  <Text style={styles.originalPrice}>{formatCurrency(product.original_price)}</Text>
                  {product.discount_percent != null && product.discount_percent > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{Math.round(product.discount_percent)}% OFF</Text>
                    </View>
                  )}
                </>
              )}
            </View>
            {isOutOfStock ? (
              <View style={[styles.stockBadge, styles.stockBadgeOut]}>
                <Text style={[styles.stockBadgeText, styles.stockBadgeTextOut]}>Out of Stock</Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.stockBadgeIn]}>
                <Text style={[styles.stockBadgeText, styles.stockBadgeTextIn]}>In Stock</Text>
              </View>
            )}
          </View>

          {/* Harvest / best-before */}
          {(product.harvest_date || product.best_before_date) && (
            <View style={styles.datesRow}>
              {product.harvest_date && (
                <View style={styles.dateItem}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.dateText}>
                    Harvested: {new Date(product.harvest_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              )}
              {product.best_before_date && (
                <View style={styles.dateItem}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.dateText}>
                    Best before: {new Date(product.best_before_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          {productDesc ? (
            <View style={styles.descriptionBlock}>
              <Text
                style={styles.descriptionText}
                numberOfLines={showFullDescription ? undefined : 3}
              >
                {productDesc}
              </Text>
              <TouchableOpacity onPress={() => setShowFullDescription((v) => !v)}>
                <Text style={styles.showMoreText}>
                  {showFullDescription ? 'Show less' : 'Show more'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Reviews summary */}
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Customer Reviews</Text>
            {product.total_ratings > 0 && (
              <View style={styles.reviewSummaryRow}>
                <StarRating rating={product.rating} size={16} />
                <Text style={styles.reviewAvgText}>{product.rating.toFixed(1)}</Text>
                <Text style={styles.reviewCountText}>({product.total_ratings} reviews)</Text>
              </View>
            )}
          </View>

          {/* Review cards */}
          {reviews.length > 0 ? (
            <>
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
              <TouchableOpacity style={styles.seeAllLink}>
                <Text style={styles.seeAllText}>See All Reviews →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noReviewsText}>No reviews yet.</Text>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Similar products */}
          {similarProducts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Similar Products</Text>
              <FlatList
                data={similarProducts}
                renderItem={renderSimilarProduct}
                keyExtractor={(item) => String(item.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarList}
                scrollEnabled={true}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.md },
        ]}
      >
        {isOutOfStock ? (
          <View style={[styles.bottomBtn, styles.outOfStockBtn]}>
            <Text style={styles.outOfStockBtnText}>Out of Stock</Text>
          </View>
        ) : (
          <>
            {/* Quantity selector */}
            <View style={styles.qtySelector}>
              <TouchableOpacity style={styles.qtyBtn} onPress={handleDecreaseQty}>
                <Ionicons name="remove" size={18} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={handleIncreaseQty}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              style={[styles.bottomBtn, styles.addToCartBtn]}
              onPress={handleAddToCart}
            >
              <Text style={styles.addToCartBtnText}>Add to Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bottomBtn, styles.buyNowBtn]}
              onPress={handleBuyNow}
            >
              <Text style={styles.buyNowBtnText}>Buy Now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  backLinkBtn: {
    marginTop: spacing.sm,
  },
  backLinkText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Scroll
  scrollView: {
    flex: 1,
  },

  // ── Image area
  imageContainer: {
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  floatingBackBtn: {
    position: 'absolute',
    left: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  organicBadge: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: 'rgba(22,163,74,0.92)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...shadows.sm,
  },
  organicBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.2,
  },

  // ── Content card
  contentCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    marginTop: -CARD_OVERLAP,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    ...shadows.md,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tagChip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tagChipText: {
    ...typography.bodySm,
    color: colors.primary,
  },

  // Product name
  productName: {
    ...typography.displayMd,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // Farmer row
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  farmerAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
  },
  farmerAvatarPlaceholder: {
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerName: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  farmerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  farmerRatingText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Price block
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: spacing.xs,
  },
  priceText: {
    ...typography.price,
    color: colors.accent,
    fontSize: 28,
  },
  unitText: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  originalPrice: {
    fontSize: 15,
    color: colors.textMuted,
    textDecorationLine: 'line-through' as const,
  },
  discountBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#D97706',
  },
  stockBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stockBadgeIn: {
    backgroundColor: colors.successLight,
  },
  stockBadgeOut: {
    backgroundColor: colors.errorLight,
  },
  stockBadgeText: {
    ...typography.captionBold,
  },
  stockBadgeTextIn: {
    color: colors.success,
  },
  stockBadgeTextOut: {
    color: colors.error,
  },

  // Dates
  datesRow: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Description
  descriptionBlock: {
    marginBottom: spacing.md,
  },
  descriptionText: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  showMoreText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xl,
  },

  // Reviews
  reviewsHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  reviewSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewAvgText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  reviewCountText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  noReviewsText: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  seeAllLink: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  seeAllText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  // Similar products
  similarList: {
    paddingRight: spacing.lg,
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  similarProductWrapper: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2.3,
  },

  // ── Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    ...typography.h4,
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartBtn: {
    backgroundColor: colors.primary,
  },
  addToCartBtnText: {
    ...typography.button,
    color: colors.surface,
  },
  buyNowBtn: {
    backgroundColor: colors.accent,
  },
  buyNowBtnText: {
    ...typography.button,
    color: colors.surface,
  },
  outOfStockBtn: {
    backgroundColor: colors.border,
  },
  outOfStockBtnText: {
    ...typography.button,
    color: colors.textMuted,
  },
});
