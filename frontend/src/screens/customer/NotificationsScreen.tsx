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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { EmptyState } from '../../components/common/EmptyState';
import apiClient from '../../utils/api';
import { Notification } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// ─── Type config ──────────────────────────────────────────────────────────────

type NotifType = Notification['type'];

interface TypeConfig {
  iconBg: string;
  iconColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TYPE_CONFIG: Record<NotifType, TypeConfig> = {
  order: {
    iconBg: colors.primaryPastel,
    iconColor: colors.primary,
    icon: 'bag-outline',
  },
  promotion: {
    iconBg: colors.accentPastel,
    iconColor: colors.accent,
    icon: 'pricetag-outline',
  },
  alert: {
    iconBg: colors.errorLight,
    iconColor: colors.error,
    icon: 'alert-circle-outline',
  },
  system: {
    iconBg: colors.errorLight,
    iconColor: colors.error,
    icon: 'alert-circle-outline',
  },
  farmer: {
    iconBg: colors.successLight,
    iconColor: colors.success,
    icon: 'person-outline',
  },
};

function getTypeConfig(type: NotifType): TypeConfig {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.system;
}

// ─── Notification Card ────────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification;
  onPress: (id: number) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ notification, onPress }) => {
  const cfg = getTypeConfig(notification.type);
  const unread = !notification.is_read;

  return (
    <TouchableOpacity
      style={[styles.card, unread && styles.cardUnread]}
      onPress={() => onPress(notification.id)}
      activeOpacity={0.82}
    >
      {/* Left accent bar for unread */}
      {unread && <View style={styles.unreadBar} />}

      <View style={styles.cardInner}>
        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: cfg.iconBg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {notification.title}
            </Text>
            <Text style={styles.cardTime}>{timeAgo(notification.created_at)}</Text>
          </View>
          <Text style={styles.cardBody} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const loadNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get<Notification[]>('/notifications/');
      setNotifications(response.data);
    } catch {
      // Silently fail; user can pull to refresh
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  // ── Mark read ─────────────────────────────────────────────────────────────

  const handleMarkRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await apiClient.patch(`/notifications/${id}/read/`);
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await apiClient.patch('/notifications/mark-all-read/');
    } catch {
      // Reload on failure to reconcile state
      loadNotifications();
    }
  }, [loadNotifications]);

  const handleCardPress = (id: number) => {
    const notif = notifications.find((n) => n.id === id);
    if (notif && !notif.is_read) {
      handleMarkRead(id);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('notifications', 'Notifications')}</Text>

        {hasUnread ? (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markAllText}>{t('markAllRead', 'Mark All Read')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* ── Body ── */}
      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <NotificationCard notification={item} onPress={handleCardPress} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title={t('noNotifications', 'No notifications')}
              subtitle={t('allCaughtUp', "You're all caught up!")}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textInverse,
    flex: 1,
    marginLeft: spacing.sm,
  },
  markAllBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  markAllText: {
    ...typography.captionBold,
    color: colors.primaryPastel,
  },

  /* Loader */
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* List */
  listContent: {
    paddingVertical: spacing.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 72 + spacing.lg,
  },

  /* Card */
  card: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: 'relative',
  },
  cardUnread: {
    backgroundColor: colors.accentPastel,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.accent,
    borderTopRightRadius: borderRadius.xs,
    borderBottomRightRadius: borderRadius.xs,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 3,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    flex: 1,
  },
  cardTime: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 0,
    marginTop: 1,
  },
  cardBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default NotificationsScreen;
