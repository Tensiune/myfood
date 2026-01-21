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
  // Inicializa o estado diretamente do localStorage para evitar sobrescrita com array vazio
  const [addresses, setAddresses] = useState<Address[]>(() => {
    const saved = localStorage.getItem("deliveryAddresses");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao carregar endereços", e);
      }
    }
    return [];
  });

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(() => {
    const defaultAddr = addresses.find((a: Address) => a.isDefault) || addresses[0];
    return defaultAddr || null;
  });

  // Atualiza o endereço selecionado quando a lista de endereços mudar (se necessário)
  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      const defaultAddr = addresses.find((a: Address) => a.isDefault) || addresses[0];
      setSelectedAddress(defaultAddr);
    }
    // Persiste no localStorage sempre que houver mudanças
    localStorage.setItem("deliveryAddresses", JSON.stringify(addresses));
  }, [addresses, selectedAddress]);

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