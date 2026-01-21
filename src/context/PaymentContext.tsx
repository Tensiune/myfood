"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CreditCard {
  id: string;
  brand: "visa" | "mastercard" | "amex";
  lastFour: string;
  expiry: string;
  holderName: string;
}

interface PaymentContextType {
  savedCards: CreditCard[];
  addCard: (card: Omit<CreditCard, "id">) => void;
  removeCard: (id: string) => void;
  selectedPaymentId: string | null;
  setSelectedPaymentId: (id: string | null) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedCards, setSavedCards] = useState<CreditCard[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>("pix");

  useEffect(() => {
    const saved = localStorage.getItem("paymentMethods");
    if (saved) {
      try {
        setSavedCards(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar métodos de pagamento", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("paymentMethods", JSON.stringify(savedCards));
  }, [savedCards]);

  const addCard = (card: Omit<CreditCard, "id">) => {
    const newCard = { ...card, id: Date.now().toString() };
    setSavedCards(prev => [...prev, newCard]);
    setSelectedPaymentId(newCard.id);
  };

  const removeCard = (id: string) => {
    setSavedCards(prev => prev.filter(c => c.id !== id));
    if (selectedPaymentId === id) setSelectedPaymentId("pix");
  };

  return (
    <PaymentContext.Provider value={{ savedCards, addCard, removeCard, selectedPaymentId, setSelectedPaymentId }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) throw new Error("usePayment deve ser usado dentro de um PaymentProvider");
  return context;
};