"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Store, User, CheckCircle2, MapPin, Navigation, LocateFixed, MousePointer2 } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Helper para gerenciar os eventos do mapa e detectar interação manual
const MapEventHandler = ({ onInteraction }: { onInteraction: () => void }) => {
  useMapEvents({
    dragstart: () => onInteraction(),
    zoomstart: () => onInteraction(),
    touchstart: () => onInteraction(),
  });
  return null;
};

// Componente que "tranca" a câmera na posição do motorista
const MapController = ({ center, isFollowing }: { center: [number, number], isFollowing: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (isFollowing && center && center[0] !== 0) {
      // panTo é mais suave que flyTo para acompanhamento contínuo
      map.panTo(center, { animate: true, duration: 1 });
    }
  }, [center, isFollowing, map]);
  return null;
};

const NavigationPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpCode, setOtpCode] = useState("");
  const [isFollowing, setIsFollowing] = useState(true); // Controle do modo "Travar GPS"
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { currentLocation, heading } = useDriverLocationTracker(true);

  // Ícone dinâmico que gira conforme a bússola do celular
  const driverIcon = useMemo(() => L.divIcon({
    html: `
      <div style="transform: rotate(${heading}deg); transition: transform 0.2s linear;">
        <div class="bg-indigo-600 p-2 rounded-full border-2 border-white shadow-xl flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>
          </svg>
        </div>
      </div>
    `,
    className: "", iconSize: [40, 40], iconAnchor: [20, 20]
  }), [heading]);

  const fetchActiveOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      
      const { data, error } = await supabase
          .from('orders')
          .select('*, merchant:merchant_applications(*)')
          .eq('driver_id', user.id)
          .not('status', 'in', '(DELIVERED,CANCELLED)');
      
      if (error) throw error;

      // Buscar nomes reais dos clientes para cada pedido ativo
      const ordersWithCustomerNames = await Promise.all((data || []).map(async (order) => {
        const { data: customerName } = await supabase.rpc('get_user_full_name', { user_id: order.customer_id });
        return { ...order, customer_name: customerName || "Consumidor" };
      }));

      setOrders(ordersWithCustomerNames);
    } catch (err) { 
      console.error("Erro na rota:", err);
      showError("Não foi possível sincronizar os dados da rota."); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchActiveOrders();
    const channel = supabase.channel('nav_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchActiveOrders()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  const stops = useMemo(() => {
    const res: any[] = [];
    orders.forEach(o => {
      if (['PREPARING', 'WAITING_FOR_DRIVER'].includes(o.status)) {
        const addr = o.merchant?.metadata?.store_details?.address || o.merchant?.metadata?.address || {};
        res.push({ 
          type: 'pickup', 
          orderId: o.id, 
          name: o.merchant?.store_name || "Loja", 
          address: addr, 
          lat: parseFloat(addr.lat), 
          lng: parseFloat(addr.lng), 
          isReady: o.status === 'WAITING_FOR_DRIVER' 
        });
      } else if (o.status === 'OUT_FOR_DELIVERY') {
        res.push({ 
          type: 'delivery', 
          orderId: o.id, 
          name: o.customer_name, 
          address: o.delivery_address, 
          lat: parseFloat(o.delivery_address?.lat), 
          lng: parseFloat(o.delivery_address?.lng), 
          code: o.confirmation_code 
        });
      }
    });
    return res;
  }, [orders]);

  const activeStop = stops[0];
  const targetPos: [number, number] = currentLocation[0] !== 0 ? currentLocation : (activeStop ? [activeStop.lat, activeStop.lng] : [-23.55, -46.63]);

  const handleFinishStep = async (stop: any) => {
    if (stop.type === 'delivery' && otpCode !== stop.code) {
        showError("Código de confirmação incorreto.");
        return;
    }
    
    setIsProcessing(true);
    const tid = showLoading("Atualizando status...");
    const nextStatus = stop.type === 'pickup' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
    
    try {
        const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', stop.orderId);
        if (error) throw error;
        showSuccess(stop.type === 'pickup' ? "Retirada confirmada!" : "Pedido entregue com sucesso!");
        setOtpCode("");
        // Se foi a última entrega, volta para o radar
        if (stops.length <= 1 && stop.type === 'delivery') {
            navigate("/driver/orders");
        }
    } catch (err: any) {
        showError("Falha ao atualizar: " + err.message);
    } finally {
        dismissToast(tid);
        setIsProcessing(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <header className="bg-white p-4 border-b flex items-center justify-between z-30 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/orders")} className="rounded-full"><ArrowLeft /></Button>
        <h1 className="text-lg font-black text-indigo-900">Rota de Entrega</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 relative z-10 bg-slate-200">
        <MapContainer center={targetPos} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapEventHandler onInteraction={() => setIsFollowing(false)} />
            <MapController center={targetPos} isFollowing={isFollowing} />
            
            {currentLocation[0] !== 0 && <Marker position={currentLocation} icon={driverIcon} />}
            
            {stops.map((s, i) => (
              <Marker key={i} position={[s.lat, s.lng]} icon={L.divIcon({
                html: `<div class="${s.type === 'pickup' ? 'bg-orange-500' : 'bg-green-600'} p-2 rounded-full border-2 border-white shadow-lg"></div>`,
                className: "", iconSize: [20, 20]
              })} />
            ))}
        </MapContainer>

        {/* BOTÃO CENTRALIZAR */}
        {!isFollowing && (
            <Button 
                className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-brand-accent text-white font-black rounded-full shadow-2xl h-12 px-6 border-none animate-in fade-in slide-in-from-top-4"
                onClick={() => {
                    setIsFollowing(true);
                    // Força um pan imediato ao clicar
                    if (currentLocation[0] !== 0) showSuccess("Seguindo sua posição");
                }}
            >
                <LocateFixed className="h-4 w-4 mr-2" /> CENTRALIZAR
            </Button>
        )}

        {activeStop && (
            <Button 
                className="absolute bottom-6 right-6 z-[1000] bg-white text-indigo-900 font-bold rounded-full shadow-2xl h-14 px-6 border-none flex gap-2 active:scale-95 transition-transform"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeStop.lat},${activeStop.lng}&travelmode=driving`, '_blank')}
            >
                <Navigation className="h-5 w-5 text-brand-accent" /> GPS EXTERNO
            </Button>
        )}
      </div>

      <div className="bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-20 max-h-[45%] overflow-y-auto shrink-0">
        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6" />
        {stops.length > 0 ? (
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className={cn("p-4 rounded-2xl", activeStop.type === 'pickup' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")}>
                        {activeStop.type === 'pickup' ? <Store className="h-6 w-6" /> : <User className="h-6 w-6" />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeStop.type === 'pickup' ? "Retirar em" : "Entregar para"}</p>
                        <h3 className="font-bold text-gray-900 text-xl leading-tight">{activeStop.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{activeStop.address?.street}, {activeStop.address?.number}</p>
                    </div>
                </div>

                {activeStop.type === 'pickup' && (
                    <div className="pt-2">
                        {!activeStop.isReady && (
                            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-3 mb-3">
                                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                <p className="text-xs text-orange-800 font-bold">Aguardando a loja confirmar que o pedido está pronto.</p>
                            </div>
                        )}
                        <Button 
                            className={cn("w-full h-16 rounded-2xl font-black text-lg shadow-xl transition-all", activeStop.isReady ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed")} 
                            onClick={() => handleFinishStep(activeStop)} 
                            disabled={!activeStop.isReady || isProcessing}
                        >
                            CONFIRMAR RETIRADA
                        </Button>
                    </div>
                )}

                {activeStop.type === 'delivery' && (
                    <div className="space-y-4 pt-2">
                        <div className="bg-green-50 p-5 rounded-3xl border border-green-100 flex flex-col items-center">
                            <p className="text-xs font-black text-green-800 uppercase mb-4 tracking-wider">Código de Confirmação</p>
                            <OtpInput length={4} value={otpCode} onChange={setOtpCode} />
                        </div>
                        <Button 
                            className="w-full h-16 rounded-2xl bg-green-600 text-white font-black text-xl shadow-xl shadow-green-100 disabled:opacity-50" 
                            onClick={() => handleFinishStep(activeStop)} 
                            disabled={otpCode.length < 4 || isProcessing}
                        >
                            FINALIZAR ENTREGA
                        </Button>
                    </div>
                )}
            </div>
        ) : (
            <div className="text-center py-10 space-y-4">
                <div className="bg-indigo-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-indigo-600" />
                </div>
                <p className="text-gray-600 font-bold">Rota concluída! Nenhuma parada pendente.</p>
                <Button variant="outline" className="rounded-xl" onClick={() => navigate("/driver/orders")}>Ir para o Radar</Button>
            </div>
        )}
      </div>
    </div>
  );
};

export default NavigationPage;