import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const POPULAR_SEARCHES = ['टोमॅटो', 'आंबा', 'Organic Vegetables', 'Fresh Milk', 'बटाटा'];
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT = 6;

const CATEGORY_CHIPS = [
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'fruits',     label: 'Fruits' },
  { id: 'grains',     label: 'Grains' },
  { id: 'dairy',      label: 'Dairy' },
  { id: 'spices',     label: 'Spices' },
];

// ─── SearchScreen ─────────────────────────────────────────────────────────────

const SearchScreen: React.FC = () => {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<TextInput>(null);

  // ── Load recents on mount ────────────────────────────────────────────────────
  useEffect(() => {
    loadRecentSearches();
    // Auto-focus the input after mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadRecentSearches = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Silent fail — recents are non-critical
    }
  }, []);

  // ── Save a search term ────────────────────────────────────────────────────────
  const saveSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;

      const filtered = recentSearches.filter((r) => r !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);
      setRecentSearches(updated);

      try {
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Silent fail
      }
    },
    [recentSearches]
  );

  // ── Navigate to results ────────────────────────────────────────────────────────
  const navigateToResults = useCallback(
    (term: string, category?: string) => {
      const q = term.trim();
      if (!q && !category) return;

      if (q) saveSearch(q);

      router.push({
        pathname: '/customer/search-results',
        params: {
          q: q || '',
          ...(category ? { category } : {}),
        },
      });
    },
    [saveSearch]
  );

  const handleSubmit = useCallback(() => {
    navigateToResults(query);
  }, [query, navigateToResults]);

  const handleRecentPress = useCallback(
    (term: string) => {
      setQuery(term);
      navigateToResults(term);
    },
    [navigateToResults]
  );

  const handlePopularPress = useCallback(
    (term: string) => {
      setQuery(term);
      navigateToResults(term);
    },
    [navigateToResults]
  );

  const handleCategoryPress = useCallback(
    (categoryId: string) => {
      navigateToResults('', categoryId);
    },
    [navigateToResults]
  );

  // ── Remove a single recent item ────────────────────────────────────────────────
  const removeRecentItem = useCallback(
    async (term: string) => {
      const updated = recentSearches.filter((r) => r !== term);
      setRecentSearches(updated);
      try {
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Silent fail
      }
    },
    [recentSearches]
  );

  // ── Clear all recents ──────────────────────────────────────────────────────────
  const clearAllRecents = useCallback(async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Silent fail
    }
  }, []);

  // ── Render recent item ─────────────────────────────────────────────────────────
  const renderRecentItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.recentRow}
      onPress={() => handleRecentPress(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="time-outline" size={16} color={colors.textMuted} />
      <Text style={styles.recentText} numberOfLines={1}>
        {item}
      </Text>
      <TouchableOpacity
        onPress={() => removeRecentItem(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // ── Main render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />}

      {/* ── Header — mobile only; WebNavBar handles search on web ── */}
      {Platform.OS !== 'web' && (
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="search-outline"
              size={16}
              color={colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Search for vegetables, fruits..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSubmit}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Body ── */}
      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* On web, show a centered search input (WebNavBar doesn't carry a text field) */}
        {Platform.OS === 'web' && (
          <View style={styles.webSearchRow}>
            <View style={styles.inputWrapper}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Search for vegetables, fruits..."
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSubmit}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.sectionTitle}>Recent Searches</Text>
              </View>
              <TouchableOpacity onPress={clearAllRecents} activeOpacity={0.7}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={recentSearches}
              renderItem={renderRecentItem}
              keyExtractor={(item) => `recent-${item}`}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
          </View>
        )}

        {/* Popular Searches */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trending-up-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Popular Searches</Text>
          </View>
          <View style={styles.chipsRow}>
            {POPULAR_SEARCHES.map((term) => (
              <TouchableOpacity
                key={term}
                style={styles.popularChip}
                onPress={() => handlePopularPress(term)}
                activeOpacity={0.75}
              >
                <Text style={styles.popularChipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Chips */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="grid-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Browse by Category</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsScroll}
          >
            {CATEGORY_CHIPS.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryChip}
                onPress={() => handleCategoryPress(cat.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.categoryChipText}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

export default SearchScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
    ...shadows.xs,
  },
  backBtn: {
    padding: spacing.xs,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
  },
  inputIcon: {
    marginRight: 2,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },

  // Body
  body: {
    flex: 1,
  },
  webSearchRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  clearAllText: {
    ...typography.captionBold,
    color: colors.primary,
  },

  // Recent row
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  recentText: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: spacing.xl + spacing.sm,
  },

  // Popular chips (wrap)
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    ...shadows.xs,
  },
  popularChipText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },

  // Category chips (horizontal scroll, teal outline)
  categoryChipsScroll: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  categoryChip: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surface,
  },
  categoryChipText: {
    ...typography.buttonSm,
    color: colors.primary,
  },

  bottomPad: {
    height: spacing.huge,
  },
});
