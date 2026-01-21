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

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  restaurantId: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Carregar carrinho do localStorage ao iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart.items || []);
        setRestaurantId(parsedCart.restaurantId || null);
      } catch (error) {
        console.error("Failed to parse cart from localStorage", error);
      }
    }
  }, []);

  // Salvar carrinho no localStorage sempre que mudar
  useEffect(() => {
    if (items.length > 0 || restaurantId) {
      localStorage.setItem("cart", JSON.stringify({ items, restaurantId }));
    } else {
      localStorage.removeItem("cart");
    }
  }, [items, restaurantId]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity: number) => {
    // Verificar se é do mesmo restaurante
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
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
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
    showSuccess("Carrinho esvaziado!");
  };

  const getTotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
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
        getItemCount,
        restaurantId
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