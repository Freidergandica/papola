import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Product, CartItem, Deal } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  storeId: string | null;
  appliedDeal: Deal | null;
  discountAmount: number;
  applyDeal: (deal: Deal) => void;
  removeDeal: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [appliedDeal, setAppliedDeal] = useState<Deal | null>(null);

  const addItem = useCallback((product: Product) => {
    // Optimistic UI: update state immediately
    if (storeId && storeId !== product.store_id) {
      setItems([{ ...product, quantity: 1 }]);
      setStoreId(product.store_id);
      setAppliedDeal(null);
      return;
    }

    if (!storeId) setStoreId(product.store_id);

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);
      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...currentItems, { ...product, quantity: 1 }];
    });
  }, [storeId]);

  const removeItem = useCallback((productId: string) => {
    setItems((currentItems) => {
      const newItems = currentItems.filter((item) => item.id !== productId);
      if (newItems.length === 0) {
        setStoreId(null);
        setAppliedDeal(null);
      }
      return newItems;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setStoreId(null);
    setAppliedDeal(null);
  }, []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const applyDeal = useCallback((deal: Deal) => {
    setAppliedDeal(deal);
  }, []);

  const removeDeal = useCallback(() => {
    setAppliedDeal(null);
  }, []);

  const discountAmount = appliedDeal
    ? calculateDiscount(appliedDeal, total)
    : 0;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        storeId,
        appliedDeal,
        discountAmount,
        applyDeal,
        removeDeal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

function calculateDiscount(deal: Deal, subtotal: number): number {
  switch (deal.discount_type) {
    case 'percentage':
      return subtotal * ((deal.discount_value || 0) / 100);
    case 'fixed_amount':
    case 'coupon':
      return Math.min(deal.discount_value || 0, subtotal);
    case 'buy_x_get_y':
      return 0; // Simplified for MVP
    default:
      return 0;
  }
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
