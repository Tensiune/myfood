"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2, Search } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { showError } from "@/utils/toast";

// Corrigindo ícones do Leaflet que as vezes não carregam corretamente com build tools
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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
}

const LocationMarker = ({ position, onPositionChange }: { position: [number, number], onPositionChange: (pos: [number, number]) => void }) => {
  const map = useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position ? (
    <Marker 
      position={position} 
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

const MerchantAddressForm: React.FC<MerchantAddressFormProps> = ({ address, onChange }) => {
  const [loadingCep, setLoadingCep] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-23.5505, -46.6333]); // São Paulo default

  useEffect(() => {
    if (address.lat && address.lng) {
      setMapCenter([address.lat, address.lng]);
    }
  }, [address.lat, address.lng]);

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
          // Busca coordenadas via Nominatim (OpenStreetMap) baseada no endereço do CEP
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${data.logradouro}, ${data.localidade}, ${data.uf}, Brasil`)}`);
          const geoData = await geoRes.json();
          
          let lat = address.lat || -23.5505;
          let lng = address.lng || -46.6333;

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
        }
      } catch (error) {
        showError("Erro ao buscar dados do endereço.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handlePositionChange = (pos: [number, number]) => {
    onChange({ ...address, lat: pos[0], lng: pos[1] });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 relative">
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
        
        <div className="md:col-span-2 space-y-2">
          <Label className="font-bold text-gray-700">Rua/Avenida *</Label>
          <Input
            placeholder="Logradouro"
            value={address.street}
            onChange={(e) => onChange({ ...address, street: e.target.value })}
            className="rounded-xl h-12 border-gray-100"
          />
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
          <Select 
            value={address.state}
            onValueChange={(value) => onChange({ ...address, state: value })}
          >
            <SelectTrigger className="rounded-xl h-12 border-gray-100">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="SP">São Paulo</SelectItem>
              <SelectItem value="RJ">Rio de Janeiro</SelectItem>
              <SelectItem value="MG">Minas Gerais</SelectItem>
              <SelectItem value="PR">Paraná</SelectItem>
              <SelectItem value="RS">Rio Grande do Sul</SelectItem>
              <SelectItem value="SC">Santa Catarina</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-accent" />
            <h3 className="font-black text-indigo-900">Localização Precisa</h3>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Arraste o marcador no mapa</span>
        </div>
        
        <div className="h-64 rounded-3xl overflow-hidden border-2 border-indigo-50 shadow-inner z-0">
          <MapContainer 
            center={mapCenter} 
            zoom={15} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <LocationMarker 
              position={[address.lat || mapCenter[0], address.lng || mapCenter[1]]} 
              onPositionChange={handlePositionChange}
            />
          </MapContainer>
        </div>
        <p className="text-[10px] text-gray-400 text-center">
          Clique no mapa ou arraste o pin para definir o ponto exato para o entregador.
        </p>
      </div>
    </div>
  );
};

export default MerchantAddressForm;