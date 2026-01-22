"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, MapPin, Home, Building, Check, Loader2, X } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAddresses, Address } from "@/context/AddressContext";
import { cn } from "@/lib/utils";

const AddressManager: React.FC = () => {
  const { addresses, selectedAddress, addAddress, updateAddress, removeAddress, selectAddress } = useAddresses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [currentAddress, setCurrentAddress] = useState<Partial<Address>>({
    type: "home",
    isDefault: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

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
          setCurrentAddress(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
          setShowSuggestions(false);
        }
      } catch (error) {
        showError("Erro ao buscar CEP.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const fetchStreetSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setStreetSuggestions([]);
      return;
    }
    try {
      const city = currentAddress.city || "";
      const url = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}&country=Brazil&addressdetails=1&limit=5`;
      const response = await fetch(url);
      const data = await response.json();
      setStreetSuggestions(data);
    } catch (error) {
      console.error("Erro ao buscar sugestões", error);
    }
  }, [currentAddress.city]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSuggestions && currentAddress.street && currentAddress.street.length >= 3) {
        fetchStreetSuggestions(currentAddress.street);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [currentAddress.street, fetchStreetSuggestions, showSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentAddress(prev => ({ ...prev, [name]: value }));
    if (name === "street") setShowSuggestions(true);
  };

  const selectSuggestion = (suggestion: any) => {
    setCurrentAddress(prev => ({
      ...prev,
      street: suggestion.address.road || suggestion.display_name.split(",")[0],
      neighborhood: suggestion.address.suburb || suggestion.address.neighbourhood || prev.neighborhood,
      city: suggestion.address.city || suggestion.address.town || prev.city,
      state: suggestion.address.state_code || prev.state,
    }));
    setShowSuggestions(false);
    setStreetSuggestions([]);
  };

  const handleSaveAddress = () => {
    if (!currentAddress.street || !currentAddress.number || !currentAddress.neighborhood ||
        !currentAddress.city || !currentAddress.state || !currentAddress.zipCode) {
      showError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (editingId) {
      updateAddress(editingId, currentAddress);
      showSuccess("Endereço atualizado!");
    } else {
      addAddress(currentAddress as Omit<Address, "id">);
      showSuccess("Endereço adicionado!");
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentAddress({ type: "home", isDefault: false });
    setEditingId(null);
    setStreetSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {addresses.length === 0 ? (
          <p className="text-center text-gray-500 py-4">Nenhum endereço cadastrado.</p>
        ) : (
          addresses.map((address) => (
            <Card 
              key={address.id} 
              className={cn(
                "rounded-xl border transition-all cursor-pointer hover:border-brand-accent",
                selectedAddress?.id === address.id ? "border-brand-accent bg-brand-accent/5" : "border-gray-200"
              )}
              onClick={() => selectAddress(address.id)}
            >
              <CardContent className="p-4 flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    {address.type === "home" ? <Home className="h-5 w-5 text-indigo-600" /> : 
                     address.type === "work" ? <Building className="h-5 w-5 text-indigo-600" /> : 
                     <MapPin className="h-5 w-5 text-indigo-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 truncate">
                        {address.street}, {address.number}
                      </p>
                      {selectedAddress?.id === address.id && <Check className="h-4 w-4 text-brand-accent" />}
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {address.neighborhood} - {address.city}/{address.state}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={(e) => { e.stopPropagation(); setCurrentAddress(address); setEditingId(address.id); setIsDialogOpen(true); }}>
                    ✏️
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={(e) => { e.stopPropagation(); removeAddress(address.id); showSuccess("Endereço removido!"); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="w-full rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-6 shadow-lg">
            <Plus className="h-5 w-5 mr-2" /> Adicionar novo endereço
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[90vh] overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-indigo-900">
              {editingId ? "Editar endereço" : "Novo endereço"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="relative">
                  <Input 
                    name="zipCode" 
                    placeholder="00000-000" 
                    value={currentAddress.zipCode || ""} 
                    onChange={handleInputChange}
                    onBlur={handleCepBlur}
                    className="rounded-lg" 
                  />
                  {loadingCep && <Loader2 className="absolute right-2 top-2 h-5 w-5 animate-spin text-indigo-600" />}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={currentAddress.type} onValueChange={(v) => setCurrentAddress(p => ({ ...p, type: v as any }))}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Casa</SelectItem>
                    <SelectItem value="work">Trabalho</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 relative">
              <Label>Rua</Label>
              <div className="relative">
                <Input 
                  name="street" 
                  placeholder="Nome da rua" 
                  value={currentAddress.street || ""} 
                  onChange={handleInputChange}
                  onFocus={() => setShowSuggestions(true)}
                  autoComplete="off"
                  className="rounded-lg" 
                />
                {showSuggestions && currentAddress.street && currentAddress.street.length >= 3 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400"
                    onClick={() => { setShowSuggestions(false); setStreetSuggestions([]); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {showSuggestions && streetSuggestions.length > 0 && (
                <div className="absolute z-[100] w-full bg-white border border-gray-200 rounded-lg shadow-2xl mt-1 overflow-hidden max-h-48 overflow-y-auto">
                  {streetSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left p-3 hover:bg-indigo-50 text-sm border-b last:border-0 border-gray-100 transition-colors"
                      onClick={() => selectSuggestion(s)}
                    >
                      <p className="font-semibold text-gray-800">{s.display_name.split(",")[0]}</p>
                      <p className="text-[10px] text-gray-500 truncate">{s.display_name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input name="number" placeholder="123" value={currentAddress.number || ""} onChange={handleInputChange} className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input name="neighborhood" placeholder="Bairro" value={currentAddress.neighborhood || ""} onChange={handleInputChange} className="rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input name="city" placeholder="Cidade" value={currentAddress.city || ""} onChange={handleInputChange} className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input name="state" placeholder="UF" value={currentAddress.state || ""} onChange={handleInputChange} className="rounded-lg" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button className="flex-1 rounded-xl bg-brand-accent hover:bg-brand-accent/90" onClick={handleSaveAddress}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressManager;