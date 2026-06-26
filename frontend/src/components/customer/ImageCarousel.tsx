import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductImage } from '../../types';
import { colors, borderRadius } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCarouselProps {
  images: ProductImage[] | string[];
  height?: number;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  height = 300,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Normalize: accept both ProductImage[] and string[]
  const imageUrls: string[] = images.map((img) =>
    typeof img === 'string' ? img : (img as ProductImage).image_url
  );

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <View style={styles.placeholderIconCircle}>
          <Ionicons name="leaf-outline" size={48} color={colors.primaryLight} />
        </View>
      </View>
    );
  }

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const goToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  };

  return (
    <View style={{ height, position: 'relative' }}>
      <FlatList
        ref={flatListRef}
        data={imageUrls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, idx) => String(idx)}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width: SCREEN_WIDTH, height }}
            resizeMode="cover"
          />
        )}
      />

      {/* Dot indicators */}
      {imageUrls.length > 1 && (
        <View style={styles.dotsContainer}>
          {imageUrls.map((_, idx) => {
            const isActive = idx === activeIndex;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => goToIndex(idx)}
                style={[styles.dot, isActive && styles.dotActive]}
                activeOpacity={0.8}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primaryPastel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});
