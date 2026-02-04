"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { User, Phone, MapPin, Loader2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";

interface AddressData {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

const initialAddress: AddressData = {
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
};

const PersonalDetailsManager: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<AddressData>(initialAddress);
  const [loadingCep, setLoadingCep] = useState(false);

  const fetchUserData = useCallback(() => {
    if (user) {
      const meta = user.user_metadata;
      setFullName(meta?.full_name || "");
      setCpf(meta?.cpf || "");
      setPhone(meta?.phone || "");
      setAddress(meta?.address || initialAddress);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (data.erro) {
          showError("CEP não encontrado.");
        } else {
          setAddress(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            number: prev.number, // Mantém o número atual
            complement: prev.complement, // Mantém o complemento atual
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
            zipCode: cep,
          }));
        }
      } catch (error) {
        showError("Erro ao buscar CEP.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!phone || !address.street || !address.number || !address.city) {
      showError("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      // 1. Update auth.users metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          phone: phone,
          address: address,
        }
      });

      if (authError) throw authError;
      
      // 2. Update driver_applications table (for redundancy and admin view)
      const { error: dbError } = await supabase
        .from('driver_applications')
        .update({ 
          phone: phone,
          metadata: { ...user.user_metadata, phone: phone, address: address }
        })
        .eq('id', user.id);
        
      if (dbError) throw dbError;

      await refreshUser(); // Fetch updated user data
      showSuccess("Dados pessoais atualizados com sucesso!");
    } catch (err: any) {
      showError(err.message || "Erro ao salvar dados.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
      <h2 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
        <User className="h-5 w-5 text-brand-accent" /> Dados Pessoais
      </h2>
      
      <form onSubmit={handleSave} className="space-y-6">
        {/* Dados Fixos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-bold text-gray-700">Nome Completo</Label>
            <Input value={fullName} disabled className="rounded-xl h-12 bg-gray-50 border-gray-200" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-gray-700">CPF</Label>
            <Input value={cpf} disabled className="rounded-xl h-12 bg-gray-50 border-gray-200" />
          </div>
        </div>

        {/* Dados Mutáveis */}
        <div className="space-y-2">
          <Label className="font-bold text-gray-700 flex items-center gap-2">
            <Phone className="h-4 w-4 text-indigo-600" /> Telefone
          </Label>
          <Input 
            placeholder="(00) 00000-0000" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-xl h-12 border-gray-200"
            required
          />
        </div>

        <div className="pt-4 border-t border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-600" /> Endereço
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <div className="relative">
                <Input 
                  placeholder="00000-000" 
                  value={address.zipCode}
                  onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                  onBlur={handleCepBlur}
                  className="rounded-xl h-12"
                />
                {loadingCep && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-indigo-600" />}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Rua</Label>
              <Input 
                placeholder="Nome da rua" 
                value={address.street}
                onChange={(e) => setAddress({...address, street: e.target.value})}
                className="rounded-xl h-12"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Número</Label>
              <Input 
                placeholder="123" 
                value={address.number}
                onChange={(e) => setAddress({...address, number: e.target.value})}
                className="rounded-xl h-12"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Complemento</Label>
              <Input 
                placeholder="Apartamento, bloco, etc." 
                value={address.complement}
                onChange={(e) => setAddress({...address, complement: e.target.value})}
                className="rounded-xl h-12"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input 
                placeholder="Bairro" 
                value={address.neighborhood}
                onChange={(e) => setAddress({...address, neighborhood: e.target.value})}
                className="rounded-xl h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input 
                placeholder="Cidade" 
                value={address.city}
                onChange={(e) => setAddress({...address, city: e.target.value})}
                className="rounded-xl h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input 
                placeholder="UF" 
                value={address.state}
                onChange={(e) => setAddress({...address, state: e.target.value})}
                className="rounded-xl h-12"
                required
              />
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black h-14 shadow-xl shadow-brand-accent/20" disabled={saving}>
          {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
          Salvar Alterações
        </Button>
      </form>
    </Card>
  );
};

export default PersonalDetailsManager;