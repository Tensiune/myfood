"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { showSuccess, showError } from "@/utils/toast";

interface CartItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  notes?: string;
}

interface Coupon {
  code: string;
  discount: number; // Porcentagem de 0 a 1
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getDiscountAmount: () => number;
  getItemCount: () => number;
  restaurantId: string | null;
  applyCoupon: (code: string) => void;
  removeCoupon: () => void;
  appliedCoupon: Coupon | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Cupons mockados para teste
const VALID_COUPONS: Record<string, number> = {
  "DYAD10": 0.10,
  "PRIMEIRACOMPRA": 0.15,
  "FOME20": 0.20
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart.items || []);
        setRestaurantId(parsedCart.restaurantId || null);
        setAppliedCoupon(parsedCart.appliedCoupon || null);
      } catch (error) {
        console.error("Failed to parse cart from localStorage", error);
      }
    }
  }, []);

  useEffect(() => {
    if (items.length > 0 || restaurantId) {
      localStorage.setItem("cart", JSON.stringify({ items, restaurantId, appliedCoupon }));
    } else {
      localStorage.removeItem("cart");
    }
  }, [items, restaurantId, appliedCoupon]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity: number) => {
    if (restaurantId && restaurantId !== item.restaurantId) {
      showError("Você só pode adicionar itens de um restaurante por vez. Limpe o carrinho para adicionar itens de outro restaurante.");
      return;
    }

    setRestaurantId(item.restaurantId);

    setItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id);
      if (existingItem) {
        return prevItems.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prevItems, { ...item, quantity }];
    });

    showSuccess(`${quantity}x ${item.name} adicionado(s) ao carrinho!`);
  };

  const removeItem = (itemId: string) => {
    setItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== itemId);
      if (newItems.length === 0) {
        setRestaurantId(null);
        setAppliedCoupon(null);
      }
      return newItems;
    });
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
    setAppliedCoupon(null);
    showSuccess("Carrinho esvaziado!");
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;
    return getSubtotal() * appliedCoupon.discount;
  };

  const getTotal = () => {
    return getSubtotal() - getDiscountAmount();
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  const applyCoupon = (code: string) => {
    const upperCode = code.toUpperCase();
    if (VALID_COUPONS[upperCode]) {
      setAppliedCoupon({ code: upperCode, discount: VALID_COUPONS[upperCode] });
      showSuccess(`Cupom ${upperCode} aplicado com sucesso!`);
    } else {
      showError("Cupom inválido ou expirado.");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showSuccess("Cupom removido.");
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotal,
        getDiscountAmount,
        getItemCount,
        restaurantId,
        applyCoupon,
        removeCoupon,
        appliedCoupon
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};