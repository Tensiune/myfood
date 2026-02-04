"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

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
  discount: number; 
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
  deliveryType: "delivery" | "pickup";
  setDeliveryType: (type: "delivery" | "pickup") => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const VALID_COUPONS: Record<string, number> = {
  "DYAD10": 0.10,
  "PRIMEIRACOMPRA": 0.15,
  "FOME20": 0.20
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const savedCart = localStorage.getItem(`cart_${user.id}`);
        if (savedCart) {
          try {
            const parsed = JSON.parse(savedCart);
            setItems(parsed.items || []);
            setRestaurantId(parsed.restaurantId || null);
            setAppliedCoupon(parsed.appliedCoupon || null);
            setDeliveryType(parsed.deliveryType || "delivery");
          } catch (error) {
            console.error("Erro ao carregar carrinho", error);
          }
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userId) {
      if (items.length > 0 || restaurantId) {
        localStorage.setItem(`cart_${userId}`, JSON.stringify({ items, restaurantId, appliedCoupon, deliveryType }));
      } else {
        localStorage.removeItem(`cart_${userId}`);
      }
    }
  }, [items, restaurantId, appliedCoupon, deliveryType, userId]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity: number) => {
    if (restaurantId && restaurantId !== item.restaurantId) {
      showError("Você só pode adicionar itens de um restaurante por vez.");
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

    showSuccess(`${quantity}x ${item.name} adicionado(s)!`);
  };

  const removeItem = (itemId: string) => {
    setItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== itemId);
      if (newItems.length === 0) {
        setRestaurantId(null);
        setAppliedCoupon(null);
        setDeliveryType("delivery");
      }
      return newItems;
    });
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
    setAppliedCoupon(null);
    setDeliveryType("delivery");
  };

  const getSubtotal = () => items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const getDiscountAmount = () => appliedCoupon ? getSubtotal() * appliedCoupon.discount : 0;
  const getTotal = () => getSubtotal() - getDiscountAmount();
  const getItemCount = () => items.reduce((count, item) => count + item.quantity, 0);

  const applyCoupon = (code: string) => {
    const upperCode = code.toUpperCase();
    if (VALID_COUPONS[upperCode]) {
      setAppliedCoupon({ code: upperCode, discount: VALID_COUPONS[upperCode] });
      showSuccess(`Cupom ${upperCode} aplicado!`);
    } else {
      showError("Cupom inválido.");
    }
  };

  const removeCoupon = () => setAppliedCoupon(null);

  return (
    <CartContext.Provider value={{ 
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
      appliedCoupon,
      deliveryType,
      setDeliveryType
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) throw new Error("useCart deve ser usado dentro de um CartProvider");
  return context;
};