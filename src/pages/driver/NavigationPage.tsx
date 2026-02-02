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
  CornerUpRight,
  CornerUpLeft,
  Plus,
  Minus,
  XCircle,
  Bell
} from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { cn } from "@/lib/utils";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";

const driverIcon = L.divIcon({
  html: `<div class="bg-indigo-600 p-2 rounded-full shadow-xl border-2 border-white flex items-center justify-center transform -rotate-45">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 12 2a8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>`,
  className: "custom-driver-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const NavigationController = ({ position, bearing, zoom }: { position: [number, number], bearing: number, zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    if (position[0] !== 0) {
      map.flyTo(position, zoom, { animate: true, duration: 1 });
    }
  }, [position, zoom, map]);
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
  const [mapZoom, setMapZoom] = useState(18);
  const [otpCode, setOtpCode] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const { currentLocation } = useDriverLocationTracker(true);
  const prevPosRef = useRef<[number, number]>([0, 0]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
  }, []);

  const playAlert = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  // Detector de Status em Tempo Real
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`nav_order_${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
        const updatedOrder = payload.new;
        
        const newStatus = updatedOrder.status;
        
        if (newStatus === 'CANCELLED') {
          showError("O pedido foi cancelado pela loja ou pelo cliente.");
          navigate("/driver/orders");
          return;
        }

        setOrder(prev => ({ ...prev, ...updatedOrder })); // Sincroniza o objeto do pedido

        if (newStatus === 'WAITING_FOR_DRIVER') {
          playAlert();
          showSuccess("Pedido pronto! Pode retirar.");
        }

        if (newStatus === 'OUT_FOR_DELIVERY') {
          setStep("to_client");
          showSuccess("Pedido liberado! Siga para o cliente.");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId, navigate]);

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
          if (data.status === 'CANCELLED') {
              showError("Este pedido já foi cancelado.");
              navigate("/driver/orders");
              return;
          }
          setOrder(data);
          if (data.status === 'OUT_FOR_DELIVERY' || data.status === 'DELIVERED') setStep("to_client");
        }
      } catch (err) {
        showError("Erro ao carregar rota.");
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

  useEffect(() => {
    const getDetailedRoute = async () => {
      if (currentLocation[0] === 0 || !targetPos) return;
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation[1]},${currentLocation[0]};${targetPos[1]},${targetPos[0]}?overview=full&geometries=geojson&steps=true`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes?.length > 0) {
          const route = data.routes[0];
          setRoutePoints(route.geometry.coordinates.map((c: any) => [c[1], c[0]]));
          if (route.legs[0]?.steps?.length > 1) setNextInstruction(route.legs[0].steps[1]);
        }
      } catch (e) {}
    };
    getDetailedRoute();
  }, [currentLocation, targetPos, step]);

  const getManeuverIcon = (type: string, modifier: string) => {
    if (modifier?.includes('left')) return <CornerUpLeft className="h-8 w-8" />;
    if (modifier?.includes('right')) return <CornerUpRight className="h-8 w-8" />;
    return <ArrowUp className="h-8 w-8" />;
  };

  const handleAbandonOrder = async () => {
    if (!order) return;
    // Se o pedido já foi cancelado, apenas saímos da tela
    if (order.status === 'CANCELLED') {
        navigate("/driver/orders");
        return;
    }

    const confirmation = window.confirm("ATENÇÃO: Tem certeza que deseja desistir desta entrega?");
    if (!confirmation) return;

    const tid = showLoading("Cancelando...");
    try {
      const { error } = await supabase.rpc('abandon_order', { p_order_id: order.id });
      if (error) throw error;
      dismissToast(tid);
      showSuccess("Entrega cancelada.");
      navigate("/driver/orders");
    } catch (err: any) {
      dismissToast(tid);
      showError("Erro: " + err.message);
    }
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

  if (loadingOrder) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-indigo-500" /></div>;
  if (!order) return null;

  const isReadyForPickup = order.status === 'WAITING_FOR_DRIVER';

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-50 overflow-hidden max-w-2xl mx-auto">
      {step !== "confirm" && nextInstruction && (
        <div className="absolute top-0 left-0 right-0 z-[1100] p-4">
          <div className="bg-green-600 text-white rounded-3xl p-5 shadow-2xl flex items-center gap-6 animate-in slide-in-from-top-10">
            <div className="p-3 bg-white/20 rounded-2xl">{getManeuverIcon(nextInstruction.maneuver.type, nextInstruction.maneuver.modifier)}</div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest opacity-80">Instrução</p>
              <p className="text-xl font-black leading-tight truncate">{nextInstruction.name || "Siga em frente"}</p>
              <p className="text-sm font-bold opacity-90">A {(nextInstruction.distance).toFixed(0)} metros</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative bg-slate-100 overflow-hidden">
        <div className="w-full h-full transition-transform duration-1000 ease-out" style={{ transform: `rotate(${-bearing}deg)`, transformOrigin: 'center' }}>
          {step !== "confirm" && (
            <MapContainer 
              center={currentLocation[0] !== 0 ? currentLocation : storePos} 
              zoom={mapZoom} 
              style={{ height: '140%', width: '140%', margin: '-20%' }} 
              zoomControl={false}
              dragging={true}
              scrollWheelZoom={true}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <NavigationController position={currentLocation} bearing={bearing} zoom={mapZoom} />
              {currentLocation[0] !== 0 && <Marker position={currentLocation} icon={driverIcon} />}
              {routePoints.length > 0 && <Polyline positions={routePoints} pathOptions={{ color: '#4f46e5', weight: 8, opacity: 0.9 }} />}
            </MapContainer>
          )}
        </div>

        {step !== "confirm" && (
          <div className="absolute right-6 bottom-32 z-[1100] flex flex-col gap-3">
             <Button size="icon" className="h-14 w-14 rounded-2xl bg-white text-indigo-900 shadow-2xl hover:bg-gray-50 border-none" onClick={() => setMapZoom(prev => Math.min(prev + 1, 20))}><Plus className="h-6 w-6" /></Button>
             <Button size="icon" className="h-14 w-14 rounded-2xl bg-white text-indigo-900 shadow-2xl hover:bg-gray-50 border-none" onClick={() => setMapZoom(prev => Math.max(prev - 1, 14))}><Minus className="h-6 w-6" /></Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="absolute inset-0 h-full flex flex-col items-center justify-center p-6 bg-slate-800 z-[1200]">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 text-center shadow-2xl">
              <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="h-8 w-8 text-green-600" /></div>
              <h3 className="text-2xl font-black text-indigo-900">Confirmar Entrega</h3>
              <div className="flex justify-center"><OtpInput length={4} value={otpCode} onChange={setOtpCode} /></div>
              <Button className="w-full h-16 rounded-2xl bg-green-600 text-white font-black text-lg" onClick={handleVerifyCode} disabled={otpCode.length < 4 || finishing}>
                {finishing ? <Loader2 className="animate-spin" /> : "Finalizar Pedido"}
              </Button>
              <Button variant="ghost" className="text-gray-400 font-bold" onClick={() => setStep("to_client")}>Voltar</Button>
            </div>
          </div>
        )}
      </div>

      {step !== "confirm" && (
        <div className="p-6 bg-white rounded-t-[2.5rem] z-[1100] space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className={cn("p-2 rounded-xl", isReadyForPickup ? "bg-green-100" : "bg-indigo-50")}>
                 {step === "to_store" ? <Store className={cn("h-5 w-5", isReadyForPickup ? "text-green-600" : "text-indigo-600")} /> : <User className="h-5 w-5 text-indigo-600" />}
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Destino</p>
                  <p className="font-bold text-gray-900 leading-none">
                    {step === "to_store" ? "Retirar na Loja" : "Entregar ao Cliente"}
                  </p>
                  {step === "to_store" && <p className={cn("text-[9px] font-bold mt-1", isReadyForPickup ? "text-green-600" : "text-indigo-500")}>
                    {isReadyForPickup ? "PEDIDO PRONTO PARA COLETA" : "Aguarde a liberação no balcão"}
                  </p>}
               </div>
            </div>
            <Button variant="ghost" onClick={handleAbandonOrder} className="rounded-xl h-10 px-4 text-red-500 font-bold"><XCircle className="h-4 w-4 mr-2" /> Desistir</Button>
          </div>
          
          {step === "to_client" && (
            <Button className="w-full h-16 rounded-2xl bg-indigo-600 text-white font-black text-lg" onClick={() => setStep("confirm")}>
              Cheguei no Cliente
            </Button>
          )}

          {step === "to_store" && (
             <div className={cn(
               "p-4 rounded-2xl flex items-center gap-3 border transition-all",
               isReadyForPickup ? "bg-green-50 border-green-200" : "bg-indigo-50 border-indigo-100"
             )}>
                {isReadyForPickup ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                )}
                <p className={cn("text-sm font-bold", isReadyForPickup ? "text-green-900" : "text-indigo-900")}>
                  {isReadyForPickup ? "Pedido Pronto! Vá ao balcão e solicite a liberação." : "Aguardando a loja marcar como pronto..."}
                </p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NavigationPage;