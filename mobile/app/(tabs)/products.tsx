import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useCategories, useProducts } from '@/src/hooks/use-products';
import { useCartStore } from '@/src/store/cart';
import type { Product } from '@/src/types';
import { unitLabel } from '@/src/utils/unit-label';

import { getImageUrl } from '@/src/lib/image-url';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function ProductsScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );
  const [unitMode, setUnitMode] = useState<'BOX' | 'PIECE'>('BOX');

  const { data: categoriesData } = useCategories();
  const {
    data: productsData,
    isLoading,
    refetch,
    isRefetching,
  } = useProducts(selectedCategory, search || undefined);
  const addItem = useCartStore((s) => s.addItem);

  const categories = categoriesData ?? [];
  const products = productsData?.data ?? [];

  const handleAddToCart = useCallback(
    (product: Product) => {
      addItem(product, 1, unitMode);
    },
    [addItem, unitMode],
  );

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => {
      const outOfStock = item.stockAvailable <= 0;

      return (
        <View style={styles.productCard}>
          <View style={styles.imageContainer}>
            {item.imageUrl ? (
              <Image
                source={{ uri: getImageUrl(item.imageUrl) ?? '' }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="ice-cream-outline" size={36} color="#d1d5db" />
              </View>
            )}
            {outOfStock && (
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockText}>Дууссан</Text>
              </View>
            )}
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.categoryLabel}>{item.category.name}</Text>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productPrice}>
              {item.sellingPrice.toLocaleString()}₮
            </Text>
            <Text style={styles.unitLabelText}>/ {unitLabel(item.unit)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              outOfStock && styles.addButtonDisabled,
            ]}
            onPress={() => handleAddToCart(item)}
            disabled={outOfStock}
            activeOpacity={0.7}
          >
            <Ionicons
              name={outOfStock ? 'ban-outline' : 'add'}
              size={22}
              color={outOfStock ? '#9ca3af' : '#ffffff'}
            />
          </TouchableOpacity>
        </View>
      );
    },
    [handleAddToCart],
  );

  const renderSkeleton = () => (
    <View style={styles.gridContainer}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonInfo}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, styles.skeletonShort]} />
            <View style={[styles.skeletonLine, styles.skeletonMedium]} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#9ca3af"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Бүтээгдэхүүн хайх..."
          placeholderTextColor="#9ca3af"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Unit Mode Toggle */}
      <View style={styles.unitToggleContainer}>
        <View style={styles.unitToggle}>
          <TouchableOpacity
            style={[
              styles.unitToggleBtn,
              unitMode === 'BOX' && styles.unitToggleBtnActive,
            ]}
            onPress={() => setUnitMode('BOX')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cube-outline"
              size={16}
              color={unitMode === 'BOX' ? '#ffffff' : '#3C3C43'}
            />
            <Text
              style={[
                styles.unitToggleText,
                unitMode === 'BOX' && styles.unitToggleTextActive,
              ]}
            >
              Хайрцаг
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitToggleBtn,
              unitMode === 'PIECE' && styles.unitToggleBtnActive,
            ]}
            onPress={() => setUnitMode('PIECE')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="ellipse-outline"
              size={16}
              color={unitMode === 'PIECE' ? '#ffffff' : '#3C3C43'}
            />
            <Text
              style={[
                styles.unitToggleText,
                unitMode === 'PIECE' && styles.unitToggleTextActive,
              ]}
            >
              Ширхэг
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(undefined)}
          >
            <Text
              style={[
                styles.categoryChipText,
                !selectedCategory && styles.categoryChipTextActive,
              ]}
            >
              Бүгд
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === cat.id ? undefined : cat.id,
                )
              }
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product Grid */}
      {isLoading && !isRefetching ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>Бүтээгдэхүүн олдсонгүй</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1C1C1E',
  },
  unitToggleContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 3,
  },
  unitToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  unitToggleBtnActive: {
    backgroundColor: '#007AFF',
  },
  unitToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3C3C43',
  },
  unitToggleTextActive: {
    color: '#ffffff',
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3C3C43',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: '#F2F2F7',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  productInfo: {
    padding: 10,
  },
  categoryLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#007AFF',
  },
  unitLabelText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: -2,
  },
  addButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#E5E5EA',
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: '#E5E5EA',
  },
  skeletonInfo: {
    padding: 10,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: 6,
    width: '100%',
  },
  skeletonShort: {
    width: '50%',
  },
  skeletonMedium: {
    width: '70%',
  },
});
