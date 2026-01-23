"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Circle, Polygon, Marker, useMapEvents, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MapPin, Ban, RotateCcw, MousePointer2, Trash2, Info, Check } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Ícone customizado para a loja
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

// Componente para controlar a centralização estável do mapa
const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    // Só centraliza se as coordenadas forem válidas e diferentes do centro atual
    if (center && center[0] !== 0) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);

  return null;
};

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
  const [hoveredZoneIndex, setHoveredZoneIndex] = useState<number | null>(null);

  // Manipulador de eventos do mapa para evitar o "salto" de zoom/posição
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (mode === "draw") {
          // Adiciona o ponto sem disparar eventos de movimentação do mapa
          setActivePolygon(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
        }
      },
    });
    return null;
  };

  const finishPolygon = useCallback(() => {
    if (activePolygon.length >= 3) {
      const newZones = [...zones, activePolygon];
      setZones(newZones);
      setActivePolygon([]);
      setMode("view");
      onChange(currentRadius, newZones);
    }
  }, [activePolygon, zones, currentRadius, onChange]);

  const removeZone = (index: number) => {
    const newZones = zones.filter((_, i) => i !== index);
    setZones(newZones);
    if (hoveredZoneIndex === index) setHoveredZoneIndex(null);
    onChange(currentRadius, newZones);
  };

  const clearZones = () => {
    if (window.confirm("Remover todas as áreas de exclusão?")) {
      setZones([]);
      setActivePolygon([]);
      onChange(currentRadius, []);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Controles */}
        <div className="lg:col-span-1 space-y-6">
          <div className="space-y-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
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
            </div>

            <div className="pt-4 space-y-3">
              <Label className="font-bold text-indigo-900 flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-500" /> Gestão de Áreas
              </Label>
              <div className="flex flex-col gap-2">
                <Button 
                  variant={mode === "draw" ? "default" : "outline"}
                  className={cn(
                    "w-full rounded-xl gap-2 h-12 transition-all",
                    mode === "draw" ? "bg-red-500 hover:bg-red-600 shadow-lg" : "border-red-100 text-red-500 hover:bg-red-50"
                  )}
                  onClick={() => {
                    setMode(mode === "draw" ? "view" : "draw");
                    if (mode === "draw") setActivePolygon([]);
                  }}
                >
                  {mode === "draw" ? <MousePointer2 className="h-4 w-4 animate-pulse" /> : <Ban className="h-4 w-4" />}
                  {mode === "draw" ? "Marcando Pontos..." : "Desenhar Proibição"}
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de Zonas */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Zonas Ativas ({zones.length})</h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              {zones.map((_, i) => (
                <div 
                  key={i}
                  onMouseEnter={() => setHoveredZoneIndex(i)}
                  onMouseLeave={() => setHoveredZoneIndex(null)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-2xl border transition-all",
                    hoveredZoneIndex === i ? "bg-red-50 border-red-200" : "bg-white border-gray-100"
                  )}
                >
                  <span className="text-sm font-bold text-gray-700">Área {i + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeZone(i)} className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-white rounded-full">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {zones.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Nenhuma área proibida.</p>}
            </div>
          </div>
        </div>

        {/* Mapa com lógica de centralização corrigida */}
        <div className="lg:col-span-2 relative group">
          <div className="h-[550px] rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl relative z-0">
            <MapContainer 
              center={center} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              scrollWheelZoom={true}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapController center={center} />
              <MapEvents />
              
              <Circle 
                center={center} 
                radius={currentRadius * 1000} 
                pathOptions={{ fillColor: '#6366f1', fillOpacity: 0.05, color: '#6366f1', weight: 1, dashArray: '5, 5' }} 
              />

              <Marker position={center} icon={storeIcon} />

              {zones.map((polygon, i) => (
                <Polygon 
                  key={i} 
                  positions={polygon} 
                  eventHandlers={{
                    click: () => removeZone(i),
                    mouseover: () => setHoveredZoneIndex(i),
                    mouseout: () => setHoveredZoneIndex(null),
                  }}
                  pathOptions={{ 
                    fillColor: '#ef4444', 
                    fillOpacity: hoveredZoneIndex === i ? 0.6 : 0.3, 
                    color: '#b91c1c', 
                    weight: 2 
                  }} 
                >
                  <Tooltip sticky>Clique para remover</Tooltip>
                </Polygon>
              ))}

              {activePolygon.length > 0 && (
                <Polygon 
                  positions={activePolygon} 
                  pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.2, color: '#ef4444', weight: 2, dashArray: '3, 3' }} 
                />
              )}
            </MapContainer>

            {mode === "draw" && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm">
                <div className="bg-indigo-900/95 backdrop-blur-md text-white p-4 rounded-3xl shadow-2xl border border-white/20 space-y-3">
                  <p className="text-xs font-bold text-center">Clique no mapa para adicionar pontos.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="flex-1 text-white hover:bg-white/10" onClick={() => { setActivePolygon([]); setMode("view"); }}>Cancelar</Button>
                    <Button size="sm" className="flex-1 bg-white text-indigo-900 hover:bg-indigo-50 font-black" disabled={activePolygon.length < 3} onClick={finishPolygon}>Salvar ({activePolygon.length})</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAreaManager;