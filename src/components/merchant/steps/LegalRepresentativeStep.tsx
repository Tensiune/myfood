"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { showError } from "@/utils/toast";

interface LegalRep {
  cpf: string;
  fullName: string;
}

interface BusinessInfo {
  cnpj: string;
  street: string;
}

interface LegalRepresentativeStepProps {
  legalRep: LegalRep;
  setLegalRep: (legalRep: LegalRep) => void;
  businessInfo: BusinessInfo;
  email: string;
  category: string;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}

const LegalRepresentativeStep: React.FC<LegalRepresentativeStepProps> = ({ 
  legalRep, 
  setLegalRep, 
  businessInfo, 
  email, 
  category, 
  onNext, 
  onBack, 
  loading 
}) => {
  const handleFinalSubmit = () => {
    if (!legalRep.cpf || !legalRep.fullName) {
      showError("Por favor, preencha todos os dados do representante legal.");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <User className="h-16 w-16 text-brand-accent mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Representante Legal</h3>
        <p className="text-gray-600">
          Informe os dados do responsável legal pela empresa
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>CPF</Label>
          <Input 
            placeholder="000.000.000-00" 
            value={legalRep.cpf}
            onChange={(e) => setLegalRep({...legalRep, cpf: e.target.value})}
            className="rounded-xl border-gray-200 h-12"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Nome Completo</Label>
          <Input 
            placeholder="Nome conforme documento" 
            value={legalRep.fullName}
            onChange={(e) => setLegalRep({...legalRep, fullName: e.target.value})}
            className="rounded-xl border-gray-200 h-12"
          />
        </div>
      </div>
      
      <div className="bg-indigo-50 p-4 rounded-2xl">
        <h4 className="font-bold text-indigo-900 mb-2">Resumo do Cadastro</h4>
        <div className="space-y-1 text-sm">
          <p className="flex justify-between">
            <span className="text-gray-600">E-mail:</span>
            <span className="font-medium">{email}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-600">CNPJ:</span>
            <span className="font-medium">{businessInfo.cnpj}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-600">Categoria:</span>
            <span className="font-medium capitalize">{category}</span>
          </p>
        </div>
      </div>
      
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1 rounded-xl"
          onClick={onBack}
        >
          Voltar
        </Button>
        <Button 
          className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3"
          onClick={handleFinalSubmit}
          disabled={loading}
        >
          {loading ? "Processando..." : "Finalizar Cadastro"}
        </Button>
      </div>
    </div>
  );
};

export default LegalRepresentativeStep;