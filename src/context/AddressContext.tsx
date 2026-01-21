"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("deliveryAddresses");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAddresses(parsed);
        const defaultAddr = parsed.find((a: Address) => a.isDefault) || parsed[0];
        setSelectedAddress(defaultAddr || null);
      } catch (e) {
        console.error("Failed to parse addresses", e);
      }
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("deliveryAddresses", JSON.stringify(addresses));
  }, [addresses]);

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
    setAddresses(prev => prev.filter(a => a.id !== id));
    if (selectedAddress?.id === id) {
      setSelectedAddress(addresses.find(a => a.id !== id) || null);
    }
  };

  const selectAddress = (id: string) => {
    const addr = addresses.find(a => a.id === id);
    if (addr) setSelectedAddress(addr);
  };

  const setDefaultAddress = (id: string) => {
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
    const addr = addresses.find(a => a.id === id);
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
  if (!context) throw new Error("useAddresses must be used within AddressProvider");
  return context;
};