import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  SafeAreaView,
  Platform,
  useWindowDimensions,
  Pressable,
} from 'react-native';

const LOGO = require('../../../assets/logo_eng_white.png');
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows, webStyles } from '../../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LeafIcon } from '../../components/common/LeafIcon';
import { ProductCard } from '../../components/customer/ProductCard';
import { useCartStore } from '../../store/cartStore';
import { useLanguage } from '../../hooks/useLanguage';
import { Product } from '../../types';
import { productService } from '../../services/product.service';

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const BP_DESKTOP = 1024;
const SIDEBAR_WIDTH = 220;
const MAX_CONTENT_WIDTH = 1280;

// ─── Category definitions ─────────────────────────────────────────────────────

type CategoryIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface CategoryDef {
  id: string;
  labelEn: string;
  labelMr: string;
  icon: CategoryIcon;
  iconColor: string;
  iconBg: string;
}

const ALL_CATEGORIES: CategoryDef[] = [
  { id: 'vegetables', labelEn: 'Vegetables', labelMr: 'भाज्या',  icon: 'carrot',     iconColor: '#C2410C', iconBg: '#FFF7ED' },
  { id: 'fruits',     labelEn: 'Fruits',     labelMr: 'फळे',     icon: 'food-apple', iconColor: '#B91C1C', iconBg: '#FEF2F2' },
  { id: 'grains',     labelEn: 'Grains',     labelMr: 'धान्य',   icon: 'barley',     iconColor: '#92400E', iconBg: '#FFFBEB' },
  { id: 'dairy',      labelEn: 'Dairy',      labelMr: 'दुग्ध',   icon: 'cow',        iconColor: '#1D4ED8', iconBg: '#EFF6FF' },
  { id: 'spices',     labelEn: 'Spices',     labelMr: 'मसाले',   icon: 'chili-hot',  iconColor: '#9F1239', iconBg: '#FFF1F2' },
];

// ─── Admin-configurable category display order ────────────────────────────────
// Edit this array to change the default order shown on the home screen.
// The FIRST entry is the default highlighted category in the hero banner.
const ADMIN_CATEGORY_ORDER: string[] = ['grains', 'vegetables', 'fruits', 'dairy', 'spices'];

const CATEGORIES: CategoryDef[] = ADMIN_CATEGORY_ORDER
  .map((id) => ALL_CATEGORIES.find((c) => c.id === id)!)
  .filter(Boolean);

// ─── HomeScreen ───────────────────────────────────────────────────────────────

const HomeScreen: React.FC = () => {
  const { language, toggleLanguage, currentLanguageLabel } = useLanguage();
  const { addItem } = useCartStore();
  const { width: screenWidth } = useWindowDimensions();

  const isDesktop = Platform.OS === 'web' && screenWidth >= BP_DESKTOP;

  const [activeTab,       setActiveTab]       = useState<'farm_fresh' | 'organic'>('farm_fresh');
  const [activeCatId,     setActiveCatId]     = useState<string>(CATEGORIES[0]?.id ?? 'grains');
  const [hoverCatId,      setHoverCatId]      = useState<string | null>(null);
  const [allProducts,     setAllProducts]     = useState<Product[]>([]);
  const [catIconUrls,     setCatIconUrls]     = useState<Record<string, string>>({});

  const scrollRef    = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    productService.searchProducts({ page_size: 100 })
      .then((res) => setAllProducts(res.results ?? []))
      .catch(() => {});
    productService.getCategories()
      .then((cats) => {
        const map: Record<string, string> = {};
        cats.forEach((c) => { if (c.icon_url) map[c.slug] = c.icon_url; });
        setCatIconUrls(map);
      })
      .catch(() => {});
  }, []);

  const handleAddToCart = useCallback(
    (product: Product) => addItem(product, product.min_order_qty || 1),
    [addItem]
  );

  const handleCategoryPress = useCallback((id: string) => {
    router.push(`/customer/category/${id}`);
  }, []);

  // Sidebar click: update highlighted cat + scroll to its section
  const handleSidebarCatClick = useCallback((id: string) => {
    setActiveCatId(id);
    const offset = sectionOffsetsRef.current[id] ?? 0;
    scrollRef.current?.scrollTo({ y: offset - 8, animated: true });
  }, []);

  const getProducts = useCallback(
    (categoryId: string) =>
      allProducts.filter(
        (p) => p.category === categoryId && (activeTab !== 'organic' || p.is_organic)
      ),
    [allProducts, activeTab]
  );

  const activeCat = CATEGORIES.find((c) => c.id === activeCatId) ?? CATEGORIES[0];
  const l = (en: string, mr: string) => language === 'mr' ? mr : en;

  // ── Hero toggle (Farm Fresh / Organic) ────────────────────────────────────
  const HeroToggle = (
    <View style={styles.heroToggle}>
      <TouchableOpacity
        style={[styles.heroToggleBtn, activeTab === 'farm_fresh' && styles.heroToggleBtnFarm]}
        onPress={() => setActiveTab('farm_fresh')}
        activeOpacity={0.85}
      >
        <Ionicons
          name="grid-outline"
          size={14}
          color={activeTab === 'farm_fresh' ? '#fff' : 'rgba(255,255,255,0.8)'}
        />
        <Text style={[styles.heroToggleLabel, activeTab === 'farm_fresh' && styles.heroToggleLabelActive]}>
          {l('All', 'सर्व')}
        </Text>
      </TouchableOpacity>
      <View style={styles.heroToggleDivider} />
      <TouchableOpacity
        style={[styles.heroToggleBtn, activeTab === 'organic' && styles.heroToggleBtnOrganic]}
        onPress={() => setActiveTab('organic')}
        activeOpacity={0.85}
      >
        <LeafIcon
          size={13}
          color={activeTab === 'organic' ? '#fff' : 'rgba(255,255,255,0.8)'}
          strokeWidth={2.5}
        />
        <Text style={[styles.heroToggleLabel, activeTab === 'organic' && styles.heroToggleLabelActive]}>
          {l('Organic', 'सेंद्रिय')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── Desktop sidebar ───────────────────────────────────────────────────────
  const DesktopSidebar = (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarSectionLabel}>{l('BROWSE', 'श्रेणी')}</Text>

      {CATEGORIES.map((cat) => {
        const label     = l(cat.labelEn, cat.labelMr);
        const isActive  = activeCatId === cat.id;
        const isHovered = hoverCatId === cat.id;
        return (
          <Pressable
            key={cat.id}
            style={[
              styles.sidebarCatItem,
              isActive  && styles.sidebarCatItemActive,
              isHovered && !isActive && styles.sidebarCatItemHovered,
              webStyles.clickable,
            ]}
            onPress={() => handleSidebarCatClick(cat.id)}
            // @ts-ignore
            onMouseEnter={() => setHoverCatId(cat.id)}
            onMouseLeave={() => setHoverCatId(null)}
          >
            <View style={[styles.sidebarCatIcon, { backgroundColor: catIconUrls[cat.id] ? '#F5F5F5' : cat.iconBg }]}>
              {catIconUrls[cat.id] ? (
                <Image source={{ uri: catIconUrls[cat.id] }} style={{ width: 22, height: 22, borderRadius: 4 }} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name={cat.icon} size={18} color={cat.iconColor} />
              )}
            </View>
            <Text style={[styles.sidebarCatLabel, isActive && styles.sidebarCatLabelActive]}>
              {label}
            </Text>
            {isActive
              ? <View style={styles.sidebarActiveDot} />
              : <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            }
          </Pressable>
        );
      })}

      <View style={styles.sidebarDivider} />

      <View style={styles.sidebarBadge}>
        <Text style={styles.sidebarBadgeText}>
          🚚 {l('Free delivery over ₹300', '₹३०० वर मोफत डिलिव्हरी')}
        </Text>
      </View>
    </View>
  );

  // ── Desktop product section ───────────────────────────────────────────────
  const renderDesktopSection = (cat: CategoryDef, sectionIndex: number) => {
    const products = getProducts(cat.id);
    if (products.length === 0) return null;
    const label   = l(cat.labelEn, cat.labelMr);
    const preview = products.slice(0, 8);
    // subtract: wrapper horizontal padding (lg*2) + sidebar width + sidebar marginRight (xl)
    const contentW = Math.min(screenWidth, MAX_CONTENT_WIDTH) - spacing.lg * 2 - SIDEBAR_WIDTH - spacing.xl;
    const gap      = spacing.md;
    const cols     = 3;
    const cardW    = (contentW - gap * (cols - 1)) / cols;

    return (
      <View
        key={cat.id}
        style={styles.desktopSection}
        onLayout={(e) => { sectionOffsetsRef.current[cat.id] = e.nativeEvent.layout.y; }}
      >
        {sectionIndex > 0 && <View style={styles.sectionDivider} />}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIconWrap, { backgroundColor: catIconUrls[cat.id] ? '#F5F5F5' : cat.iconBg }]}>
              {catIconUrls[cat.id] ? (
                <Image source={{ uri: catIconUrls[cat.id] }} style={{ width: 26, height: 26, borderRadius: 6 }} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name={cat.icon} size={20} color={cat.iconColor} />
              )}
            </View>
            <View>
              <Text style={styles.sectionTitle}>{label}</Text>
              <Text style={styles.sectionMeta}>
                {products.length} {l('products available', 'उत्पादने उपलब्ध')}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleCategoryPress(cat.id)} style={styles.viewAllBtn} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>{l('View All', 'सर्व पहा')}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.desktopGrid}>
          {preview.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant="grid"
              onAddToCart={handleAddToCart}
              style={{ width: cardW }}
            />
          ))}
        </View>
      </View>
    );
  };

  // ── Mobile horizontal section ─────────────────────────────────────────────
  const renderMobileSection = (cat: CategoryDef) => {
    const products = getProducts(cat.id);
    if (products.length === 0) return null;
    const label = l(cat.labelEn, cat.labelMr);

    return (
      <View key={cat.id} style={styles.section}>
        <View style={[styles.sectionHeader, styles.mobileSectionHeader]}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIconWrap, { backgroundColor: catIconUrls[cat.id] ? '#F5F5F5' : cat.iconBg, width: 30, height: 30, borderRadius: 9 }]}>
              {catIconUrls[cat.id] ? (
                <Image source={{ uri: catIconUrls[cat.id] }} style={{ width: 22, height: 22, borderRadius: 5 }} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name={cat.icon} size={16} color={cat.iconColor} />
              )}
            </View>
            <Text style={styles.sectionTitle}>{label}</Text>
          </View>
          <TouchableOpacity onPress={() => handleCategoryPress(cat.id)} style={styles.viewAllBtn} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>{l('View All', 'सर्व पहा')}</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant="horizontal"
              onAddToCart={handleAddToCart}
              style={styles.horizontalCard}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && <StatusBar barStyle="light-content" backgroundColor={colors.primary} />}

      {/* Mobile header */}
      {Platform.OS !== 'web' && (
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <Image source={LOGO} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/customer/notifications')} activeOpacity={0.8}>
                <Ionicons name="bell-outline" size={22} color="#fff" />
                <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.languageToggle} onPress={toggleLanguage} activeOpacity={0.8}>
                <Text style={styles.languageToggleText}>{currentLanguageLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* ── Desktop layout ── */}
      {isDesktop ? (
        <ScrollView ref={scrollRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={[styles.desktopWrapper, { maxWidth: MAX_CONTENT_WIDTH }]}>
            {DesktopSidebar}

            <View style={styles.desktopContent}>
              {/* ── Hero banner ── */}
              <View style={styles.heroBanner}>
                {/* Title row: title on left, toggle on right */}
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroTitle}>
                    {l('Fresh, Organic & Pure Food', 'ताजे, सेंद्रिय आणि शुद्ध अन्न')}
                  </Text>
                  {HeroToggle}
                </View>

                {/* Tag line (single line) */}
                <Text style={styles.heroTag}>
                  {'🌾 '}{l('Direct from Farm to Your Home', 'थेट शेतातून तुमच्या घरापर्यंत')}
                  {'  ·  ✅ '}{l('100% Quality Assured', '१००% गुणवत्ता हमी')}
                  {'  ·  ✅ '}{l('Farmer-Fair Price', 'शेतकरी-उचित किंमत')}
                </Text>
              </View>

              {CATEGORIES.map((cat, idx) => renderDesktopSection(cat, idx))}
              <View style={styles.bottomPad} />
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ── Mobile / tablet layout ── */
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/customer/search')} activeOpacity={0.85}>
              <Ionicons name="search-outline" size={18} color={colors.primary} />
              <Text style={styles.searchPlaceholder}>
                {l('Search vegetables, fruits...', 'भाज्या, फळे शोधा...')}
              </Text>
              <Ionicons name="mic-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Farm Fresh / Organic Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.togglePill, styles.togglePillLeft, activeTab === 'farm_fresh' && styles.togglePillFarm]}
              onPress={() => setActiveTab('farm_fresh')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="grid-outline"
                size={17}
                color={activeTab === 'farm_fresh' ? '#fff' : colors.primary}
              />
              <Text style={[styles.toggleLabel, activeTab === 'farm_fresh' && styles.toggleLabelActive]}>
                {l('All Products', 'सर्व उत्पादने')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.togglePill, styles.togglePillRight, activeTab === 'organic' && styles.togglePillActiveOrganic]}
              onPress={() => setActiveTab('organic')}
              activeOpacity={0.85}
            >
              <LeafIcon
                size={15}
                color={activeTab === 'organic' ? '#fff' : '#16A34A'}
                strokeWidth={2.5}
              />
              <Text style={[styles.toggleLabel, activeTab === 'organic' && styles.toggleLabelActive]}>
                {l('Organic', 'सेंद्रिय')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category chips */}
          <Text style={styles.shopByCategoryLabel}>{l('Shop by Category', 'श्रेणीनुसार खरेदी करा')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => {
              const label = l(cat.labelEn, cat.labelMr);
              return (
                <TouchableOpacity key={cat.id} style={styles.categoryChip} onPress={() => handleCategoryPress(cat.id)} activeOpacity={0.8}>
                  <View style={[styles.categoryIconBg, { backgroundColor: cat.iconBg }]}>
                    <MaterialCommunityIcons name={cat.icon} size={26} color={cat.iconColor} />
                  </View>
                  <Text style={styles.categoryChipLabel} numberOfLines={1}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.divider} />

          {CATEGORIES.map(renderMobileSection)}
          <View style={styles.bottomPad} />
        </ScrollView>
      )}
    </View>
  );
};

export default HomeScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Mobile header
  headerSafeArea: { backgroundColor: colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary,
  },
  headerLogo:  { width: 130, height: 44 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn:     { position: 'relative', padding: spacing.xs },
  badge: {
    position: 'absolute', top: 0, right: 0, width: 16, height: 16,
    borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  badgeText:    { color: '#fff', fontSize: 9, fontWeight: '700' },
  languageToggle: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)',
  },
  languageToggleText: { ...typography.captionBold, color: '#fff' },

  // ── Shared scroll
  scrollView: { flex: 1 },

  // ── Desktop layout
  desktopWrapper: {
    width: '100%', alignSelf: 'center' as any,
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.xl,
    minHeight: '100%' as any,
  },

  // ── Desktop sidebar
  sidebar: {
    width: SIDEBAR_WIDTH, flexShrink: 0, marginRight: spacing.xl,
    position: Platform.OS === 'web' ? ('sticky' as any) : 'relative',
    top: Platform.OS === 'web' ? 80 : 0,
    alignSelf: 'flex-start' as any,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.card,
  },
  sidebarDivider:      { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  sidebarSectionLabel: { ...typography.label, color: colors.textMuted, paddingHorizontal: spacing.xs, marginBottom: spacing.sm },
  sidebarCatItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 10,
    borderRadius: borderRadius.lg, marginBottom: 2,
  },
  sidebarCatItemActive:  { backgroundColor: colors.primaryPastel },
  sidebarCatItemHovered: { backgroundColor: colors.background },
  sidebarCatIcon:        { width: 34, height: 34, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  sidebarCatLabel:       { ...typography.body, color: colors.textPrimary, flex: 1, fontWeight: '500' as const },
  sidebarCatLabelActive: { color: colors.primary, fontWeight: '700' as const },
  sidebarActiveDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  sidebarBadge: {
    backgroundColor: colors.accentPastel, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.accentLight + '50',
    marginTop: spacing.xs,
  },
  sidebarBadgeText: { ...typography.captionBold, color: colors.accentDark, textAlign: 'center' },

  // ── Desktop main content
  desktopContent: { flex: 1, minWidth: 0 },
  desktopSection: { marginBottom: spacing.xxl },
  sectionDivider: { height: 1, backgroundColor: colors.divider, marginBottom: spacing.xxl },
  desktopGrid:    { flexDirection: 'row', flexWrap: 'wrap' as any, gap: spacing.md },

  // ── Hero banner ────────────────────────────────────────────────────────────
  heroBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xl + spacing.md,
    gap: spacing.md,
    ...Platform.select({
      web: { boxShadow: '0 6px 28px rgba(15,118,110,0.32)' } as any,
      default: shadows.lg,
    }),
  },

  // Top row: [active category label] + [toggle]
  heroTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg,
  },
  heroCatLabel: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  heroCatIcon: {
    width: 30, height: 30, borderRadius: borderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  heroCatName: {
    fontSize: 15, fontWeight: '700' as const, color: '#fff', letterSpacing: 0.2,
  },

  // Toggle pill inside hero
  heroToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  heroToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 7,
  },
  heroToggleBtnFarm:    { backgroundColor: 'rgba(255,255,255,0.22)' },
  heroToggleBtnOrganic: { backgroundColor: 'rgba(22,163,74,0.92)' },
  heroToggleDivider:    { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  heroToggleLabel:      { fontSize: 12, fontWeight: '500' as const, color: 'rgba(255,255,255,0.75)' },
  heroToggleLabelActive:{ color: '#fff', fontWeight: '700' as const },

  // Hero body
  heroTitle: { fontSize: 24, fontWeight: '800' as const, color: '#fff', letterSpacing: -0.4, flex: 1, lineHeight: 30 },
  heroTag:   { fontSize: 12.5, color: 'rgba(255,255,255,0.78)', lineHeight: 19, letterSpacing: 0.1 },

  // ── Shared section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryPastel,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionIconWrap:   { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:      { ...typography.h2, color: colors.textPrimary },
  sectionMeta:       { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '500' as const },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 5, paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryPastel, borderRadius: borderRadius.full,
  },
  viewAllText: { fontSize: 12, fontWeight: '700' as const, color: colors.primary },

  // ── Mobile section
  section:            { marginBottom: spacing.xl },
  mobileSectionHeader:{ marginHorizontal: spacing.lg },
  horizontalScroll:   { paddingLeft: spacing.lg, paddingRight: spacing.md },
  horizontalCard:     { marginRight: spacing.md },

  // ── Mobile search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.full,
    marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 11,
    gap: spacing.sm, borderWidth: 1.5, borderColor: colors.border, ...shadows.sm,
  },
  searchPlaceholder: { flex: 1, ...typography.body, color: colors.textMuted },

  // ── Mobile toggle
  toggleContainer: {
    flexDirection: 'row', marginHorizontal: spacing.lg,
    marginTop: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.xxl,
    padding: 4, ...shadows.card,
    borderWidth: 1, borderColor: colors.border,
  },
  togglePill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: spacing.sm, borderRadius: borderRadius.xl, gap: spacing.xs,
  },
  togglePillLeft:         { marginRight: 2 },
  togglePillRight:        { marginLeft: 2 },
  togglePillFarm:         { backgroundColor: colors.primary, ...shadows.sm },
  togglePillActiveOrganic:{ backgroundColor: 'rgba(22,163,74,0.92)', ...shadows.sm },
  toggleLabel:            { ...typography.buttonSm, color: colors.textMuted },
  toggleLabelActive:      { color: '#fff', fontWeight: '700' as const },

  // ── Mobile category chips
  shopByCategoryLabel: {
    ...typography.h3, color: colors.textPrimary,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.xs,
  },
  categoryScroll:    { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  categoryChip:      { alignItems: 'center', width: 76 },
  categoryIconBg: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center', marginBottom: 7, ...shadows.card,
    borderWidth: 1, borderColor: colors.border,
  },
  categoryChipLabel: { fontSize: 12, color: colors.textPrimary, textAlign: 'center', fontWeight: '600' as const },

  // ── Mobile divider
  divider:   { height: 8, backgroundColor: colors.background, marginVertical: spacing.sm },
  bottomPad: { height: spacing.xxl * 2 },
});
