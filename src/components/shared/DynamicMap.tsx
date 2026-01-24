"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ícones customizados (reutilizados do OrderTrackingPage)
const driverIcon = L.divIcon({
  html: `<div class="bg-brand-accent p-3 rounded-full shadow-2xl relative border-2 border-white transform -rotate-45">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M12 15l4-4 4 4"/><path d="M12 15V3"/></svg>
        </div>`,
  className: "custom-driver-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const destinationIcon = L.divIcon({
  html: `<div class="bg-indigo-600 p-2 rounded-full shadow-xl border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>`,
  className: "custom-destination-icon",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const storeIcon = L.divIcon({
  html: `<div class="bg-green-600 p-2 rounded-full shadow-xl border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>`,
  className: "custom-store-icon",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// Componente para centralizar o mapa
const MapView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

interface DynamicMapProps {
  center: [number, number];
  zoom: number;
  driverLocation: [number, number] | null;
  destinationPos: [number, number];
  storePos: [number, number];
  isTrackingActive: boolean;
}

const DynamicMap: React.FC<DynamicMapProps> = ({ 
  center, 
  zoom, 
  driverLocation, 
  destinationPos, 
  storePos, 
  isTrackingActive 
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="flex items-center justify-center h-full bg-slate-200">Carregando Mapa...</div>;
  }

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      <MapView center={center} zoom={zoom} />

      {/* Marcador: Loja (Origem) */}
      <Marker position={storePos} icon={storeIcon} />

      {/* Marcador: Cliente (Destino) */}
      <Marker position={destinationPos} icon={destinationIcon} />

      {/* Marcador: Entregador (Apenas se estiver em rota) */}
      {isTrackingActive && driverLocation && (
        <Marker position={driverLocation} icon={driverIcon} />
      )}
    </MapContainer>
  );
};

export default DynamicMap;