import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Platform,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LeafIcon } from '../../components/common/LeafIcon';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows, webStyles } from '../../theme';
import { ProductCard } from '../../components/customer/ProductCard';
import { useCartStore } from '../../store/cartStore';
import { useLanguage } from '../../hooks/useLanguage';
import { Product } from '../../types';
import { MOCK_PRODUCTS } from '../../data/mockData';

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const BP_DESKTOP = 1024;
const MAX_WIDTH  = 1280;

// ─── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { en: string; mr: string }> = {
  vegetables: { en: 'Vegetables', mr: 'भाज्या' },
  fruits:     { en: 'Fruits',     mr: 'फळे'    },
  grains:     { en: 'Grains',     mr: 'धान्य'  },
  dairy:      { en: 'Dairy',      mr: 'दुग्ध'  },
  spices:     { en: 'Spices',     mr: 'मसाले'  },
};

// ─── Subcategories ─────────────────────────────────────────────────────────────

interface Subcategory { id: string; labelEn: string; labelMr: string; emoji: string }

const SUBCATEGORIES: Record<string, Subcategory[]> = {
  vegetables: [
    { id: 'all',    labelEn: 'All',            labelMr: 'सर्व',           emoji: '🥬' },
    { id: 'leafy',  labelEn: 'Leafy Greens',   labelMr: 'पालेभाज्या',     emoji: '🌿' },
    { id: 'root',   labelEn: 'Root Vegs',      labelMr: 'मूळ भाज्या',     emoji: '🥕' },
    { id: 'onion',  labelEn: 'Onion & Garlic', labelMr: 'कांदा व लसूण',   emoji: '🧅' },
    { id: 'gourds', labelEn: 'Gourds',         labelMr: 'भोपळे',          emoji: '🥒' },
    { id: 'chilli', labelEn: 'Chilli',         labelMr: 'मिरची',          emoji: '🌶️' },
  ],
  fruits: [
    { id: 'all',      labelEn: 'All',         labelMr: 'सर्व',          emoji: '🍓' },
    { id: 'tropical', labelEn: 'Tropical',    labelMr: 'उष्णकटिबंधीय', emoji: '🥭' },
    { id: 'citrus',   labelEn: 'Citrus',      labelMr: 'लिंबूवर्गीय',   emoji: '🍊' },
    { id: 'seasonal', labelEn: 'Seasonal',    labelMr: 'हंगामी',        emoji: '🍇' },
    { id: 'exotic',   labelEn: 'Exotic',      labelMr: 'विदेशी',        emoji: '🍒' },
    { id: 'dried',    labelEn: 'Dry Fruits',  labelMr: 'सुकामेवा',      emoji: '🥜' },
  ],
  grains: [
    { id: 'all',     labelEn: 'All',          labelMr: 'सर्व',       emoji: '🌾' },
    { id: 'wheat',   labelEn: 'Wheat',        labelMr: 'गहू',        emoji: '🌾' },
    { id: 'rice',    labelEn: 'Rice',         labelMr: 'तांदूळ',     emoji: '🍚' },
    { id: 'millets', labelEn: 'Millets',      labelMr: 'भरड धान्य', emoji: '🌿' },
    { id: 'pulses',  labelEn: 'Pulses & Dal', labelMr: 'डाळी',       emoji: '🫘' },
  ],
  dairy: [
    { id: 'all',    labelEn: 'All',           labelMr: 'सर्व',        emoji: '🥛' },
    { id: 'milk',   labelEn: 'Milk',          labelMr: 'दूध',         emoji: '🥛' },
    { id: 'ghee',   labelEn: 'Ghee & Butter', labelMr: 'तूप व लोणी', emoji: '🧈' },
    { id: 'paneer', labelEn: 'Paneer & Curd', labelMr: 'पनीर व दही', emoji: '🧀' },
  ],
  spices: [
    { id: 'all',    labelEn: 'All',           labelMr: 'सर्व',          emoji: '🌶️' },
    { id: 'whole',  labelEn: 'Whole Spices',  labelMr: 'संपूर्ण मसाले', emoji: '🌰' },
    { id: 'ground', labelEn: 'Ground',        labelMr: 'बारीक',         emoji: '🌶️' },
    { id: 'blends', labelEn: 'Masala Blends', labelMr: 'मसाला मिश्रण', emoji: '🧂' },
    { id: 'herbs',  labelEn: 'Herbs',         labelMr: 'औषधी वनस्पती', emoji: '🌿' },
  ],
};

// ─── Sort options ──────────────────────────────────────────────────────────────

interface SortOption {
  id: string;
  labelEn: string;
  labelMr: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

const SORT_OPTIONS: SortOption[] = [
  { id: 'relevance',  labelEn: 'Relevance',          labelMr: 'प्रासंगिकता',         icon: 'star-outline'          },
  { id: 'price_asc',  labelEn: 'Price: Low → High',  labelMr: 'किंमत: कमी → जास्त', icon: 'trending-up-outline'   },
  { id: 'price_desc', labelEn: 'Price: High → Low',  labelMr: 'किंमत: जास्त → कमी', icon: 'trending-down-outline' },
  { id: 'type',       labelEn: 'Type (A – Z)',        labelMr: 'प्रकार (अ – ज्ञ)',    icon: 'text-outline'          },
  { id: 'rating',     labelEn: 'Customer Ratings',   labelMr: 'ग्राहक रेटिंग',       icon: 'thumbs-up-outline'     },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type FreshFilter  = 'fresh' | 'organic';
type ActivePanel  = 'sort' | 'farmer' | null;

interface FarmerMeta {
  id: number;
  full_name: string;
  district: string;
  rating: number;
  total_ratings: number;
}

// ─── CategoryScreen ────────────────────────────────────────────────────────────

const CategoryScreen: React.FC = () => {
  const { id: categoryId } = useLocalSearchParams<{ id: string }>();
  const { language }       = useLanguage();
  const { addItem }        = useCartStore();
  const { width: sw }      = useWindowDimensions();

  const isDesktop = Platform.OS === 'web' && sw >= BP_DESKTOP;

  const sidebarWidth = isDesktop ? 160 : 76;
  const numCols      = isDesktop ? 3 : 2;
  const containerW   = Math.min(sw, MAX_WIDTH);
  const padH         = isDesktop ? spacing.xl : spacing.sm;
  const gapH         = spacing.sm;
  // subtract: body padding (padH*2) + sidebar width + sidebar marginRight (spacing.xl) + gaps between cols
  const cardWidth    =
    (containerW - sidebarWidth - padH * 2 - spacing.xl - gapH * (numCols - 1)) / numCols;

  // ── Filter state ──────────────────────────────────────────────────────────
  const [activeSubcat,      setActiveSubcat]      = useState('all');
  const [freshFilter,       setFreshFilter]       = useState<FreshFilter>('fresh');
  const [sortBy,            setSortBy]            = useState('relevance');
  const [selectedFarmerId,  setSelectedFarmerId]  = useState<number | null>(null);
  const [activePanel,       setActivePanel]       = useState<ActivePanel>(null);
  const [hoverSubcat,       setHoverSubcat]       = useState<string | null>(null);

  const togglePanel = (panel: ActivePanel) =>
    setActivePanel((p) => (p === panel ? null : panel));

  const catLabel =
    CATEGORY_LABELS[categoryId]?.[language as 'en' | 'mr'] ??
    CATEGORY_LABELS[categoryId]?.en ?? categoryId;

  const subcategories = SUBCATEGORIES[categoryId] ?? [
    { id: 'all', labelEn: 'All', labelMr: 'सर्व', emoji: '🛒' },
  ];

  // ── Unique farmers in this category ──────────────────────────────────────
  const availableFarmers = useMemo<FarmerMeta[]>(() => {
    const seen = new Set<number>();
    const out: FarmerMeta[] = [];
    MOCK_PRODUCTS.filter((p) => p.category === categoryId && p.is_active).forEach((p) => {
      if (!seen.has(p.farmer.id)) {
        seen.add(p.farmer.id);
        out.push({
          id:            p.farmer.id,
          full_name:     p.farmer.full_name,
          district:      p.farmer.district,
          rating:        p.farmer.rating,
          total_ratings: p.farmer.total_ratings,
        });
      }
    });
    return out;
  }, [categoryId]);

  // ── Filtered + sorted products ────────────────────────────────────────────
  const products = useMemo(() => {
    let list = MOCK_PRODUCTS.filter((p) => p.category === categoryId && p.is_active);

    if (freshFilter === 'organic')    list = list.filter((p) => p.is_organic);
    if (selectedFarmerId !== null)    list = list.filter((p) => p.farmer.id === selectedFarmerId);

    switch (sortBy) {
      case 'price_asc':  list = [...list].sort((a, b) => a.price_per_unit - b.price_per_unit); break;
      case 'price_desc': list = [...list].sort((a, b) => b.price_per_unit - a.price_per_unit); break;
      case 'type':       list = [...list].sort((a, b) => a.name_en.localeCompare(b.name_en));  break;
      case 'rating':     list = [...list].sort((a, b) => b.rating - a.rating);                 break;
    }
    return list;
  }, [categoryId, freshFilter, sortBy, selectedFarmerId]);

  const handleAddToCart = useCallback(
    (product: Product) => addItem(product, product.min_order_qty || 1),
    [addItem]
  );

  const activeSortOption  = SORT_OPTIONS.find((s) => s.id === sortBy)!;
  const activeSortLabel   = language === 'mr' ? activeSortOption.labelMr : activeSortOption.labelEn;
  const activeFarmer      = availableFarmers.find((f) => f.id === selectedFarmerId);
  const farmerChipLabel   = activeFarmer
    ? activeFarmer.full_name.split(' ')[0]
    : (language === 'mr' ? 'शेतकरी' : 'Farmer');

  const activeFiltersCount = (freshFilter === 'organic' ? 1 : 0) + (selectedFarmerId ? 1 : 0) + (sortBy !== 'relevance' ? 1 : 0);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const l = (en: string, mr: string) => language === 'mr' ? mr : en;

  // ─────────────────────────────────────────────────────────────────────────
  // FILTER BAR
  // ─────────────────────────────────────────────────────────────────────────

  const FilterBar = (
    <View style={styles.filterWrap}>
      {/* ── Row of controls ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, isDesktop && styles.filterRowDesktop]}
        scrollEnabled={!isDesktop}
      >
        {/* Segmented toggle: All Products | Organic */}
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segBtn, freshFilter === 'fresh' && styles.segBtnActiveFresh]}
            onPress={() => setFreshFilter('fresh')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="grid-outline"
              size={13}
              color={freshFilter === 'fresh' ? '#fff' : colors.primary}
            />
            <Text style={[styles.segLabel, freshFilter === 'fresh' && styles.segLabelActive]}>
              {l('All Products', 'सर्व उत्पादने')}
            </Text>
          </TouchableOpacity>
          <View style={styles.segDivider} />
          <TouchableOpacity
            style={[styles.segBtn, freshFilter === 'organic' && styles.segBtnActiveOrganic]}
            onPress={() => setFreshFilter('organic')}
            activeOpacity={0.85}
          >
            <LeafIcon
              size={13}
              color={freshFilter === 'organic' ? '#fff' : '#16A34A'}
              strokeWidth={2.5}
            />
            <Text style={[styles.segLabel, freshFilter === 'organic' && styles.segLabelActive]}>
              {l('Organic', 'सेंद्रिय')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort By chip */}
        <TouchableOpacity
          style={[styles.chip, activePanel === 'sort' && styles.chipOpen, sortBy !== 'relevance' && styles.chipFiltered]}
          onPress={() => togglePanel('sort')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="swap-vertical-outline"
            size={13}
            color={sortBy !== 'relevance' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.chipLabel, (sortBy !== 'relevance' || activePanel === 'sort') && styles.chipLabelActive]}
            numberOfLines={1}
          >
            {sortBy === 'relevance' ? l('Sort By', 'क्रमवारी') : activeSortLabel}
          </Text>
          <Ionicons
            name={activePanel === 'sort' ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={sortBy !== 'relevance' ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>

        {/* Farmer chip */}
        <TouchableOpacity
          style={[styles.chip, activePanel === 'farmer' && styles.chipOpen, selectedFarmerId !== null && styles.chipFiltered]}
          onPress={() => togglePanel('farmer')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person-outline"
            size={13}
            color={selectedFarmerId !== null ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.chipLabel, (selectedFarmerId !== null || activePanel === 'farmer') && styles.chipLabelActive]}
            numberOfLines={1}
          >
            {farmerChipLabel}
          </Text>
          {selectedFarmerId !== null ? (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); setSelectedFarmerId(null); }}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="close-circle" size={14} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <Ionicons
              name={activePanel === 'farmer' ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.textMuted}
            />
          )}
        </TouchableOpacity>

        {/* Clear all filters */}
        {activeFiltersCount > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { setFreshFilter('fresh'); setSortBy('relevance'); setSelectedFarmerId(null); setActivePanel(null); }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={13} color={colors.error} />
            <Text style={styles.clearLabel}>{l('Clear', 'साफ')}</Text>
          </TouchableOpacity>
        )}

