"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import MerchantAddressForm from "@/components/merchant/MerchantAddressForm";

interface BusinessInfo {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  lat?: number;
  lng?: number;
}

interface AddressValidationStepProps {
  businessInfo: BusinessInfo;
  setBusinessInfo: (info: BusinessInfo) => void; // Added setter
  onNext: () => void;
  onBack: () => void;
}

const AddressValidationStep: React.FC<AddressValidationStepProps> = ({ 
  businessInfo, 
  setBusinessInfo,
  onNext, 
  onBack 
}) => {
  
  // Geocoding logic on mount if coordinates are missing
  useEffect(() => {
    const geocodeAddress = async () => {
      // Only run if coordinates are missing but we have enough address info
      if (businessInfo.lat && businessInfo.lng) return;
      if (!businessInfo.street || !businessInfo.city) return;

      const fullAddress = `${businessInfo.street}, ${businessInfo.number}, ${businessInfo.city}, ${businessInfo.state}, Brasil`;
      
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`);
        const geoData = await geoRes.json();
        
        if (geoData && geoData.length > 0) {
          const lat = parseFloat(geoData[0].lat);
          const lng = parseFloat(geoData[0].lon);
          
          // Update state with coordinates
          setBusinessInfo(prev => ({
            ...prev,
            lat,
            lng
          }));
        }
      } catch (error) {
        console.error("Failed to geocode address on validation step:", error);
      }
    };
    
    geocodeAddress();
  }, [businessInfo.lat, businessInfo.lng, businessInfo.street, businessInfo.number, businessInfo.city, businessInfo.state, setBusinessInfo]);


  const handleNextStep = () => {
    if (!businessInfo.lat || !businessInfo.lng) {
      // We allow proceeding, relying on the user to have dragged the marker if geocoding failed.
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <MapPin className="h-16 w-16 text-brand-accent mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Validar Endereço</h3>
        <p className="text-gray-600">
          Arraste o marcador para a localização exata do seu estabelecimento.
        </p>
      </div>
      
      {/* Using MerchantAddressForm for map interaction, hiding inputs */}
      <MerchantAddressForm 
        address={businessInfo}
        onChange={setBusinessInfo}
        readOnlyInputs={true}
      />
      
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
          onClick={handleNextStep}
        >
          Confirmar Localização
        </Button>
      </div>
    </div>
  );
};

export default AddressValidationStep;