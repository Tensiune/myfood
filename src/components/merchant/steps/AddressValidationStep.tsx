"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface BusinessInfo {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface AddressValidationStepProps {
  businessInfo: BusinessInfo;
  onNext: () => void;
  onBack: () => void;
}

const AddressValidationStep: React.FC<AddressValidationStepProps> = ({ 
  businessInfo, 
  onNext, 
  onBack 
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <MapPin className="h-16 w-16 text-brand-accent mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Validar Endereço</h3>
        <p className="text-gray-600">
          Confirme se o marcador está na localização correta do seu estabelecimento
        </p>
      </div>
      
      <div className="bg-gray-100 rounded-2xl h-64 flex items-center justify-center relative overflow-hidden">
        {/* Mock map visualization */}
        <div className="absolute inset-0 bg-blue-50">
          <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <div className="absolute top-1/3 left-1/2 w-24 h-24 bg-green-200 rounded-lg"></div>
          <div className="absolute top-2/3 left-1/3 w-32 h-16 bg-yellow-200 rounded-lg"></div>
        </div>
      </div>
      
      <div className="bg-indigo-50 p-4 rounded-2xl">
        <p className="font-medium text-indigo-900">
          {businessInfo.street}, {businessInfo.number}
          {businessInfo.complement && `, ${businessInfo.complement}`}
        </p>
        <p className="text-indigo-700">
          {businessInfo.neighborhood} - {businessInfo.city}/{businessInfo.state}
        </p>
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
          onClick={onNext}
        >
          Confirmar Localização
        </Button>
      </div>
    </div>
  );
};

export default AddressValidationStep;