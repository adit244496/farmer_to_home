import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { EmptyState } from '../../components/common/EmptyState';
import { orderService } from '../../services/order.service';
import { Address } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLabelChip(address: Address): { emoji: string; label: string } {
  const area = (address.area ?? '').toLowerCase();
  const house = (address.house_no ?? '').toLowerCase();
  if (area.includes('home') || house.includes('home')) return { emoji: '🏠', label: 'Home' };
  if (area.includes('work') || area.includes('office')) return { emoji: '💼', label: 'Work' };
  // Fallback: first word of area, or "Other"
  const firstWord = address.area?.split(' ')[0] ?? 'Other';
  return { emoji: '📍', label: firstWord.length > 0 ? firstWord : 'Other' };
}

// ─── Address Card ─────────────────────────────────────────────────────────────

interface AddressCardProps {
  address: Address;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onSetDefault: (id: number) => void;
}

const AddressCard: React.FC<AddressCardProps> = ({ address, onEdit, onDelete, onSetDefault }) => {
  const { emoji, label } = getLabelChip(address);

  const addressLine = [address.house_no, address.area, address.city, address.pin_code, address.state]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[styles.card, address.is_default && styles.cardDefault]}>
      {/* 4 px left accent bar */}
      <View
        style={[
          styles.cardAccentBar,
          { backgroundColor: address.is_default ? colors.primary : 'transparent' },
        ]}
      />

      {/* Top row: label chip + Default badge */}
      <View style={styles.cardTopRow}>
        <View style={styles.labelChip}>
          <Text style={styles.labelChipText}>
            {emoji} {label}
          </Text>
        </View>
        {address.is_default && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>

      {/* Recipient */}
      <Text style={styles.recipientName}>{address.recipient_name}</Text>
      <Text style={styles.recipientPhone}>{address.phone}</Text>

      {/* Address */}
      <Text style={styles.addressText} numberOfLines={2}>
        {addressLine}
      </Text>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.btnEdit}
          onPress={() => onEdit(address.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={13} color={colors.primary} />
          <Text style={styles.btnEditText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnDelete}
          onPress={() => onDelete(address.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={13} color={colors.error} />
          <Text style={styles.btnDeleteText}>Delete</Text>
        </TouchableOpacity>

        {!address.is_default && (
          <TouchableOpacity
            style={styles.btnSetDefault}
            onPress={() => onSetDefault(address.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.btnSetDefaultText}>Set as Default</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ManageAddressesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAddresses = useCallback(async () => {
    try {
      const data = await orderService.getAddresses();
      setAddresses(data);
    } catch {
      Alert.alert('Error', 'Failed to load addresses. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAddresses();
  }, [loadAddresses]);

  const handleEdit = (id: number) => {
    router.push({ pathname: '/customer/address/edit', params: { addressId: String(id) } });
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      t('deleteAddress', 'Delete Address'),
      t('deleteAddressConfirm', 'Are you sure you want to delete this address?'),
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await orderService.deleteAddress(id);
              loadAddresses();
            } catch {
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (id: number) => {
    try {
      await orderService.setDefaultAddress(id);
      loadAddresses();
    } catch {
      Alert.alert('Error', 'Failed to set default address. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('myAddresses', 'My Addresses')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Body ── */}
      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            addresses.length === 0 && styles.listContentEmpty,
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
            <AddressCard
              address={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="map-outline"
              title={t('noAddresses', 'No addresses saved')}
              subtitle={t('addFirstAddress', 'Add your first delivery address')}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.xl }]}
        onPress={() => router.push('/customer/address/add')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color={colors.textInverse} />
      </TouchableOpacity>
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
  },

  /* Loader */
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* List */
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  /* Card */
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    paddingLeft: spacing.lg + 8, // offset for accent bar
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardDefault: {
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  cardAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
  },

  /* Card top row */
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  labelChip: {
    backgroundColor: colors.divider,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  labelChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  defaultBadge: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  defaultBadgeText: {
    ...typography.captionBold,
    color: colors.textInverse,
  },

  /* Recipient */
  recipientName: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  recipientPhone: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  addressText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },

  /* Card actions */
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  btnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  btnEditText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  btnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  btnDeleteText: {
    ...typography.captionBold,
    color: colors.error,
  },
  btnSetDefault: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  btnSetDefaultText: {
    ...typography.captionBold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
