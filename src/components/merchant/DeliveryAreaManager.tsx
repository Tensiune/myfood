"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Polygon, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MapPin, Ban, RotateCcw, Save, MousePointer2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Custom Icon for store
const storeIcon = L.divIcon({
  html: `<div class="bg-indigo-600 p-2 rounded-full border-2 border-white shadow-lg"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

interface DeliveryAreaManagerProps {
  center: [number, number];
  radius: number;
  exclusionZones: [number, number][][];
  onChange: (radius: number, zones: [number, number][][]) => void;
}

const DeliveryAreaManager: React.FC<DeliveryAreaManagerProps> = ({ 
  center, 
  radius, 
  exclusionZones, 
  onChange 
}) => {
  const [currentRadius, setCurrentRadius] = useState(radius);
  const [zones, setZones] = useState<[number, number][][]>(exclusionZones);
  const [activePolygon, setActivePolygon] = useState<[number, number][]>([]);
  const [mode, setMode] = useState<"view" | "draw">("view");

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (mode === "draw") {
          setActivePolygon(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
        }
      },
    });
    return null;
  };

  const finishPolygon = () => {
    if (activePolygon.length >= 3) {
      const newZones = [...zones, activePolygon];
      setZones(newZones);
      setActivePolygon([]);
      setMode("view");
      onChange(currentRadius, newZones);
    }
  };

  const clearZones = () => {
    setZones([]);
    setActivePolygon([]);
    onChange(currentRadius, []);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-bold text-indigo-900">Raio de Atendimento</Label>
              <span className="font-black text-brand-accent">{currentRadius} km</span>
            </div>
            <Slider 
              value={[currentRadius]} 
              min={0.5} 
              max={30} 
              step={0.5} 
              onValueChange={(v) => {
                setCurrentRadius(v[0]);
                onChange(v[0], zones);
              }}
            />
            <p className="text-[10px] text-gray-400 font-bold uppercase">Distância máxima que sua loja atende</p>
          </div>

          <div className="pt-4 space-y-3">
            <Label className="font-bold text-indigo-900 flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" /> Zonas de Exclusão
            </Label>
            <div className="flex gap-2">
              <Button 
                variant={mode === "draw" ? "default" : "outline"}
                className={`flex-1 rounded-xl gap-2 ${mode === "draw" ? "bg-red-500" : "border-red-200 text-red-500"}`}
                onClick={() => setMode(mode === "draw" ? "view" : "draw")}
              >
                {mode === "draw" ? <MousePointer2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                {mode === "draw" ? "Marcando..." : "Marcar Proibição"}
              </Button>
              <Button variant="ghost" className="rounded-xl text-gray-400" onClick={clearZones}>
                <RotateCcw className="h-4 w-4 mr-2" /> Limpar
              </Button>
            </div>
            {mode === "draw" && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                <p className="text-xs text-red-700 font-medium mb-3">Clique no mapa para criar os pontos da área proibida.</p>
                <Button 
                  size="sm" 
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
                  disabled={activePolygon.length < 3}
                  onClick={finishPolygon}
                >
                  Finalizar Área ({activePolygon.length} pontos)
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="h-[400px] rounded-3xl overflow-hidden border-4 border-indigo-50 shadow-inner relative z-0">
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapEvents />
            
            {/* Raio Principal */}
            <Circle 
              center={center} 
              radius={currentRadius * 1000} 
              pathOptions={{ fillColor: '#6366f1', fillOpacity: 0.1, color: '#6366f1', weight: 2, dashArray: '5, 10' }} 
            />

            {/* Marcador da Loja */}
            <Marker position={center} icon={storeIcon} />

            {/* Zonas de Exclusão Existentes */}
            {zones.map((polygon, i) => (
              <Polygon 
                key={i} 
                positions={polygon} 
                pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.4, color: '#b91c1c', weight: 2 }} 
              />
            ))}

            {/* Polígono em Construção */}
            {activePolygon.length > 0 && (
              <Polygon 
                positions={activePolygon} 
                pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.2, color: '#ef4444', weight: 2, dashArray: '3, 3' }} 
              />
            )}
          </MapContainer>
        </div>
      </div>
      
      <div className="bg-indigo-900 text-white p-6 rounded-3xl flex items-center justify-between shadow-xl shadow-indigo-100">
        <div>
          <h4 className="font-bold text-lg">Configuração de Logística</h4>
          <p className="text-indigo-200 text-xs">Apenas clientes dentro do círculo e fora das áreas vermelhas verão sua loja.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase opacity-60">Áreas de Exclusão</p>
          <p className="text-2xl font-black">{zones.length}</p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAreaManager;