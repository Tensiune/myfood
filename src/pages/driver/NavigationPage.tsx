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

// Helper para gerenciar os eventos do mapa
const MapEventHandler = ({ onInteraction }: { onInteraction: () => void }) => {
  useMapEvents({
    dragstart: () => onInteraction(),
    zoomstart: () => onInteraction(),
    touchstart: () => onInteraction(),
  });
  return null;
};

const MapController = ({ center, isFollowing }: { center: [number, number], isFollowing: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (isFollowing && center && center[0] !== 0) {
      map.flyTo(center, map.getZoom());
    }
  }, [center, isFollowing, map]);
  return null;
};

const NavigationPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpCode, setOtpCode] = useState("");
  const [isFollowing, setIsFollowing] = useState(true); // Controle do foco
  
  const { currentLocation, heading } = useDriverLocationTracker(true);

  // Ícone dinâmico que gira conforme o 'heading' do GPS
  const driverIcon = useMemo(() => L.divIcon({
    html: `
      <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease-out;">
        <div class="bg-indigo-600 p-2 rounded-full border-2 border-white shadow-xl flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-600/20 rounded-full blur-sm -z-10"></div>
      </div>
    `,
    className: "", iconSize: [40, 40], iconAnchor: [20, 20]
  }), [heading]);

  useEffect(() => {
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
        setOrders(data || []);
      } catch (err) { showError("Erro na rota."); } 
      finally { setLoading(false); }
    };
    fetchActiveOrders();
    const channel = supabase.channel('nav_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchActiveOrders()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  const stops = useMemo(() => {
    const res: any[] = [];
    orders.forEach(o => {
      if (['PREPARING', 'WAITING_FOR_DRIVER'].includes(o.status)) {
        const addr = o.merchant?.metadata?.store_details?.address || o.merchant?.metadata?.address || {};
        res.push({ type: 'pickup', orderId: o.id, name: o.merchant?.store_name, address: addr, lat: parseFloat(addr.lat), lng: parseFloat(addr.lng), isReady: o.status === 'WAITING_FOR_DRIVER' });
      } else if (o.status === 'OUT_FOR_DELIVERY') {
        res.push({ type: 'delivery', orderId: o.id, name: "Cliente", address: o.delivery_address, lat: parseFloat(o.delivery_address?.lat), lng: parseFloat(o.delivery_address?.lng), code: o.confirmation_code });
      }
    });
    return res;
  }, [orders]);

  const activeStop = stops[0];
  // Prioriza seguir a posição do motorista se ele estiver em movimento, senão foca na parada
  const targetPos: [number, number] = currentLocation[0] !== 0 ? currentLocation : (activeStop ? [activeStop.lat, activeStop.lng] : [-23.55, -46.63]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <header className="bg-white p-4 border-b flex items-center justify-between z-30 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/orders")} className="rounded-full"><ArrowLeft /></Button>
        <h1 className="text-lg font-black text-indigo-900">Navegação em Tempo Real</h1>
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

        {/* BOTÃO DE CENTRALIZAR (Só aparece se o usuário moveu o mapa) */}
        {!isFollowing && (
            <Button 
                className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-brand-accent text-white font-black rounded-full shadow-2xl h-12 px-6 border-none animate-in fade-in slide-in-from-top-2"
                onClick={() => setIsFollowing(true)}
            >
                <LocateFixed className="h-4 w-4 mr-2" /> CENTRALIZAR
            </Button>
        )}

        {activeStop && (
            <Button 
                className="absolute bottom-6 right-6 z-[1000] bg-white text-indigo-900 font-bold rounded-full shadow-2xl h-14 px-6 border-none flex gap-2"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeStop.lat},${activeStop.lng}&travelmode=driving`, '_blank')}
            >
                <Navigation className="h-5 w-5 text-brand-accent" /> GPS EXTERNO
            </Button>
        )}
      </div>

      <div className="bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-20 max-h-[40%] overflow-y-auto shrink-0">
        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6" />
        {stops.length > 0 ? (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className={cn("p-3 rounded-2xl", activeStop.type === 'pickup' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")}>
                        {activeStop.type === 'pickup' ? <Store /> : <User />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Próximo Passo</p>
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{activeStop.name}</h3>
                    </div>
                </div>
                {activeStop.type === 'delivery' && (
                    <div className="space-y-3">
                        <OtpInput length={4} value={otpCode} onChange={setOtpCode} />
                        <Button className="w-full h-14 rounded-2xl bg-green-600 text-white font-black" onClick={() => {/* handler */}} disabled={otpCode.length < 4}>FINALIZAR</Button>
                    </div>
                )}
            </div>
        ) : (
            <p className="text-center text-gray-400 font-bold py-10">Rota concluída!</p>
        )}
      </div>
    </div>
  );
};

export default NavigationPage;