        {/* Product count */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{products.length}</Text>
          <Text style={styles.countUnit}>{l(' items', ' वस्तू')}</Text>
        </View>
      </ScrollView>

      {/* ── Sort panel ── */}
      {activePanel === 'sort' && (
        <View style={[styles.panel, isDesktop && styles.panelDesktop]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{l('SORT BY', 'क्रमवारी')}</Text>
          </View>
          {SORT_OPTIONS.map((opt, idx) => {
            const label      = language === 'mr' ? opt.labelMr : opt.labelEn;
            const isSelected = sortBy === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.panelOption, idx === SORT_OPTIONS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => { setSortBy(opt.id); setActivePanel(null); }}
                activeOpacity={0.75}
              >
                <View style={[styles.panelOptionIcon, isSelected && styles.panelOptionIconActive]}>
                  <Ionicons name={opt.icon} size={15} color={isSelected ? '#fff' : colors.textSecondary} />
                </View>
                <Text style={[styles.panelOptionText, isSelected && styles.panelOptionTextActive]}>
                  {label}
                </Text>
                {isSelected && (
                  <View style={styles.radioFilled}>
                    <View style={styles.radioDot} />
                  </View>
                )}
                {!isSelected && <View style={styles.radioEmpty} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Farmer panel ── */}
      {activePanel === 'farmer' && (
        <View style={[styles.panel, isDesktop && styles.panelDesktop]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{l('SELECT FARMER', 'शेतकरी निवडा')}</Text>
          </View>

          {/* All farmers option */}
          <TouchableOpacity
            style={[styles.panelOption, styles.farmerOption]}
            onPress={() => { setSelectedFarmerId(null); setActivePanel(null); }}
            activeOpacity={0.75}
          >
            <View style={[styles.farmerAvatar, selectedFarmerId === null && styles.farmerAvatarActive]}>
              <Ionicons name="people-outline" size={16} color={selectedFarmerId === null ? '#fff' : colors.textSecondary} />
            </View>
            <View style={styles.farmerInfo}>
              <Text style={[styles.farmerName, selectedFarmerId === null && styles.farmerNameActive]}>
                {l('All Farmers', 'सर्व शेतकरी')}
              </Text>
              <Text style={styles.farmerMeta}>{availableFarmers.length} {l('farmers', 'शेतकरी')}</Text>
            </View>
            {selectedFarmerId === null ? (
              <View style={styles.radioFilled}><View style={styles.radioDot} /></View>
            ) : (
              <View style={styles.radioEmpty} />
            )}
          </TouchableOpacity>

          {availableFarmers.map((farmer, idx) => {
            const isSelected = selectedFarmerId === farmer.id;
            const initial    = farmer.full_name.charAt(0).toUpperCase();
            return (
              <TouchableOpacity
                key={farmer.id}
                style={[
                  styles.panelOption,
                  styles.farmerOption,
                  idx === availableFarmers.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => { setSelectedFarmerId(farmer.id); setActivePanel(null); }}
                activeOpacity={0.75}
              >
                <View style={[styles.farmerAvatar, isSelected && styles.farmerAvatarActive]}>
                  <Text style={[styles.farmerInitial, isSelected && { color: '#fff' }]}>{initial}</Text>
                </View>
                <View style={styles.farmerInfo}>
                  <Text style={[styles.farmerName, isSelected && styles.farmerNameActive]} numberOfLines={1}>
                    {farmer.full_name}
                  </Text>
                  <View style={styles.farmerMetaRow}>
                    <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                    <Text style={styles.farmerMeta}>{farmer.district}</Text>
                    <Text style={styles.farmerMetaDot}>·</Text>
                    <Ionicons name="star" size={10} color={colors.primary} />
                    <Text style={styles.farmerMeta}>{farmer.rating.toFixed(1)} ({farmer.total_ratings})</Text>
                  </View>
                </View>
                {isSelected ? (
                  <View style={styles.radioFilled}><View style={styles.radioDot} /></View>
                ) : (
                  <View style={styles.radioEmpty} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SUBCATEGORY SIDEBAR ITEMS
  // ─────────────────────────────────────────────────────────────────────────

  const renderSubcatItem = (sub: Subcategory) => {
    const label     = language === 'mr' ? sub.labelMr : sub.labelEn;
    const isActive  = activeSubcat === sub.id;
    const isHovered = hoverSubcat === sub.id;

    if (isDesktop) {
      return (
        <Pressable
          key={sub.id}
          style={[
            styles.desktopSidebarItem,
            isActive   && styles.desktopSidebarItemActive,
            isHovered && !isActive && styles.desktopSidebarItemHovered,
            webStyles.clickable,
          ]}
          onPress={() => setActiveSubcat(sub.id)}
          // @ts-ignore
          onMouseEnter={() => setHoverSubcat(sub.id)}
          onMouseLeave={() => setHoverSubcat(null)}
        >
          <Text style={styles.desktopSubcatEmoji}>{sub.emoji}</Text>
          <Text style={[styles.desktopSubcatLabel, isActive && styles.desktopSubcatLabelActive]} numberOfLines={2}>
            {label}
          </Text>
        </Pressable>
      );
    }

    return (
      <TouchableOpacity
        key={sub.id}
        style={[styles.mobileSidebarItem, isActive && styles.mobileSidebarItemActive]}
        onPress={() => setActiveSubcat(sub.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.mobileSidebarEmoji, isActive && styles.mobileSidebarEmojiActive]}>
          <Text style={styles.emojiText}>{sub.emoji}</Text>
        </View>
        <Text style={[styles.mobileSidebarLabel, isActive && styles.mobileSidebarLabelActive]} numberOfLines={2}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUCT GRID
  // ─────────────────────────────────────────────────────────────────────────

  const renderProductItem = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      variant="grid"
      onAddToCart={handleAddToCart}
      style={{ width: cardWidth, marginBottom: gapH }}
    />
  );

  const EmptyState = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🌱</Text>
      <Text style={styles.emptyTitle}>{l('No products found', 'उत्पादने आढळली नाहीत')}</Text>
      <Text style={styles.emptySubtitle}>
        {freshFilter === 'organic'
          ? l('No organic products match your filters', 'सेंद्रिय उत्पादने आढळली नाहीत')
          : l('Try removing some filters', 'फिल्टर काढून पुन्हा प्रयत्न करा')}
      </Text>
      {activeFiltersCount > 0 && (
        <TouchableOpacity
          style={styles.emptyResetBtn}
          onPress={() => { setFreshFilter('fresh'); setSortBy('relevance'); setSelectedFarmerId(null); }}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyResetText}>{l('Clear All Filters', 'सर्व फिल्टर साफ करा')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────────────────

  const Header = (
    <View style={[styles.header, isDesktop && styles.headerDesktop]}>
      <View style={[styles.headerInner, isDesktop && { maxWidth: MAX_WIDTH }]}>
        {!isDesktop && (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, isDesktop && styles.headerTitleDesktop]} numberOfLines={1}>
          {catLabel}
        </Text>
        {activeFiltersCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{activeFiltersCount}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.searchBtn} onPress={() => {}} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT
  // ─────────────────────────────────────────────────────────────────────────

  if (isDesktop) {
    return (
      <View style={styles.container}>
        {Platform.OS !== 'web' && <StatusBar barStyle="dark-content" />}
        {Header}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={[styles.desktopBody, { maxWidth: MAX_WIDTH }]}>
            <View style={[styles.desktopSidebar, { width: sidebarWidth }]}>
              {subcategories.map(renderSubcatItem)}
            </View>
            <View style={styles.desktopMain}>
              {FilterBar}
              {products.length === 0 ? EmptyState : (
                <View style={[styles.desktopGrid, { gap: gapH }]}>
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      variant="grid"
                      onAddToCart={handleAddToCart}
                      style={{ width: cardWidth, marginBottom: gapH }}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE LAYOUT
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />}
      <SafeAreaView style={styles.headerSafe}>{Header}</SafeAreaView>
      <View style={styles.mobileBody}>
        <ScrollView
          style={[styles.mobileSidebar, { width: sidebarWidth }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mobileSidebarContent}
        >
          {subcategories.map(renderSubcatItem)}
        </ScrollView>

        <View style={styles.mobileMain}>
          {FilterBar}
          {products.length === 0 ? EmptyState : (
            <FlatList
              data={products}
              key={`cat-${numCols}`}
              numColumns={numCols}
              renderItem={renderProductItem}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={[styles.mobileGrid, { paddingHorizontal: padH }]}
              columnWrapperStyle={numCols > 1 ? { gap: gapH } : undefined}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default CategoryScreen;

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Header
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerDesktop: {
    position: Platform.OS === 'web' ? ('sticky' as any) : 'relative',
    top: 0, zIndex: 20, ...shadows.sm,
  },
  headerSafe: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
    width: '100%', alignSelf: 'center' as any,
  },
  backBtn:             { padding: spacing.xs, marginRight: spacing.sm },
  headerTitle:         { flex: 1, ...typography.h2, color: colors.textPrimary },
  headerTitleDesktop:  { fontSize: 22 },
  searchBtn:           { padding: spacing.xs, marginLeft: spacing.sm },
  headerBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  headerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // ── Layout
  scrollView: { flex: 1 },
  desktopBody: {
    flexDirection: 'row', width: '100%', alignSelf: 'center' as any,
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl, minHeight: 600,
  },
  desktopSidebar: {
    flexShrink: 0, marginRight: spacing.xl,
    position: Platform.OS === 'web' ? ('sticky' as any) : 'relative',
    top: 80, alignSelf: 'flex-start' as any,
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.xs,
  },
  desktopMain: { flex: 1, minWidth: 0 },
  desktopGrid: { flexDirection: 'row', flexWrap: 'wrap' as any, marginTop: spacing.md },

  mobileBody:          { flex: 1, flexDirection: 'row' },
  mobileSidebar:       { backgroundColor: colors.divider, borderRightWidth: 1, borderRightColor: colors.border },
  mobileSidebarContent:{ paddingVertical: spacing.xs },
  mobileMain:          { flex: 1, backgroundColor: colors.background },
  mobileGrid:          { paddingBottom: spacing.xxl },

  // ── Sidebar items
  desktopSidebarItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  desktopSidebarItemActive:  { borderLeftColor: colors.primary, backgroundColor: colors.primaryPastel },
  desktopSidebarItemHovered: { backgroundColor: colors.divider },
  desktopSubcatEmoji:        { fontSize: 18, width: 24, textAlign: 'center' },
  desktopSubcatLabel:        { ...typography.bodySm, color: colors.textSecondary, fontWeight: '500', flex: 1 },
  desktopSubcatLabelActive:  { color: colors.primary, fontWeight: '700' },

  mobileSidebarItem: {
    alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xs,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  mobileSidebarItemActive:  { backgroundColor: colors.surface, borderLeftColor: colors.primary },
  mobileSidebarEmoji: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4, ...shadows.xs,
  },
  mobileSidebarEmojiActive: { backgroundColor: colors.primaryPastel },
  emojiText:                { fontSize: 20 },
  mobileSidebarLabel:       { fontSize: 10, fontWeight: '500', color: colors.textMuted, textAlign: 'center', lineHeight: 13 },
  mobileSidebarLabelActive: { color: colors.primary, fontWeight: '700' },

  // ══════════════════════════════════════════════════════════════════════════
  // FILTER BAR
  // ══════════════════════════════════════════════════════════════════════════

  filterWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  filterRowDesktop: {
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
  },

  // Segmented toggle
  segmented: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.divider,
  },
  segBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    gap: 5,
  },
  segBtnActiveFresh:   { backgroundColor: colors.primary },
  segBtnActiveOrganic: { backgroundColor: 'rgba(22,163,74,0.92)' },
  segDivider: { width: 1, backgroundColor: colors.border },
  segLabel:   { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  segLabelActive: { color: '#fff' },

  // Filter chips (Sort / Farmer)
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOpen:     { borderColor: colors.primary, backgroundColor: colors.primaryPastel },
  chipFiltered: { borderColor: colors.primary, backgroundColor: colors.primaryPastel + 'CC' },
  chipLabel:    { fontSize: 12, fontWeight: '500', color: colors.textSecondary, maxWidth: 90 },
  chipLabelActive: { color: colors.primary, fontWeight: '700' },

  // Clear button
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.error + '60',
    backgroundColor: colors.errorLight,
  },
  clearLabel: { fontSize: 11, fontWeight: '600', color: colors.error },

  // Product count badge
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto' as any,
    backgroundColor: colors.divider,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  countText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  countUnit: { fontSize: 11, color: colors.textMuted, fontWeight: '400' },

  // ══════════════════════════════════════════════════════════════════════════
  // FILTER PANELS (Sort + Farmer)
  // ══════════════════════════════════════════════════════════════════════════

  panel: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.md,
  },
  panelDesktop: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.lg,
  },
  panelHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.background,
  },
  panelTitle: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  panelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  panelOptionIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  panelOptionIconActive: { backgroundColor: colors.primary },
  panelOptionText:       { flex: 1, ...typography.body, color: colors.textSecondary },
  panelOptionTextActive: { color: colors.primary, fontWeight: '700' },

  // Radio buttons
  radioEmpty: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.border,
  },
  radioFilled: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryPastel,
  },
  radioDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // Farmer panel extras
  farmerOption:     { paddingVertical: spacing.md + 2 },
  farmerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.divider,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border,
  },
  farmerAvatarActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  farmerInitial:      { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  farmerInfo:         { flex: 1, gap: 2 },
  farmerName:         { ...typography.bodySm, fontWeight: '600', color: colors.textPrimary },
  farmerNameActive:   { color: colors.primary },
  farmerMetaRow:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  farmerMeta:         { fontSize: 11, color: colors.textMuted },
  farmerMetaDot:      { fontSize: 11, color: colors.textMuted },

  // ── Empty state
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.huge,
  },
  emptyEmoji:    { fontSize: 48, marginBottom: spacing.md },
  emptyTitle:    { ...typography.h3, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  emptyResetBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full, backgroundColor: colors.primary,
  },
  emptyResetText: { ...typography.buttonSm, color: '#fff' },
});
