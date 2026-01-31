"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, X } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { showError } from "@/utils/toast";

const customMarkerIcon = L.divIcon({
  html: `<div class="bg-brand-accent p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>`,
  className: "custom-div-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

interface AddressData {
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

interface MerchantAddressFormProps {
  address: AddressData;
  onChange: (address: AddressData) => void;
  readOnlyInputs?: boolean;
}

const RecenterMap = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] !== 0) {
      map.flyTo(position, 16);
    }
  }, [position, map]);
  return null;
};

const LocationMarker = ({ position, onPositionChange }: { position: [number, number], onPositionChange: (pos: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? (
    <Marker 
      position={position} 
      icon={customMarkerIcon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onPositionChange([pos.lat, pos.lng]);
        },
      }}
    />
  ) : null;
};

const MerchantAddressForm: React.FC<MerchantAddressFormProps> = ({ address, onChange, readOnlyInputs = false }) => {
  const [loadingCep, setLoadingCep] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Centro padrão ajustado para a área de teste (-22.11, -51.42)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-22.1197, -51.4288]);

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
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${data.logradouro}, ${data.localidade}, ${data.uf}, Brasil`)}`);
          const geoData = await geoRes.json();
          
          let lat = -22.1197;
          let lng = -51.4288;

          if (geoData && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
          }

          onChange({
            ...address,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
            zipCode: cep,
            lat,
            lng
          });
          
          setMapCenter([lat, lng]);
          setShowSuggestions(false);
        }
      } catch (error) {
        showError("Erro ao buscar dados do endereço.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&city=${encodeURIComponent(address.city)}&country=Brazil&addressdetails=1&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      setStreetSuggestions(data);
    } catch (e) {
      console.error(e);
    }
  }, [address.city]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSuggestions && address.street.length >= 3) {
        fetchSuggestions(address.street);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [address.street, showSuggestions, fetchSuggestions]);

  const selectSuggestion = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    onChange({
      ...address,
      street: suggestion.address.road || suggestion.display_name.split(",")[0],
      neighborhood: suggestion.address.suburb || suggestion.address.neighbourhood || address.neighborhood,
      city: suggestion.address.city || suggestion.address.town || address.city,
      state: suggestion.address.state_code || address.state,
      lat,
      lng
    });
    
    setMapCenter([lat, lng]);
    setShowSuggestions(false);
  };

  const currentPos: [number, number] = address.lat && address.lng ? [address.lat, address.lng] : mapCenter;

  return (
    <div className="space-y-6">
      {!readOnlyInputs && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">CEP *</Label>
              <div className="relative">
                <Input
                  placeholder="00000-000"
                  value={address.zipCode}
                  onChange={(e) => onChange({ ...address, zipCode: e.target.value })}
                  onBlur={handleCepBlur}
                  className="rounded-xl h-12 border-gray-100"
                />
                {loadingCep && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-indigo-600" />}
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-2 relative">
              <Label className="font-bold text-gray-700">Rua/Avenida *</Label>
              <div className="relative">
                <Input
                  placeholder="Logradouro"
                  value={address.street}
                  onChange={(e) => { onChange({ ...address, street: e.target.value }); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  className="rounded-xl h-12 border-gray-100"
                  autoComplete="off"
                />
                {showSuggestions && address.street.length >= 3 && (
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Número *</Label>
              <Input
                placeholder="000"
                value={address.number}
                onChange={(e) => onChange({ ...address, number: e.target.value })}
                className="rounded-xl h-12 border-gray-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Bairro *</Label>
              <Input
                placeholder="Bairro"
                value={address.neighborhood}
                onChange={(e) => onChange({ ...address, neighborhood: e.target.value })}
                className="rounded-xl h-12 border-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Complemento</Label>
              <Input
                placeholder="Sala, Andar, etc."
                value={address.complement}
                onChange={(e) => onChange({ ...address, complement: e.target.value })}
                className="rounded-xl h-12 border-gray-100"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Cidade *</Label>
              <Input
                placeholder="Cidade"
                value={address.city}
                onChange={(e) => onChange({ ...address, city: e.target.value })}
                className="rounded-xl h-12 border-gray-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Estado *</Label>
              <Input
                placeholder="UF"
                value={address.state}
                onChange={(e) => onChange({ ...address, state: e.target.value })}
                className="rounded-xl h-12 border-gray-100"
              />
            </div>
          </div>
          <div className="pt-4 border-t border-gray-50" />
        </>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-accent" />
            <h3 className="font-black text-indigo-900">Localização Precisa</h3>
          </div>
        </div>
        
        <div className="h-64 rounded-3xl overflow-hidden border-2 border-indigo-50 shadow-inner z-0 relative">
          <MapContainer 
            center={currentPos} 
            zoom={16} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <LocationMarker 
              position={currentPos} 
              onPositionChange={(pos) => onChange({ ...address, lat: pos[0], lng: pos[1] })}
            />
            <RecenterMap position={currentPos} />
          </MapContainer>
        </div>
        <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-wider">
          Clique no mapa ou arraste o marcador para ajustar a localização exata.
        </p>
      </div>
    </div>
  );
};

export default MerchantAddressForm;