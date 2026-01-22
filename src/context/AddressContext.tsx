"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface Address {
  id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  type: "home" | "work" | "other";
  isDefault: boolean;
}

interface AddressContextType {
  addresses: Address[];
  selectedAddress: Address | null;
  addAddress: (address: Omit<Address, "id">) => void;
  updateAddress: (id: string, address: Partial<Address>) => void;
  removeAddress: (id: string) => void;
  selectAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export const AddressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const saved = localStorage.getItem(`addresses_${user.id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setAddresses(parsed);
            const defaultAddr = parsed.find((a: Address) => a.isDefault) || parsed[0];
            setSelectedAddress(defaultAddr || null);
          } catch (e) {
            console.error("Erro ao carregar endereços", e);
          }
        }
      } else {
        setAddresses([]);
        setSelectedAddress(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userId) {
      localStorage.setItem(`addresses_${userId}`, JSON.stringify(addresses));
    }
  }, [addresses, userId]);

  const addAddress = (addr: Omit<Address, "id">) => {
    const newAddr = { ...addr, id: Date.now().toString() };
    if (newAddr.isDefault) {
      setAddresses(prev => prev.map(a => ({ ...a, isDefault: false })).concat(newAddr));
      setSelectedAddress(newAddr);
    } else {
      setAddresses(prev => [...prev, newAddr]);
      if (!selectedAddress) setSelectedAddress(newAddr);
    }
  };

  const updateAddress = (id: string, updates: Partial<Address>) => {
    setAddresses(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
    if (selectedAddress?.id === id) {
      setSelectedAddress(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const removeAddress = (id: string) => {
    const newAddresses = addresses.filter(a => a.id !== id);
    setAddresses(newAddresses);
    if (selectedAddress?.id === id) {
      setSelectedAddress(newAddresses.find(a => a.isDefault) || newAddresses[0] || null);
    }
  };

  const selectAddress = (id: string) => {
    const addr = addresses.find(a => a.id === id);
    if (addr) setSelectedAddress(addr);
  };

  const setDefaultAddress = (id: string) => {
    const updated = addresses.map(a => ({ ...a, isDefault: a.id === id }));
    setAddresses(updated);
    const addr = updated.find(a => a.id === id);
    if (addr) setSelectedAddress(addr);
  };

  return (
    <AddressContext.Provider value={{
      addresses,
      selectedAddress,
      addAddress,
      updateAddress,
      removeAddress,
      selectAddress,
      setDefaultAddress
    }}>
      {children}
    </AddressContext.Provider>
  );
};

export const useAddresses = () => {
  const context = useContext(AddressContext);
  if (!context) throw new Error("useAddresses deve ser usado dentro de um AddressProvider");
  return context;
};