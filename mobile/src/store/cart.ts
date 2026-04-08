import { create } from 'zustand';
import type { CartItem, Product } from '../types';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, unitMode?: 'BOX' | 'PIECE') => void;
  removeItem: (productId: string, unitMode: 'BOX' | 'PIECE') => void;
  updateQuantity: (productId: string, unitMode: 'BOX' | 'PIECE', quantity: number) => void;
  toggleUnitMode: (productId: string, currentUnitMode: 'BOX' | 'PIECE') => void;
  clear: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product: Product, quantity: number = 1, unitMode: 'BOX' | 'PIECE' = 'BOX') => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.product.id === product.id && item.unitMode === unitMode,
      );

      if (existingIndex >= 0) {
        const updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + quantity,
        };
        return { items: updatedItems };
      }

      return { items: [...state.items, { product, quantity, unitMode }] };
    });
  },

  removeItem: (productId: string, unitMode: 'BOX' | 'PIECE') => {
    set((state) => ({
      items: state.items.filter(
        (item) => !(item.product.id === productId && item.unitMode === unitMode),
      ),
    }));
  },

  updateQuantity: (productId: string, unitMode: 'BOX' | 'PIECE', quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId, unitMode);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId && item.unitMode === unitMode
          ? { ...item, quantity }
          : item,
      ),
    }));
  },

  toggleUnitMode: (productId: string, currentUnitMode: 'BOX' | 'PIECE') => {
    const newMode = currentUnitMode === 'BOX' ? 'PIECE' : 'BOX';
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId && item.unitMode === currentUnitMode
          ? { ...item, unitMode: newMode }
          : item,
      ),
    }));
  },

  clear: () => {
    set({ items: [] });
  },

  total: () => {
    return get().items.reduce(
      (sum, item) => sum + item.product.sellingPrice * item.quantity,
      0,
    );
  },

  itemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
