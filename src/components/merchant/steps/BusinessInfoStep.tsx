"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import { showError } from "@/utils/toast";

interface BusinessInfo {
  cnpj: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

interface BusinessInfoStepProps {
  businessInfo: BusinessInfo;
  setBusinessInfo: (info: BusinessInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

const BusinessInfoStep: React.FC<BusinessInfoStepProps> = ({ 
  businessInfo, 
  setBusinessInfo, 
  onNext, 
  onBack 
}) => {
  const handleBusinessInfoSubmit = () => {
    if (!businessInfo.cnpj || !businessInfo.phone || !businessInfo.street || 
        !businessInfo.number || !businessInfo.neighborhood || !businessInfo.city || 
        !businessInfo.state || !businessInfo.zipCode) {
      showError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-brand-accent" /> Dados da Empresa
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input 
            placeholder="00.000.000/0000-00" 
            value={businessInfo.cnpj}
            onChange={(e) => setBusinessInfo({...businessInfo, cnpj: e.target.value})}
            className="rounded-xl border-gray-200 h-12"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Telefone Comercial</Label>
          <Input 
            placeholder="(00) 00000-0000" 
            value={businessInfo.phone}
            onChange={(e) => setBusinessInfo({...businessInfo, phone: e.target.value})}
            className="rounded-xl border-gray-200 h-12"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>CEP</Label>
        <Input 
          placeholder="00000-000" 
          value={businessInfo.zipCode}
          onChange={(e) => setBusinessInfo({...businessInfo, zipCode: e.target.value})}
          className="rounded-xl border-gray-200 h-12"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Estado</Label>
          <Input 
            placeholder="UF" 
            value={businessInfo.state}
            onChange={(e) => setBusinessInfo({...businessInfo, state: e.target.value})}
            className="rounded-xl border-gray-200 h-12"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label>Cidade</Label>
          <Input 
            placeholder="Nome da cidade" 
            value={businessInfo.city}
            onChange={(e) => setBusinessInfo({...businessInfo, city: e.target.value})}
            className="rounded-xl border-gray-200 h-12"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Endereço</Label>
        <Input 
          placeholder="Nome da rua/avenida" 
          value={businessInfo.street}
          onChange={(e) => setBusinessInfo({...businessInfo, street: e.target.value})}
          className="rounded-xl border-gray-200 h-12"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Número</Label>
          <Input 
            placeholder="000" 
            value={businessInfo.number}
            onChange={(e) => setBusinessInfo({...businessInfo, number: e.target.value})}
            className="rounded-xl border-gray-200 h-12"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label>Complemento</Label>
          <Input 
            placeholder="Apartamento, sala, etc." 
            value={businessInfo.complement}
            onChange={(e) => setBusinessInfo({...businessInfo, complement: e.target.value})}
            className="rounded-xl border-gray-200 h-12"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Bairro</Label>
        <Input 
          placeholder="Nome do bairro" 
          value={businessInfo.neighborhood}
          onChange={(e) => setBusinessInfo({...businessInfo, neighborhood: e.target.value})}
          className="rounded-xl border-gray-200 h-12"
        />
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button 
          variant="outline" 
          className="flex-1 rounded-xl"
          onClick={onBack}
        >
          Voltar
        </Button>
        <Button 
          className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3"
          onClick={handleBusinessInfoSubmit}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};

export default BusinessInfoStep;