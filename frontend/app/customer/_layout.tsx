import { Platform, View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../src/store/cartStore';
import { colors } from '../../src/theme';
import { WebNavBar } from '../../src/components/web/WebNavBar';

const isWeb = Platform.OS === 'web';

export default function CustomerLayout() {
  const cartCount = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  return (
    <View style={styles.root}>
      {isWeb && <WebNavBar />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: isWeb
            ? { display: 'none' }
            : { backgroundColor: colors.surface, borderTopColor: colors.border },
        }}
      >
        {/* ── Main tabs ── */}
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'Cart',
            tabBarIcon: ({ color, size }) => (
              <View>
                <Ionicons name="cart-outline" size={size} color={color} />
                {cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {cartCount > 99 ? '99+' : cartCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />

        {/* ── Hidden screens (no tab button) ── */}
        <Tabs.Screen name="search-results" options={{ href: null }} />
        <Tabs.Screen name="product/[id]" options={{ href: null }} />
        <Tabs.Screen name="farmer/[id]" options={{ href: null }} />
        <Tabs.Screen name="checkout" options={{ href: null }} />
        <Tabs.Screen name="order-confirm" options={{ href: null }} />
        <Tabs.Screen name="order/[id]" options={{ href: null }} />
        <Tabs.Screen name="order/[id]/tracking" options={{ href: null }} />
        <Tabs.Screen name="order/[id]/review" options={{ href: null }} />
        <Tabs.Screen name="edit-profile" options={{ href: null }} />
        <Tabs.Screen name="addresses" options={{ href: null }} />
        <Tabs.Screen name="addresses/new" options={{ href: null }} />
        <Tabs.Screen name="addresses/[id]" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="category/[id]" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.accent,
    borderRadius: 9999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
