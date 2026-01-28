"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Navigation, 
  Key, 
  Loader2, 
  AlertTriangle,
  MapPin,
  Store,
  User,
  CheckCircle2
} from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { cn } from "@/lib/utils";

// Ícones customizados para o mapa do entregador
const driverIcon = L.divIcon({
  html: `<div class="bg-indigo-600 p-2 rounded-full shadow-xl border-2 border-white flex items-center justify-center transform -rotate-45">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>`,
  className: "custom-driver-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const storeIcon = L.divIcon({
  html: `<div class="bg-orange-500 p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>`,
  className: "custom-store-icon",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const clientIcon = L.divIcon({
  html: `<div class="bg-green-600 p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>`,
  className: "custom-client-icon",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// Componente para manter o mapa focado no entregador
const RecenterMap = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (position[0] !== 0) {
      map.flyTo(position, map.getZoom());
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
  const [otpCode, setOtpCode] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Hook de localização
  const { currentLocation } = useDriverLocationTracker(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoadingOrder(false);
        return;
      }
      
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
        console.error(err);
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

  const handleArrivedAtStore = () => {
    showSuccess("Chegada confirmada!");
    setStep("to_client");
  };

  const handleArrivedAtClient = () => {
    setStep("confirm");
  };

  const handleAbandonDelivery = async () => {
    if (!window.confirm("Tem certeza que deseja desistir desta entrega?")) return;
    
    setCancelling(true);
    const tid = showLoading("Cancelando rota...");
    try {
      const { error } = await supabase.rpc('abandon_order', { p_order_id: order.id });
      if (error) throw error;
      
      supabase.functions.invoke('dispatch-order', { body: { orderId: order.id } });
      dismissToast(tid);
      showSuccess("Você abandonou a entrega.");
      navigate("/driver/orders");
    } catch (err) {
      dismissToast(tid);
      showError("Erro ao desistir.");
    } finally {
      setCancelling(false);
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

  if (loadingOrder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-white font-bold">Carregando mapa e rota...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <p className="text-white font-bold mb-6">Nenhum pedido selecionado para navegação.</p>
        <Button onClick={() => navigate("/driver/orders")} className="bg-indigo-600">Voltar para Pedidos</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-50 overflow-hidden max-w-2xl mx-auto">
      {/* HUD Header */}
      <div className="p-4 bg-indigo-900 text-white z-20 border-b border-indigo-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/70 hover:text-white rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-indigo-300">
              {step === "to_store" ? "Fase: Coleta" : step === "to_client" ? "Fase: Entrega" : "Fase: Finalização"}
            </h2>
            <p className="font-bold truncate max-w-[200px]">
              {step === "to_store" ? order.merchant?.store_name : "Casa do Cliente"}
            </p>
          </div>
        </div>
        <Badge className="bg-indigo-700 border-none font-bold">#{order.id.slice(0, 6)}</Badge>
      </div>

      {/* Map Content */}
      <div className="flex-1 relative bg-slate-100">
        {step !== "confirm" ? (
          <MapContainer 
            center={currentLocation[0] !== 0 ? currentLocation : storePos} 
            zoom={15} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RecenterMap position={currentLocation} />
            
            {currentLocation[0] !== 0 && <Marker position={currentLocation} icon={driverIcon} />}
            <Marker position={storePos} icon={storeIcon} />
            <Marker position={clientPos} icon={clientIcon} />

            <Polyline 
              positions={[currentLocation[0] !== 0 ? currentLocation : storePos, targetPos]} 
              pathOptions={{ color: '#6366f1', weight: 4, dashArray: '10, 10', opacity: 0.6 }} 
            />
          </MapContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-800">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 text-center shadow-2xl animate-in zoom-in-95">
              <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-indigo-900">Finalizar Pedido</h3>
                <p className="text-gray-500 text-sm mt-1">Digite o código do cliente.</p>
              </div>
              <div className="flex justify-center">
                 <OtpInput length={4} value={otpCode} onChange={setOtpCode} />
              </div>
              <Button 
                className="w-full h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-lg"
                onClick={handleVerifyCode}
                disabled={otpCode.length < 4 || finishing}
              >
                {finishing ? <Loader2 className="animate-spin" /> : "Confirmar Entrega"}
              </Button>
              <Button variant="ghost" className="text-gray-400 font-bold" onClick={() => setStep("to_client")}>Voltar ao Mapa</Button>
            </div>
          </div>
        )}

        {/* GPS FAB */}
        {step !== "confirm" && (
           <Button 
             variant="secondary" 
             size="icon" 
             className="absolute bottom-6 right-6 z-[1000] rounded-full h-12 w-12 shadow-xl bg-white text-indigo-600"
             onClick={() => window.location.reload()}
           >
             <Navigation className="h-5 w-5" />
           </Button>
        )}
      </div>

      {/* Bottom Actions */}
      {step !== "confirm" && (
        <div className="p-6 bg-white rounded-t-[2.5rem] z-20 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              {step === "to_store" ? <Store className="h-6 w-6 text-indigo-600" /> : <User className="h-6 w-6 text-indigo-600" />}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Endereço de Destino</p>
               <p className="font-bold text-gray-900 truncate">
                 {step === "to_store" 
                   ? `${order.merchant?.metadata?.address?.street || ''}, ${order.merchant?.metadata?.address?.number || ''}` 
                   : `${order.delivery_address?.street || ''}, ${order.delivery_address?.number || ''}`}
               </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button 
              className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl"
              onClick={step === "to_store" ? handleArrivedAtStore : handleArrivedAtClient}
            >
              {step === "to_store" ? "Cheguei na Loja" : "Cheguei no Cliente"}
            </Button>

            {step === "to_store" && (
              <Button 
                variant="destructive"
                className="w-full h-12 rounded-xl font-bold bg-red-500 hover:bg-red-600 border-none gap-2"
                onClick={handleAbandonDelivery}
                disabled={cancelling}
              >
                <AlertTriangle className="h-4 w-4" /> Desistir da Entrega
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationPage;