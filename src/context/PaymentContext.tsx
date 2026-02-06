"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type PaymentMethodType = 
  | "pix" 
  | "card_credit_online" 
  | "card_debit_online" 
  | "card_credit_delivery" 
  | "card_debit_delivery" 
  | "pix_delivery"
  | "meal_voucher_delivery"
  | "cash_delivery"
  | "mercadopago"; // Adicionado

export interface CreditCard {
  id: string;
  brand: string;
  lastFour: string;
  expiry: string;
  holderName: string;
  type: "credit" | "debit";
}

interface PaymentContextType {
  savedCards: CreditCard[];
  addCard: (card: Omit<CreditCard, "id">) => void;
  removeCard: (id: string) => void;
  selectedPaymentType: PaymentMethodType;
  setSelectedPaymentType: (type: PaymentMethodType) => void;
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  selectedFlagId: string | null;
  setSelectedFlagId: (id: string | null) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedCards, setSavedCards] = useState<CreditCard[]>(() => {
    const saved = localStorage.getItem("paymentMethods");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao carregar cartões", e);
      }
    }
    return [];
  });

  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentMethodType>("pix");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("paymentMethods", JSON.stringify(savedCards));
  }, [savedCards]);

  const addCard = (card: Omit<CreditCard, "id">) => {
    const newCard = { ...card, id: Date.now().toString() };
    setSavedCards(prev => [...prev, newCard]);
    setSelectedCardId(newCard.id);
    setSelectedPaymentType(card.type === "credit" ? "card_credit_online" : "card_debit_online");
  };

  const removeCard = (id: string) => {
    setSavedCards(prev => prev.filter(c => c.id !== id));
    if (selectedCardId === id) {
      setSelectedCardId(null);
      setSelectedPaymentType("pix");
    }
  };

  return (
    <PaymentContext.Provider value={{ 
      savedCards, 
      addCard, 
      removeCard, 
      selectedPaymentType, 
      setSelectedPaymentType,
      selectedCardId,
      setSelectedCardId,
      selectedFlagId,
      setSelectedFlagId
    }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) throw new Error("usePayment deve ser usado dentro de um PaymentProvider");
  return context;
};