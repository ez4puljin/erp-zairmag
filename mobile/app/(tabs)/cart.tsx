import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useCreateOrder } from '@/src/hooks/use-orders';
import { useCartStore } from '@/src/store/cart';
import type { CartItem } from '@/src/types';
import { unitLabel } from '@/src/utils/unit-label';

import { getImageUrl } from '@/src/lib/image-url';

export default function CartScreen() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const toggleUnitMode = useCartStore((s) => s.toggleUnitMode);
  const clear = useCartStore((s) => s.clear);
  const total = useCartStore((s) => s.total());

  const createOrder = useCreateOrder();

  const handleOrder = () => {
    if (items.length === 0) return;

    Alert.alert(
      'Захиалга баталгаажуулах',
      `Нийт ${items.length} бүтээгдэхүүн\n${total.toLocaleString()}₮`,
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Захиалах',
          onPress: async () => {
            try {
              await createOrder.mutateAsync(
                items.map((item) => ({
                  productId: item.product.id,
                  quantity: item.quantity,
                })),
              );
              clear();
              Alert.alert(
                'Амжилттай',
                'Захиалга амжилттай илгээгдлээ',
                [{ text: 'OK', onPress: () => router.push('/(tabs)/orders') }],
              );
            } catch {
              // Error handled in hook
            }
          },
        },
      ],
    );
  };

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const lineTotal = item.product.sellingPrice * item.quantity;

    return (
      <CartItemRow
        item={item}
        lineTotal={lineTotal}
        onUpdateQuantity={(qty) => updateQuantity(item.product.id, item.unitMode, qty)}
        onRemove={() => removeItem(item.product.id, item.unitMode)}
        onToggleUnit={() => toggleUnitMode(item.product.id, item.unitMode)}
      />
    );
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={72} color="#D1D1D6" />
        <Text style={styles.emptyTitle}>Сагс хоосон байна</Text>
        <Text style={styles.emptySubtitle}>
          Бүтээгдэхүүн нэмэхийн тулд каталог руу очно уу
        </Text>
        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => router.push('/(tabs)/products')}
        >
          <Text style={styles.browseBtnText}>Каталог үзэх</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderCartItem}
        keyExtractor={(item) => `${item.product.id}_${item.unitMode}`}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.bottomSheet}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Нийт ({items.length} бүтээгдэхүүн)
          </Text>
          <Text style={styles.summaryTotal}>{total.toLocaleString()}₮</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.orderButton,
            createOrder.isPending && styles.orderButtonDisabled,
          ]}
          onPress={handleOrder}
          disabled={createOrder.isPending}
          activeOpacity={0.8}
        >
          {createOrder.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
              <Text style={styles.orderButtonText}>Захиалга өгөх</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CartItemRow({
  item,
  lineTotal,
  onUpdateQuantity,
  onRemove,
  onToggleUnit,
}: {
  item: CartItem;
  lineTotal: number;
  onUpdateQuantity: (qty: number) => void;
  onRemove: () => void;
  onToggleUnit: () => void;
}) {
  const [editText, setEditText] = useState(String(item.quantity));
  const [isEditing, setIsEditing] = useState(false);

  const handleEndEditing = () => {
    setIsEditing(false);
    const parsed = parseInt(editText, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      onUpdateQuantity(parsed);
      setEditText(String(parsed));
    } else {
      setEditText(String(item.quantity));
    }
  };

  if (!isEditing && editText !== String(item.quantity)) {
    setEditText(String(item.quantity));
  }

  const isBox = item.unitMode === 'BOX';

  return (
    <View style={styles.cartItem}>
      <View style={styles.itemRow}>
        <View style={styles.imageBox}>
          {item.product.imageUrl ? (
            <Image
              source={{ uri: getImageUrl(item.product.imageUrl) ?? '' }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="ice-cream-outline" size={24} color="#d1d5db" />
          )}
        </View>

        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.product.name}
          </Text>
          <Text style={styles.itemUnitPrice}>
            {item.product.sellingPrice.toLocaleString()}₮ / {unitLabel(item.product.unit)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <View style={styles.quantityRow}>
        {/* Unit mode toggle */}
        <TouchableOpacity
          style={[styles.unitBadge, isBox ? styles.unitBadgeBox : styles.unitBadgePiece]}
          onPress={onToggleUnit}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isBox ? 'cube-outline' : 'ellipse-outline'}
            size={14}
            color={isBox ? '#007AFF' : '#FF9500'}
          />
          <Text style={[styles.unitBadgeText, isBox ? styles.unitBadgeTextBox : styles.unitBadgeTextPiece]}>
            {isBox ? 'Хайрцаг' : 'Ширхэг'}
          </Text>
        </TouchableOpacity>

        <View style={styles.stepperAndTotal}>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => {
                const newQty = item.quantity - 1;
                if (newQty >= 1) {
                  onUpdateQuantity(newQty);
                  setEditText(String(newQty));
                }
              }}
            >
              <Ionicons name="remove" size={18} color="#007AFF" />
            </TouchableOpacity>

            <TextInput
              style={styles.qtyInput}
              value={editText}
              onChangeText={(text) => {
                setIsEditing(true);
                setEditText(text.replace(/[^0-9]/g, ''));
              }}
              onEndEditing={handleEndEditing}
              onBlur={handleEndEditing}
              keyboardType="number-pad"
              selectTextOnFocus
              maxLength={5}
            />

            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => {
                const newQty = item.quantity + 1;
                onUpdateQuantity(newQty);
                setEditText(String(newQty));
              }}
            >
              <Ionicons name="add" size={18} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.lineTotal}>{lineTotal.toLocaleString()}₮</Text>
        </View>
      </View>
    </View>
  );
}

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 64;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  listContent: { padding: 16, paddingBottom: 140 },
  cartItem: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  imageBox: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 12 },
  itemImage: { width: 50, height: 50 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 2 },
  itemUnitPrice: { fontSize: 13, color: '#8E8E93' },
  removeBtn: { padding: 6 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5EA' },
  unitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  unitBadgeBox: {
    backgroundColor: '#EBF5FF',
    borderColor: '#007AFF',
  },
  unitBadgePiece: {
    backgroundColor: '#FFF8EB',
    borderColor: '#FF9500',
  },
  unitBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unitBadgeTextBox: {
    color: '#007AFF',
  },
  unitBadgeTextPiece: {
    color: '#FF9500',
  },
  stepperAndTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 10 },
  stepperBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  qtyInput: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    minWidth: 48,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  lineTotal: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginTop: 16 },
  emptySubtitle: { fontSize: 15, color: '#8E8E93', marginTop: 6, textAlign: 'center' },
  browseBtn: { marginTop: 24, backgroundColor: '#007AFF', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  browseBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  summaryLabel: { fontSize: 15, color: '#8E8E93' },
  summaryTotal: { fontSize: 22, fontWeight: '700', color: '#1C1C1E' },
  orderButton: { backgroundColor: '#34C759', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  orderButtonDisabled: { opacity: 0.6 },
  orderButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
});
