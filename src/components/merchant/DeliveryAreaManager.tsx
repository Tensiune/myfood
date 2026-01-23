"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Polygon, Marker, useMapEvents, Tooltip } from "react-leaflet";
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

const DeliveryAreaManager: React.FC<DeliveryAreaManagerProps> = ({ 
  center, 
  radius, 
  exclusionZones, 
  onChange 
}) => {
  const [currentRadius, setCurrentRadius] = useState(radius);
  const [zones, setZones] = useState<[number, number][][]>(exclusionZones);
  const [activePolygon, setActivePolygon] = useState<[number, number][]>([]);
  const [mode, setMode] = useState<"view" | "draw" | "delete">("view");
  const [hoveredZoneIndex, setHoveredZoneIndex] = useState<number | null>(null);

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

  const removeZone = (index: number) => {
    const newZones = zones.filter((_, i) => i !== index);
    setZones(newZones);
    if (hoveredZoneIndex === index) setHoveredZoneIndex(null);
    onChange(currentRadius, newZones);
  };

  const clearZones = () => {
    if (window.confirm("Tem certeza que deseja remover TODAS as zonas de exclusão?")) {
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
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Distância máxima de entrega</p>
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
                    mode === "draw" ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-100" : "border-red-100 text-red-500 hover:bg-red-50"
                  )}
                  onClick={() => setMode(mode === "draw" ? "view" : "draw")}
                >
                  {mode === "draw" ? <MousePointer2 className="h-4 w-4 animate-pulse" /> : <Ban className="h-4 w-4" />}
                  {mode === "draw" ? "Marcando no Mapa..." : "Desenhar Proibição"}
                </Button>
                
                {zones.length > 0 && (
                  <Button 
                    variant="ghost" 
                    className="w-full rounded-xl text-gray-400 hover:text-red-500 h-10" 
                    onClick={clearZones}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Limpar Tudo
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Lista de Zonas */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2 flex justify-between items-center">
              Zonas Proibidas <span>{zones.length}</span>
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {zones.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl p-8 text-center">
                  <Info className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Nenhuma área restrita</p>
                </div>
              ) : (
                zones.map((_, i) => (
                  <div 
                    key={i}
                    onMouseEnter={() => setHoveredZoneIndex(i)}
                    onMouseLeave={() => setHoveredZoneIndex(null)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-2xl border transition-all group",
                      hoveredZoneIndex === i 
                        ? "bg-red-50 border-red-200 shadow-md translate-x-1" 
                        : "bg-white border-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                        {i + 1}
                      </div>
                      <span className="text-sm font-bold text-gray-700">Área Restrita</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeZone(i)}
                      className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-white rounded-full transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="lg:col-span-2 relative group">
          <div className="h-[550px] rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl relative z-0">
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapEvents />
              
              {/* Raio Principal */}
              <Circle 
                center={center} 
                radius={currentRadius * 1000} 
                pathOptions={{ 
                  fillColor: '#6366f1', 
                  fillOpacity: 0.05, 
                  color: '#6366f1', 
                  weight: 2, 
                  dashArray: '10, 10' 
                }} 
              />

              {/* Marcador da Loja */}
              <Marker position={center} icon={storeIcon} />

              {/* Zonas de Exclusão Existentes */}
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
                    fillColor: hoveredZoneIndex === i ? '#ef4444' : '#ef4444', 
                    fillOpacity: hoveredZoneIndex === i ? 0.6 : 0.3, 
                    color: hoveredZoneIndex === i ? '#b91c1c' : '#b91c1c', 
                    weight: hoveredZoneIndex === i ? 3 : 2 
                  }} 
                >
                  <Tooltip sticky>Clique para remover área {i + 1}</Tooltip>
                </Polygon>
              ))}

              {/* Polígono em Construção */}
              {activePolygon.length > 0 && (
                <Polygon 
                  positions={activePolygon} 
                  pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.2, color: '#ef4444', weight: 2, dashArray: '3, 3' }} 
                />
              )}
            </MapContainer>

            {/* Overlay de desenho */}
            {mode === "draw" && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm">
                <div className="bg-indigo-900/95 backdrop-blur-md text-white p-4 rounded-3xl shadow-2xl border border-white/20 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                      <Ban className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold leading-tight">Clique no mapa para marcar os pontos da zona de exclusão.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="flex-1 text-white hover:bg-white/10 rounded-xl"
                      onClick={() => { setActivePolygon([]); setMode("view"); }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 bg-white text-indigo-900 hover:bg-indigo-50 font-black rounded-xl gap-2 shadow-lg"
                      disabled={activePolygon.length < 3}
                      onClick={finishPolygon}
                    >
                      <Check className="h-4 w-4" /> Salvar ({activePolygon.length})
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="absolute -bottom-4 -right-4 bg-brand-accent text-white px-6 py-4 rounded-3xl shadow-xl z-10 flex items-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Área Segura</p>
                <p className="text-xl font-black">~{Math.PI * Math.pow(currentRadius, 2) > 0 ? (Math.PI * Math.pow(currentRadius, 2)).toFixed(1) : 0} km²</p>
             </div>
             <div className="h-8 w-px bg-white/20" />
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Bloqueios</p>
                <p className="text-xl font-black">{zones.length}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAreaManager;