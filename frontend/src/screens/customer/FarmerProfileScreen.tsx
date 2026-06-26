import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { ProductCard } from '../../components/customer/ProductCard';
import { farmerService } from '../../services/farmer.service';
import { useCartStore } from '../../store/cartStore';
import { useLanguage } from '../../hooks/useLanguage';
import { Farmer, Product } from '../../types';
import { MOCK_FARMERS, MOCK_PRODUCTS } from '../../data/mockData';

// ─── Constants ────────────────────────────────────────────────────────────────

const HEADER_HEIGHT = 220;
const MAX_WIDTH     = 900;

// ─── Mock review data (per-farmer) ───────────────────────────────────────────

const MOCK_REVIEWS: Record<number, { id: number; customer: string; rating: number; comment: string; ago: string }[]> = {
  1: [
    { id: 1, customer: 'Priya S.',  rating: 5, comment: 'Tomatoes were beautifully red and juicy — like freshly pulled from the vine!', ago: '2 days ago' },
    { id: 2, customer: 'Amit K.',   rating: 4, comment: 'Onions were firm and very pungent. Will definitely reorder.', ago: '1 week ago' },
    { id: 3, customer: 'Sonal M.', rating: 4, comment: 'Grapes came well-packaged and sweet. Quick delivery too.', ago: '2 weeks ago' },
  ],
  2: [
    { id: 1, customer: 'Ramesh D.', rating: 5, comment: 'Spinach was incredibly fresh — still looked freshly cut. Great taste in sabzi.', ago: '3 days ago' },
    { id: 2, customer: 'Meera J.',  rating: 5, comment: 'Best chilli I\'ve tasted. Very aromatic without being too hot.', ago: '1 week ago' },
    { id: 3, customer: 'Anita P.',  rating: 4, comment: 'Turmeric rhizomes are potent. Colour is deep yellow. Impressed!', ago: '3 weeks ago' },
  ],
  3: [
    { id: 1, customer: 'Kiran B.',  rating: 5, comment: 'Devgad Hapus are truly the king of mangoes. No carbide, naturally ripe — unbelievable aroma!', ago: '5 days ago' },
    { id: 2, customer: 'Nisha T.', rating: 5, comment: 'Been buying from Vijay for 2 seasons. Consistency is unmatched.', ago: '1 week ago' },
    { id: 3, customer: 'Sunil R.',  rating: 5, comment: 'Absolutely worth the price. Pre-ordered for next season already!', ago: '2 weeks ago' },
  ],
  4: [
    { id: 1, customer: 'Deepa V.',  rating: 5, comment: 'Jowar bhakri from this jowar is soft and fragrant. Heritage variety makes a real difference.', ago: '4 days ago' },
    { id: 2, customer: 'Raj M.',   rating: 4, comment: 'Brown rice cooks perfectly and has a nice nutty flavour. Very nutritious.', ago: '2 weeks ago' },
    { id: 3, customer: 'Lata N.',   rating: 5, comment: 'Finally found a good source of Lokwan wheat. Stone-ground atta turns out excellent.', ago: '1 month ago' },
  ],
  5: [
    { id: 1, customer: 'Tanvi H.', rating: 5, comment: 'A2 milk from Gir cows is thick and sweet — my children love it. No artificial smell at all.', ago: '1 day ago' },
    { id: 2, customer: 'Vinod S.', rating: 5, comment: 'The bilona ghee has that old-school taste I remember from childhood. Worth every rupee.', ago: '1 week ago' },
    { id: 3, customer: 'Pooja G.', rating: 4, comment: 'Milk quality is excellent. Ghee takes 2 days to arrive which is expected for perishables.', ago: '3 weeks ago' },
  ],
};

// Mock rating distribution (% for each star)
const RATING_DIST: Record<number, number[]> = {
  1: [2, 5, 11, 34, 48],   // index 0 = 1★, index 4 = 5★
  2: [1, 3,  8, 28, 60],
  3: [0, 1,  4, 18, 77],
  4: [2, 4, 10, 32, 52],
  5: [1, 2,  8, 27, 62],
};

// ─── FarmerProfileScreen ─────────────────────────────────────────────────────

export function FarmerProfileScreen() {
  const { id }              = useLocalSearchParams<{ id: string }>();
  const insets              = useSafeAreaInsets();
  const { getLocalizedText, language } = useLanguage();
  const addItem             = useCartStore((s) => s.addItem);
  const { width: sw }       = useWindowDimensions();
  const isDesktop           = Platform.OS === 'web' && sw >= 900;

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({ rating: 0, orders: 0, products: 0 });

  const [farmer,    setFarmer]    = useState<Farmer | null>(null);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const farmerId = Number(id);
  const isMr = language === 'mr';
  const l = (en: string, mr: string) => isMr ? mr : en;

  useEffect(() => {
    if (!farmerId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [farmerData, productsData] = await Promise.all([
          farmerService.getPublicFarmerProfile(farmerId),
          farmerService.getFarmerProducts(farmerId, { status: 'active', page_size: 20, page: 1 }),
        ]);
        setFarmer(farmerData);
        setProducts(productsData.results);
      } catch {
        const mockFarmer = MOCK_FARMERS.find((f) => f.id === farmerId);
        if (mockFarmer) {
          setFarmer(mockFarmer);
          setProducts(MOCK_PRODUCTS.filter((p) => p.farmer.id === farmerId));
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [farmerId]);

  const scrollTo = useCallback((section: 'rating' | 'orders' | 'products') => {
    const offset = sectionOffsets.current[section] ?? 0;
    scrollRef.current?.scrollTo({ y: offset - 12, animated: true });
  }, []);

  const handleAddToCart = (product: Product) => addItem(product, product.min_order_qty || 1);

  const memberYear   = farmer?.member_since ? new Date(farmer.member_since).getFullYear() : '—';
  const reviews      = MOCK_REVIEWS[farmerId] ?? [];
  const ratingDist   = RATING_DIST[farmerId]  ?? [2, 5, 12, 35, 46];
  const cardW        = isDesktop
    ? (Math.min(sw, MAX_WIDTH) - spacing.lg * 2 - spacing.md) / 2
    : (sw - spacing.lg * 2 - spacing.sm) / 2;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!farmer) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{l('Farmer not found', 'शेतकरी आढळला नाही')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonFallback}>
          <Text style={styles.backButtonFallbackText}>{l('Go Back', 'परत जा')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} bounces>

        {/* ─────────────────────────── HERO HEADER ─────────────────────────── */}
        <View style={styles.headerArea}>
          <View style={styles.headerBg} />
          <View style={styles.headerOverlay} />

          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + spacing.sm }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerIdentity}>
            <View style={styles.avatarWrapper}>
              {farmer.profile_photo ? (
                <Image source={{ uri: farmer.profile_photo }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={36} color="rgba(255,255,255,0.6)" />
                </View>
              )}
            </View>
            <Text style={styles.headerName}>{farmer.full_name}</Text>
            <Text style={styles.headerLocation}>{farmer.village}, {farmer.district}</Text>
          </View>
        </View>

        {/* ──────────────────────── CONTENT CARD ───────────────────────────── */}
        <View style={[styles.contentCard, isDesktop && { maxWidth: MAX_WIDTH, alignSelf: 'center' as any, width: '100%' }]}>

          {/* ── Clickable stats row ── */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => scrollTo('rating')} activeOpacity={0.75}>
              <Ionicons name="star" size={14} color={colors.primary} style={{ marginBottom: 2 }} />
              <Text style={styles.statValue}>{farmer.rating > 0 ? farmer.rating.toFixed(1) : '—'}</Text>
              <Text style={styles.statSubLabel}>{l('Rating', 'रेटिंग')}</Text>
              <Text style={styles.statTap}>{l('tap to see', 'पहा')}</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity style={styles.statItem} onPress={() => scrollTo('orders')} activeOpacity={0.75}>
              <Ionicons name="bag-check-outline" size={14} color={colors.primary} style={{ marginBottom: 2 }} />
              <Text style={styles.statValue}>{farmer.total_orders_fulfilled.toLocaleString()}</Text>
              <Text style={styles.statSubLabel}>{l('Orders', 'ऑर्डर')}</Text>
              <Text style={styles.statTap}>{l('tap to see', 'पहा')}</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity style={styles.statItem} onPress={() => scrollTo('products')} activeOpacity={0.75}>
              <Ionicons name="storefront-outline" size={14} color={colors.primary} style={{ marginBottom: 2 }} />
              <Text style={styles.statValue}>{products.length}</Text>
              <Text style={styles.statSubLabel}>{l('Products', 'उत्पादने')}</Text>
              <Text style={styles.statTap}>{l('tap to see', 'पहा')}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Info chips ── */}
          <View style={styles.chipsRow}>
            <View style={styles.infoChip}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.infoChipText}>{l('Member since', 'सदस्य')} {memberYear}</Text>
            </View>
            {farmer.farm_size_acres > 0 && (
              <View style={styles.infoChip}>
                <Ionicons name="expand-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.infoChipText}>{farmer.farm_size_acres} {l('acres', 'एकर')}</Text>
              </View>
            )}
          </View>

          {/* ── Produce types ── */}
          {farmer.produce_types?.length > 0 && (
            <View style={styles.produceRow}>
              <Text style={styles.produceLabel}>{l('Produce:', 'उत्पादन:')}</Text>
              <View style={styles.produceChips}>
                {farmer.produce_types.map((type, i) => (
                  <View key={i} style={styles.produceChip}>
                    <Text style={styles.produceChipText}>{type}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Bio ── */}
          {(farmer.farm_description || farmer.bio) && (
            <View style={styles.bioSection}>
              <View style={styles.bioTitleRow}>
                <Ionicons name="leaf-outline" size={16} color={colors.primary} />
                <Text style={styles.bioTitle}>{l('About', 'माहिती')}</Text>
              </View>
              <Text style={styles.bioText}>{farmer.farm_description || farmer.bio}</Text>
            </View>
          )}

          {/* ══════════════════════ RATING SECTION ══════════════════════════ */}
          <View
            style={styles.sectionAnchor}
            onLayout={(e) => { sectionOffsets.current.rating = e.nativeEvent.layout.y; }}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="star" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>{l('Customer Reviews', 'ग्राहक अभिप्राय')}</Text>
                <Text style={styles.sectionMeta}>
                  {farmer.total_ratings.toLocaleString()} {l('verified ratings', 'पडताळलेले रेटिंग')}
                </Text>
              </View>
            </View>

            {/* Star breakdown */}
            <View style={styles.ratingBreakdown}>
              {/* Big score */}
              <View style={styles.ratingScoreBlock}>
                <Text style={styles.ratingScore}>{farmer.rating.toFixed(1)}</Text>
                <View style={styles.ratingStarsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= Math.round(farmer.rating) ? 'star' : 'star-outline'}
                      size={16}
                      color="#F59E0B"
                    />
                  ))}
                </View>
                <Text style={styles.ratingScoreSub}>
                  {farmer.total_ratings.toLocaleString()} {l('ratings', 'रेटिंग')}
                </Text>
              </View>

              {/* Bar chart */}
              <View style={styles.ratingBars}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const pct = ratingDist[star - 1] ?? 0;
                  return (
                    <View key={star} style={styles.ratingBarRow}>
                      <Text style={styles.ratingBarLabel}>{star}</Text>
                      <Ionicons name="star" size={10} color="#F59E0B" />
                      <View style={styles.ratingBarTrack}>
                        <View style={[styles.ratingBarFill, { width: `${pct}%` as any }]} />
                      </View>
                      <Text style={styles.ratingBarPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Reviews list */}
            {reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{r.customer.charAt(0)}</Text>
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewCustomer}>{r.customer}</Text>
                    <View style={styles.reviewStarsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={11} color="#F59E0B" />
                      ))}
                      <Text style={styles.reviewAgo}>{r.ago}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{r.comment}</Text>
              </View>
            ))}
          </View>

          {/* ══════════════════════ ORDERS SECTION ══════════════════════════ */}
          <View
            style={styles.sectionAnchor}
            onLayout={(e) => { sectionOffsets.current.orders = e.nativeEvent.layout.y; }}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="bag-check-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>{l('Orders & Reliability', 'ऑर्डर व विश्वासार्हता')}</Text>
                <Text style={styles.sectionMeta}>{l('Track record since', 'पासून')}{' '}{memberYear}</Text>
              </View>
            </View>

            <View style={styles.ordersGrid}>
              {[
                { icon: 'checkmark-circle-outline' as const, value: farmer.total_orders_fulfilled.toLocaleString(), label: l('Orders Fulfilled', 'ऑर्डर पूर्ण'), color: colors.success },
                { icon: 'time-outline'              as const, value: '96%',    label: l('On-Time Delivery', 'वेळेवर डिलिव्हरी'),  color: colors.primary },
                { icon: 'refresh-circle-outline'   as const, value: '< 1%',   label: l('Return Rate', 'परतावा दर'),               color: '#F59E0B'      },
                { icon: 'shield-checkmark-outline' as const, value: l('Verified', 'सत्यापित'), label: l('Farmer Account', 'शेतकरी खाते'), color: colors.info },
              ].map((stat) => (
                <View key={stat.label} style={styles.orderStatCard}>
                  <View style={[styles.orderStatIcon, { backgroundColor: stat.color + '18' }]}>
                    <Ionicons name={stat.icon} size={22} color={stat.color} />
                  </View>
                  <Text style={styles.orderStatValue}>{stat.value}</Text>
                  <Text style={styles.orderStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Timeline milestones */}
            <View style={styles.milestoneRow}>
              {[
                { year: memberYear,                      label: l('Joined', 'सामील') },
                { year: String(Number(memberYear) + 1),  label: l('First 50 orders', 'पहिले ५०') },
                { year: String(Number(memberYear) + 2),  label: l('Top Seller', 'शीर्ष विक्रेता') },
              ].map((m, i, arr) => (
                <React.Fragment key={i}>
                  <View style={styles.milestone}>
                    <View style={styles.milestoneDot} />
                    <Text style={styles.milestoneYear}>{m.year}</Text>
                    <Text style={styles.milestoneLabel}>{m.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.milestoneLine} />}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* ══════════════════════ PRODUCTS SECTION ════════════════════════ */}
          <View
            style={styles.sectionAnchor}
            onLayout={(e) => { sectionOffsets.current.products = e.nativeEvent.layout.y; }}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="storefront-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>
                  {l('Products by', 'उत्पादने')} {farmer.full_name.split(' ')[0]}
                </Text>
                <Text style={styles.sectionMeta}>
                  {products.length} {l('items available', 'वस्तू उपलब्ध')}
                </Text>
              </View>
            </View>

            {products.length === 0 ? (
              <View style={styles.emptyProducts}>
                <Ionicons name="leaf-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyProductsText}>{l('No products listed yet', 'अद्याप कोणतेही उत्पादन नाही')}</Text>
              </View>
            ) : (
              <View style={styles.productGrid}>
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    variant="grid"
                    onAddToCart={handleAddToCart}
                    style={{ width: cardW }}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={{ height: spacing.huge }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  loadingContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText:       { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  backButtonFallback: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.md },
  backButtonFallbackText: { ...typography.button, color: '#fff' },

  // ── Header
  headerArea: { height: HEADER_HEIGHT, position: 'relative', overflow: 'hidden' },
  headerBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: colors.primary },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.primaryDark, opacity: 0.45 },
  backButton: {
    position: 'absolute', left: spacing.lg, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  headerIdentity: { position: 'absolute', bottom: -40, left: 0, right: 0, alignItems: 'center' },
  avatarWrapper: {
    width: 86, height: 86, borderRadius: 43,
    borderWidth: 3, borderColor: '#fff', overflow: 'hidden',
    backgroundColor: colors.primaryDark, ...shadows.md,
  },
  avatar:            { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark },
  headerName: {
    ...typography.h2, color: '#fff', marginTop: spacing.xs,
    ...Platform.select({
      web:     { textShadow: '0 1px 3px rgba(0,0,0,0.4)' } as any,
      default: { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    }),
  },
  headerLocation: {
    ...typography.bodySm, color: 'rgba(255,255,255,0.82)',
    ...Platform.select({
      web:     { textShadow: '0 1px 2px rgba(0,0,0,0.3)' } as any,
      default: { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    }),
  },

  // ── Content card
  contentCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    marginTop: -spacing.xl,
    paddingTop: 52,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.sm,
  },

  // ── Stats row
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryPastel,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  statItem:     { flex: 1, alignItems: 'center', gap: 1, paddingVertical: 4 },
  statValue:    { ...typography.h3, color: colors.primaryDark },
  statSubLabel: { ...typography.caption, color: colors.textMuted },
  statTap:      { fontSize: 9, color: colors.primary, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.4, marginTop: 2 },
  statDivider:  { width: 1, height: 40, backgroundColor: colors.border },

  // ── Info chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' as any, gap: spacing.sm, marginBottom: spacing.md },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.divider, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  infoChipText: { ...typography.caption, color: colors.textSecondary },

  // ── Produce types
  produceRow: { flexDirection: 'row', flexWrap: 'wrap' as any, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  produceLabel:    { ...typography.captionBold, color: colors.textSecondary },
  produceChips:    { flexDirection: 'row', flexWrap: 'wrap' as any, gap: spacing.xs },
  produceChip:     { backgroundColor: colors.primaryPastel, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: colors.primaryLight },
  produceChipText: { ...typography.captionBold, color: colors.primaryDark },

  // ── Bio
  bioSection:   { marginBottom: spacing.lg, backgroundColor: colors.divider, borderRadius: borderRadius.md, padding: spacing.md },
  bioTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  bioTitle:     { ...typography.h4, color: colors.textPrimary },
  bioText:      { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  // ── Shared section anchor
  sectionAnchor: { marginTop: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  sectionIconWrap:  { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.primaryPastel, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:     { ...typography.h3, color: colors.textPrimary },
  sectionMeta:      { fontSize: 12, color: colors.textMuted, marginTop: 1 },

  // ── Rating section
  ratingBreakdown: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md },
  ratingScoreBlock:{ alignItems: 'center', justifyContent: 'center', width: 90 },
  ratingScore:     { fontSize: 48, fontWeight: '800' as const, color: colors.textPrimary, lineHeight: 56 },
  ratingStarsRow:  { flexDirection: 'row', gap: 2, marginVertical: 4 },
  ratingScoreSub:  { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  ratingBars:      { flex: 1, gap: 6, justifyContent: 'center' },
  ratingBarRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingBarLabel:  { fontSize: 12, color: colors.textSecondary, width: 10, textAlign: 'center' },
  ratingBarTrack:  { flex: 1, height: 6, backgroundColor: colors.divider, borderRadius: 3, overflow: 'hidden' },
  ratingBarFill:   { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  ratingBarPct:    { fontSize: 11, color: colors.textMuted, width: 32, textAlign: 'right' },

  // Reviews
  reviewCard:   { backgroundColor: colors.divider, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 14, fontWeight: '700' as const, color: '#fff' },
  reviewMeta:       { flex: 1 },
  reviewCustomer:   { ...typography.captionBold, color: colors.textPrimary },
  reviewStarsRow:   { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  reviewAgo:        { fontSize: 10, color: colors.textMuted, marginLeft: 6 },
  reviewComment:    { ...typography.bodySm, color: colors.textSecondary, lineHeight: 18 },

  // ── Orders section
  ordersGrid: {
    flexDirection: 'row', flexWrap: 'wrap' as any, gap: spacing.sm,
    marginBottom: spacing.md,
  },
  orderStatCard: {
    flex: 1, minWidth: 130,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border, ...shadows.xs,
  },
  orderStatIcon:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  orderStatValue:  { ...typography.h3, color: colors.textPrimary },
  orderStatLabel:  { fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  // Milestones
  milestoneRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, marginTop: spacing.sm },
  milestone:     { alignItems: 'center', minWidth: 72 },
  milestoneDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginBottom: 6 },
  milestoneLine: { flex: 1, height: 2, backgroundColor: colors.primaryPastel, marginBottom: 28 },
  milestoneYear: { fontSize: 12, fontWeight: '700' as const, color: colors.primary, textAlign: 'center' },
  milestoneLabel:{ fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 2 },

  // ── Products section
  productGrid: { flexDirection: 'row', flexWrap: 'wrap' as any, gap: spacing.sm },
  emptyProducts: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.sm },
  emptyProductsText: { ...typography.body, color: colors.textMuted },
});
