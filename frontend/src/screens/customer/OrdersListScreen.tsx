import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { OrderCard } from '../../components/customer/OrderCard';
import { EmptyState } from '../../components/common/EmptyState';
import { orderService } from '../../services/order.service';
import { Order } from '../../types';

type TabKey = 'all' | 'active' | 'delivered' | 'cancelled';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: string;
  emptyTitle: string;
  emptySubtitle?: string;
  statusFilter?: string;
}

const TABS: TabConfig[] = [
  {
    key: 'all',
    label: 'All',
    icon: 'bag-outline',
    emptyTitle: 'No orders yet',
    emptySubtitle: 'Start shopping to see your orders here',
    statusFilter: undefined,
  },
  {
    key: 'active',
    label: 'Active',
    icon: 'time-outline',
    emptyTitle: 'No active orders',
    emptySubtitle: "You don't have any active orders",
    statusFilter: 'pending,confirmed,packed,dispatched',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: 'checkmark-circle-outline',
    emptyTitle: 'No delivered orders',
    statusFilter: 'delivered,completed',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    icon: 'close-circle-outline',
    emptyTitle: 'No cancelled orders',
    statusFilter: 'cancelled',
  },
];

const PAGE_SIZE = 10;

export function OrdersListScreen() {
  const { t } = useTranslation('orders');
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;

  const loadOrders = useCallback(
    async (pageNum: number, replace: boolean) => {
      try {
        if (pageNum === 1 && !replace) {
          setIsLoading(true);
        } else if (pageNum > 1) {
          setLoadingMore(true);
        }

        const response = await orderService.getOrders({
          status: activeTabConfig.statusFilter,
          page: pageNum,
          page_size: PAGE_SIZE,
        });

        const newOrders = response.results ?? [];

        setOrders((prev) => (replace || pageNum === 1 ? newOrders : [...prev, ...newOrders]));
        setHasMore(!!response.next);
        setPage(pageNum);
      } catch (_err) {
        // silent — user can pull-to-refresh
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTabConfig.statusFilter],
  );

  // Reload from page 1 whenever tab changes
  useEffect(() => {
    setOrders([]);
    setPage(1);
    setHasMore(true);
    loadOrders(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(1, true);
    setRefreshing(false);
  }, [loadOrders]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore || isLoading) return;
    loadOrders(page + 1, false);
  }, [hasMore, loadingMore, isLoading, page, loadOrders]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon={activeTabConfig.icon}
        title={activeTabConfig.emptyTitle}
        subtitle={activeTabConfig.emptySubtitle}
        ctaLabel={activeTab === 'all' ? t('browseProducts', 'Browse Products') : undefined}
        onCta={activeTab === 'all' ? () => router.push('/customer/home') : undefined}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('myOrders', 'My Orders')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <OrderCard order={item} style={styles.orderCard} />}
          contentContainerStyle={[
            styles.listContent,
            orders.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textInverse,
    fontWeight: '700',
    flex: 1,
  },
  headerSpacer: {
    width: 24,
  },

  // ── Tab Bar ──────────────────────────────────────────────────────────────────
  tabBarContainer: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabBarContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  tabTextActive: {
    ...typography.label,
    color: colors.textInverse,
    fontWeight: '700',
  },

  // ── Loading ──────────────────────────────────────────────────────────────────
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  listContentEmpty: {
    flex: 1,
  },
  orderCard: {
    marginBottom: spacing.sm,
  },
});
