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
  lat?: number;
  lng?: number;
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
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregamento inicial e escuta de mudanças de autenticação
  useEffect(() => {
    const initialize = async () => {
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
      }
      setIsLoaded(true);
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
        const saved = localStorage.getItem(`addresses_${session.user.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAddresses(parsed);
          setSelectedAddress(parsed.find((a: Address) => a.isDefault) || parsed[0] || null);
        }
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        setAddresses([]);
        setSelectedAddress(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Salvar sempre que os endereços mudarem, mas só depois do carregamento inicial
  useEffect(() => {
    if (isLoaded && userId) {
      localStorage.setItem(`addresses_${userId}`, JSON.stringify(addresses));
    }
  }, [addresses, userId, isLoaded]);

  const addAddress = (addr: Omit<Address, "id">) => {
    const newAddr = { ...addr, id: Date.now().toString() };
    
    setAddresses(prev => {
      let updated;
      if (newAddr.isDefault) {
        updated = prev.map(a => ({ ...a, isDefault: false })).concat(newAddr);
      } else {
        updated = [...prev, newAddr];
      }
      
      // Se for o primeiro endereço, seleciona automaticamente
      if (updated.length === 1) setSelectedAddress(newAddr);
      return updated;
    });
  };

  const updateAddress = (id: string, updates: Partial<Address>) => {
    setAddresses(prev => {
      const updated = prev.map(a => (a.id === id ? { ...a, ...updates } : a));
      if (selectedAddress?.id === id) {
        setSelectedAddress({ ...selectedAddress, ...updates } as Address);
      }
      return updated;
    });
  };

  const removeAddress = (id: string) => {
    setAddresses(prev => {
      const updated = prev.filter(a => a.id !== id);
      if (selectedAddress?.id === id) {
        setSelectedAddress(updated.find(a => a.isDefault) || updated[0] || null);
      }
      return updated;
    });
  };

  const selectAddress = (id: string) => {
    const addr = addresses.find(a => a.id === id);
    if (addr) setSelectedAddress(addr);
  };

  const setDefaultAddress = (id: string) => {
    setAddresses(prev => {
      const updated = prev.map(a => ({ ...a, isDefault: a.id === id }));
      const addr = updated.find(a => a.id === id);
      if (addr) setSelectedAddress(addr);
      return updated;
    });
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