import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Switch,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { ProductCard } from '../../components/customer/ProductCard';
import { EmptyState } from '../../components/common/EmptyState';
import { productService } from '../../services/product.service';
import { useCartStore } from '../../store/cartStore';
import { Product } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FilterState {
  category: string;
  minPrice: string;
  maxPrice: string;
  minRating: number;
  isOrganic: boolean;
}

const DEFAULT_FILTER: FilterState = {
  category: '',
  minPrice: '',
  maxPrice: '',
  minRating: 0,
  isOrganic: false,
};

const CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Spices'];

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Newest First', value: 'newest' },
  { label: 'Top Rated', value: 'top_rated' },
] as const;

const RATING_OPTIONS = [
  { label: '3★ & above', value: 3 },
  { label: '4★ & above', value: 4 },
  { label: '4.5★ & above', value: 4.5 },
];

type SortValue = typeof SORT_OPTIONS[number]['value'];

export function SearchResultsScreen() {
  const { q: initialQuery, category: initialCategory } = useLocalSearchParams<{
    q?: string;
    category?: string;
  }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const addItem = useCartStore((s) => s.addItem);

  // Search state
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? '');
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // View state
  const [isGridView, setIsGridView] = useState(true);

  // Filter / sort state
  const [appliedFilter, setAppliedFilter] = useState<FilterState>({
    ...DEFAULT_FILTER,
    category: initialCategory ?? '',
  });
  const [pendingFilter, setPendingFilter] = useState<FilterState>({
    ...DEFAULT_FILTER,
    category: initialCategory ?? '',
  });
  const [sortBy, setSortBy] = useState<SortValue>('relevance');
  const [pendingSort, setPendingSort] = useState<SortValue>('relevance');

  // Modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const hasActiveFilter =
    appliedFilter.category !== '' ||
    appliedFilter.minPrice !== '' ||
    appliedFilter.maxPrice !== '' ||
    appliedFilter.minRating > 0 ||
    appliedFilter.isOrganic;

  const activeFilterCount = [
    appliedFilter.category !== '',
    appliedFilter.minPrice !== '' || appliedFilter.maxPrice !== '',
    appliedFilter.minRating > 0,
    appliedFilter.isOrganic,
  ].filter(Boolean).length;

  const loadProducts = useCallback(
    async (pageNum: number, reset: boolean) => {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      try {
        const params: Parameters<typeof productService.searchProducts>[0] = {
          q: searchQuery || undefined,
          category: appliedFilter.category || undefined,
          min_price: appliedFilter.minPrice ? parseFloat(appliedFilter.minPrice) : undefined,
          max_price: appliedFilter.maxPrice ? parseFloat(appliedFilter.maxPrice) : undefined,
          min_rating: appliedFilter.minRating > 0 ? appliedFilter.minRating : undefined,
          is_organic: appliedFilter.isOrganic || undefined,
          sort_by: sortBy === 'relevance' ? undefined : sortBy,
          page: pageNum,
          page_size: 20,
        };
        const response = await productService.searchProducts(params);
        if (reset) {
          setProducts(response.results);
        } else {
          setProducts((prev) => [...prev, ...response.results]);
        }
        setTotalCount(response.count);
        setHasNextPage(!!response.next);
        setPage(pageNum);
      } catch {
        // Silent fail — keep existing results
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [searchQuery, appliedFilter, sortBy]
  );

  // Reload when query, filters, or sort changes
  useEffect(() => {
    loadProducts(1, true);
  }, [loadProducts]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasNextPage) {
      loadProducts(page + 1, false);
    }
  };

  const handleSearch = () => {
    loadProducts(1, true);
  };

  const handleApplyFilters = () => {
    setAppliedFilter(pendingFilter);
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    const cleared: FilterState = {
      ...DEFAULT_FILTER,
    };
    setPendingFilter(cleared);
    setAppliedFilter(cleared);
    setShowFilterModal(false);
  };

  const handleApplySort = () => {
    setSortBy(pendingSort);
    setShowSortModal(false);
  };

  const handleOpenFilter = () => {
    setPendingFilter(appliedFilter);
    setShowFilterModal(true);
  };

  const handleOpenSort = () => {
    setPendingSort(sortBy);
    setShowSortModal(true);
  };

  const handleAddToCart = (product: Product) => {
    addItem(product, product.min_order_qty || 1);
  };

  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    const isOddInGrid = isGridView && index % 2 === 0;
    return (
      <View
        style={[
          styles.productWrapper,
          isGridView ? styles.productWrapperGrid : styles.productWrapperList,
          isGridView && isOddInGrid && { marginRight: spacing.sm },
        ]}
      >
        <ProductCard
          product={item}
          variant={isGridView ? 'compact' : 'expanded'}
          onAddToCart={() => handleAddToCart(item)}
        />
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholder="Search products..."
            placeholderTextColor={colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Result count ── */}
      {!isLoading && (
        <Text style={styles.resultCount}>
          {totalCount} results{searchQuery ? ` for '${searchQuery}'` : ''}
        </Text>
      )}

      {/* ── Filter bar + view toggle ── */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBarContent}
        >
          {/* Filter */}
          <TouchableOpacity
            style={[styles.filterChip, hasActiveFilter && styles.filterChipActive]}
            onPress={handleOpenFilter}
          >
            <Ionicons
              name="options-outline"
              size={14}
              color={hasActiveFilter ? colors.surface : colors.textSecondary}
            />
            <Text style={[styles.filterChipText, hasActiveFilter && styles.filterChipTextActive]}>
              Filter
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sort */}
          <TouchableOpacity
            style={[styles.filterChip, sortBy !== 'relevance' && styles.filterChipActive]}
            onPress={handleOpenSort}
          >
            <Ionicons
              name="swap-vertical-outline"
              size={14}
              color={sortBy !== 'relevance' ? colors.surface : colors.textSecondary}
            />
            <Text
              style={[styles.filterChipText, sortBy !== 'relevance' && styles.filterChipTextActive]}
            >
              Sort
            </Text>
          </TouchableOpacity>

          {/* Category */}
          <TouchableOpacity
            style={[styles.filterChip, appliedFilter.category !== '' && styles.filterChipActive]}
            onPress={handleOpenFilter}
          >
            <Text
              style={[
                styles.filterChipText,
                appliedFilter.category !== '' && styles.filterChipTextActive,
              ]}
            >
              {appliedFilter.category || 'Category'}
            </Text>
          </TouchableOpacity>

          {/* Price */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              (appliedFilter.minPrice !== '' || appliedFilter.maxPrice !== '') &&
                styles.filterChipActive,
            ]}
            onPress={handleOpenFilter}
          >
            <Text
              style={[
                styles.filterChipText,
                (appliedFilter.minPrice !== '' || appliedFilter.maxPrice !== '') &&
                  styles.filterChipTextActive,
              ]}
            >
              Price
            </Text>
          </TouchableOpacity>

          {/* Rating */}
          <TouchableOpacity
            style={[styles.filterChip, appliedFilter.minRating > 0 && styles.filterChipActive]}
            onPress={handleOpenFilter}
          >
            <Text
              style={[
                styles.filterChipText,
                appliedFilter.minRating > 0 && styles.filterChipTextActive,
              ]}
            >
              {appliedFilter.minRating > 0 ? `${appliedFilter.minRating}★+` : 'Rating'}
            </Text>
          </TouchableOpacity>

          {/* Organic */}
          <TouchableOpacity
            style={[styles.filterChip, appliedFilter.isOrganic && styles.filterChipActive]}
            onPress={handleOpenFilter}
          >
            <Text
              style={[
                styles.filterChipText,
                appliedFilter.isOrganic && styles.filterChipTextActive,
              ]}
            >
              Organic
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Grid / List toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, isGridView && styles.toggleBtnActive]}
            onPress={() => setIsGridView(true)}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={isGridView ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, !isGridView && styles.toggleBtnActive]}
            onPress={() => setIsGridView(false)}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={!isGridView ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Product list ── */}
      {isLoading ? (
        <View style={styles.fullLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          icon="leaf-outline"
          title="No products found"
          subtitle="Try adjusting your search or filters"
          ctaLabel="Clear Filters"
          onCta={handleClearFilters}
        />
      ) : (
        <FlatList
          key={isGridView ? 'grid' : 'list'}
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => String(item.id)}
          numColumns={isGridView ? 2 : 1}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ══ FILTER MODAL ══ */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        />
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Filter Products</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Category */}
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.optionChip,
                    pendingFilter.category === cat && styles.optionChipActive,
                  ]}
                  onPress={() =>
                    setPendingFilter((f) => ({
                      ...f,
                      category: f.category === cat ? '' : cat,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      pendingFilter.category === cat && styles.optionChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price range */}
            <Text style={styles.sectionLabel}>Price Range</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={pendingFilter.minPrice}
                  onChangeText={(v) => setPendingFilter((f) => ({ ...f, minPrice: v }))}
                  placeholder="Min"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.priceDash}>—</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={pendingFilter.maxPrice}
                  onChangeText={(v) => setPendingFilter((f) => ({ ...f, maxPrice: v }))}
                  placeholder="Max"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Rating */}
            <Text style={styles.sectionLabel}>Minimum Rating</Text>
            <View style={styles.chipRow}>
              {RATING_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionChip,
                    pendingFilter.minRating === opt.value && styles.optionChipActive,
                  ]}
                  onPress={() =>
                    setPendingFilter((f) => ({
                      ...f,
                      minRating: f.minRating === opt.value ? 0 : opt.value,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      pendingFilter.minRating === opt.value && styles.optionChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Organic toggle */}
            <View style={styles.organicRow}>
              <Text style={styles.organicLabel}>Organic Only</Text>
              <Switch
                value={pendingFilter.isOrganic}
                onValueChange={(v) => setPendingFilter((f) => ({ ...f, isOrganic: v }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearFilters}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ SORT MODAL ══ */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        />
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Sort By</Text>

          {SORT_OPTIONS.map((opt) => {
            const isSelected = pendingSort === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={styles.sortOption}
                onPress={() => setPendingSort(opt.value)}
              >
                <Text style={[styles.sortOptionText, isSelected && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.applyBtn, { marginTop: spacing.xl }]}
            onPress={handleApplySort}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const GRID_ITEM_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - spacing.sm) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.divider,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
  },

  // ── Result count
  resultCount: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  // ── Filter bar
  filterBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterBarContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.surface,
  },

  // ── Grid / list toggle
  toggleContainer: {
    flexDirection: 'row',
    paddingRight: spacing.md,
    gap: 2,
  },
  toggleBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.primaryPastel,
  },

  // ── Product list
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  productWrapper: {
    flex: 1,
  },
  productWrapperGrid: {
    maxWidth: GRID_ITEM_WIDTH,
    marginBottom: spacing.sm,
  },
  productWrapperList: {
    marginBottom: spacing.sm,
  },
  loadMoreContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  fullLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    maxHeight: '85%',
    ...shadows.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },

  // ── Filter modal internals
  sectionLabel: {
    ...typography.h4,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surface,
  },
  optionChipActive: {
    backgroundColor: colors.primaryPastel,
    borderColor: colors.primary,
  },
  optionChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  optionChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currencyPrefix: {
    ...typography.body,
    color: colors.textMuted,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
  },
  priceDash: {
    ...typography.body,
    color: colors.textMuted,
  },
  organicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  organicLabel: {
    ...typography.bodyLg,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  clearBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  clearBtnText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  applyBtnText: {
    ...typography.button,
    color: colors.surface,
  },

  // ── Sort modal
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sortOptionText: {
    ...typography.bodyLg,
    color: colors.textPrimary,
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
});
