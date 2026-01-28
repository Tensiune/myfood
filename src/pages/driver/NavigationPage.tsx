"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Navigation, 
  Key, 
  Loader2, 
  AlertTriangle,
  Store,
  User,
  CheckCircle2,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  CornerUpRight,
  CornerUpLeft
} from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { cn } from "@/lib/utils";

// Ícones customizados
const driverIcon = L.divIcon({
  html: `<div class="bg-indigo-600 p-2 rounded-full shadow-xl border-2 border-white flex items-center justify-center transform -rotate-45">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>`,
  className: "custom-driver-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Componente para controlar a rotação e foco do mapa
const NavigationController = ({ position, bearing }: { position: [number, number], bearing: number }) => {
  const map = useMap();
  useEffect(() => {
    if (position[0] !== 0) {
      map.flyTo(position, 18, { animate: true, duration: 1 });
    }
  }, [position, map]);
  return null;
};

const NavigationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  
  const [step, setStep] = useState<"to_store" | "to_client" | "confirm">("to_store");
  const [order, setOrder] = useState<any>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [nextInstruction, setNextInstruction] = useState<any>(null);
  const [bearing, setBearing] = useState(0);
  const [otpCode, setOtpCode] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { currentLocation } = useDriverLocationTracker(true);
  const prevPosRef = useRef<[number, number]>([0, 0]);

  // Calcula o ângulo de direção (bearing) entre duas coordenadas
  useEffect(() => {
    if (currentLocation[0] !== 0 && prevPosRef.current[0] !== 0) {
      const [lat1, lon1] = prevPosRef.current;
      const [lat2, lon2] = currentLocation;
      
      const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
      const brng = (Math.atan2(y, x) * 180) / Math.PI;
      setBearing((brng + 360) % 360);
    }
    prevPosRef.current = currentLocation;
  }, [currentLocation]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) { setLoadingOrder(false); return; }
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, merchant:merchant_applications(*)')
          .eq('id', orderId)
          .single();
        if (error) throw error;
        if (data) {
          setOrder(data);
          if (data.status === 'OUT_FOR_DELIVERY') setStep("to_client");
        }
      } catch (err) {
        showError("Não foi possível carregar os dados da rota.");
        navigate("/driver/orders");
      } finally {
        setLoadingOrder(false);
      }
    };
    fetchOrder();
  }, [orderId, navigate]);

  const storePos = useMemo((): [number, number] => {
    const addr = order?.merchant?.metadata?.store_details?.address || order?.merchant?.metadata?.address;
    return [parseFloat(addr?.lat) || -22.119707, parseFloat(addr?.lng) || -51.428802];
  }, [order]);

  const clientPos = useMemo((): [number, number] => {
    const addr = order?.delivery_address;
    return [parseFloat(addr?.lat) || -22.119707, parseFloat(addr?.lng) || -51.428802];
  }, [order]);

  const targetPos = step === "to_store" ? storePos : clientPos;

  // Busca a rota e instruções detalhadas
  useEffect(() => {
    const getDetailedRoute = async () => {
      if (currentLocation[0] === 0 || !targetPos) return;

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation[1]},${currentLocation[0]};${targetPos[1]},${targetPos[0]}?overview=full&geometries=geojson&steps=true`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setRoutePoints(route.geometry.coordinates.map((c: any) => [c[1], c[0]]));
          
          // Pega a próxima manobra válida
          if (route.legs[0]?.steps?.length > 1) {
             setNextInstruction(route.legs[0].steps[1]);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar rota:", err);
      }
    };

    getDetailedRoute();
  }, [currentLocation, targetPos, step]);

  const getManeuverIcon = (type: string, modifier: string) => {
    if (type === 'depart' || type === 'arrive') return <ArrowUp className="h-8 w-8" />;
    if (modifier?.includes('left')) return <CornerUpLeft className="h-8 w-8" />;
    if (modifier?.includes('right')) return <CornerUpRight className="h-8 w-8" />;
    return <ArrowUp className="h-8 w-8" />;
  };

  const handleArrivedAtStore = () => {
    showSuccess("Chegada confirmada!");
    setStep("to_client");
  };

  const handleVerifyCode = async () => {
    if (otpCode !== order?.confirmation_code) {
      showError("Código incorreto.");
      return;
    }
    setFinishing(true);
    try {
      const { error } = await supabase.from('orders').update({ status: 'DELIVERED' }).eq('id', order.id);
      if (error) throw error;
      showSuccess("Entrega concluída!");
      navigate("/driver/orders");
    } catch (err) {
      showError("Erro ao finalizar.");
    } finally {
      setFinishing(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-white font-bold">Iniciando navegação GPS...</p>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-50 overflow-hidden max-w-2xl mx-auto">
      {/* Banner de Próxima Manobra (Estilo Google Maps) */}
      {step !== "confirm" && nextInstruction && (
        <div className="absolute top-0 left-0 right-0 z-[1100] p-4 pointer-events-none">
          <div className="bg-green-600 text-white rounded-3xl p-5 shadow-2xl flex items-center gap-6 animate-in slide-in-from-top-10 duration-500 pointer-events-auto">
            <div className="p-3 bg-white/20 rounded-2xl">
               {getManeuverIcon(nextInstruction.maneuver.type, nextInstruction.maneuver.modifier)}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest opacity-80">Próxima instrução</p>
              <p className="text-xl font-black leading-tight">
                {nextInstruction.name || "Siga em frente"}
              </p>
              <p className="text-sm font-bold opacity-90 mt-1">
                A {(nextInstruction.distance).toFixed(0)} metros
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mapa Rotacionado */}
      <div className="flex-1 relative bg-slate-100 overflow-hidden">
        <div 
          className="w-full h-full transition-transform duration-1000 ease-out"
          style={{ transform: `rotate(${-bearing}deg)`, transformOrigin: 'center' }}
        >
          {step !== "confirm" && (
            <MapContainer 
              center={currentLocation[0] !== 0 ? currentLocation : storePos} 
              zoom={18} 
              style={{ height: '140%', width: '140%', margin: '-20%' }} // Margem extra para não mostrar bordas ao girar
              zoomControl={false}
              scrollWheelZoom={false}
              dragging={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <NavigationController position={currentLocation} bearing={bearing} />
              
              {currentLocation[0] !== 0 && (
                <Marker position={currentLocation} icon={driverIcon} />
              )}
              
              {routePoints.length > 0 && (
                <Polyline 
                  positions={routePoints} 
                  pathOptions={{ color: '#4f46e5', weight: 8, opacity: 0.9 }} 
                />
              )}
            </MapContainer>
          )}
        </div>

        {/* HUD de Status (Não rotaciona) */}
        {step === "confirm" && (
          <div className="absolute inset-0 h-full flex flex-col items-center justify-center p-6 bg-slate-800 z-[1200]">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 text-center shadow-2xl">
              <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-black text-indigo-900">Confirmar Entrega</h3>
              <div className="flex justify-center">
                 <OtpInput length={4} value={otpCode} onChange={setOtpCode} />
              </div>
              <Button className="w-full h-16 rounded-2xl bg-green-600 text-white font-black text-lg" onClick={handleVerifyCode} disabled={otpCode.length < 4 || finishing}>
                {finishing ? <Loader2 className="animate-spin" /> : "Finalizar Pedido"}
              </Button>
              <Button variant="ghost" className="text-gray-400 font-bold" onClick={() => setStep("to_client")}>Voltar ao Mapa</Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Fixo */}
      {step !== "confirm" && (
        <div className="p-6 bg-white rounded-t-[2.5rem] z-[1100] space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-50 rounded-xl">
                 {step === "to_store" ? <Store className="h-5 w-5 text-indigo-600" /> : <User className="h-5 w-5 text-indigo-600" />}
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Destino Atual</p>
                  <p className="font-bold text-gray-900">{step === "to_store" ? "Coleta na Loja" : "Entrega ao Cliente"}</p>
               </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-12 w-12 text-gray-400">
               <ArrowLeft className="h-6 w-6" />
            </Button>
          </div>
          <Button 
            className="w-full h-16 rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-xl active:scale-95 transition-transform" 
            onClick={step === "to_store" ? handleArrivedAtStore : () => setStep("confirm")}
          >
            {step === "to_store" ? "Cheguei na Loja" : "Cheguei no Cliente"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default NavigationPage;