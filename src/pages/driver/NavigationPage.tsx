"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Store, User, CheckCircle2, MapPin, Navigation, ExternalLink, AlertTriangle } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ícones customizados para o mapa
const driverIcon = L.divIcon({
  html: `<div class="bg-indigo-600 p-2 rounded-full border-2 border-white shadow-lg"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: "", iconSize: [36, 36], iconAnchor: [18, 36]
});

const stopIcon = (type: 'pickup' | 'delivery') => L.divIcon({
  html: `<div class="${type === 'pickup' ? 'bg-orange-500' : 'bg-green-600'} p-2 rounded-full border-2 border-white shadow-lg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">${type === 'pickup' ? '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' : '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'}</svg></div>`,
  className: "", iconSize: [32, 32], iconAnchor: [16, 32]
});

// Helper para centralizar o mapa
const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) map.flyTo(center, 15);
  }, [center, map]);
  return null;
};

const NavigationPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpCode, setOtpCode] = useState("");
  const { currentLocation } = useDriverLocationTracker(true);

  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/login"); return; }

        const { data, error } = await supabase
            .from('orders')
            .select('*, merchant:merchant_applications(*)')
            .eq('driver_id', user.id)
            .neq('status', 'DELIVERED')
            .neq('status', 'CANCELLED');

        if (error) throw error;
        setOrders(data || []);
      } catch (err: any) {
        showError("Erro ao carregar rota ativa.");
      } finally {
        setLoading(false);
      }
    };
    fetchActiveOrders();

    const channel = supabase.channel('driver_nav_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchActiveOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  const stops = useMemo(() => {
    if (!orders) return [];
    const result: any[] = [];
    
    // Coletas
    orders.filter(o => ['PREPARING', 'WAITING_FOR_DRIVER'].includes(o.status)).forEach(o => {
        const addr = o.merchant?.metadata?.store_details?.address || o.merchant?.metadata?.address || {};
        result.push({
            type: 'pickup',
            orderId: o.id,
            name: o.merchant?.store_name || "Loja",
            address: addr,
            lat: parseFloat(addr.lat),
            lng: parseFloat(addr.lng),
            isReady: o.status === 'WAITING_FOR_DRIVER'
        });
    });

    // Entregas
    orders.filter(o => o.status === 'OUT_FOR_DELIVERY').forEach(o => {
        result.push({
            type: 'delivery',
            orderId: o.id,
            name: "Cliente",
            address: o.delivery_address,
            lat: parseFloat(o.delivery_address?.lat),
            lng: parseFloat(o.delivery_address?.lng),
            code: o.confirmation_code
        });
    });

    return result;
  }, [orders]);

  const activeStop = stops[0];

  const handleOpenExternalMap = (stop: any) => {
    if (!stop.lat || !stop.lng) {
        showError("Coordenadas não disponíveis para este endereço.");
        return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleFinishStep = async (stop: any) => {
    if (stop.type === 'delivery' && otpCode !== stop.code) {
        showError("Código inválido.");
        return;
    }
    const nextStatus = stop.type === 'pickup' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
    const tid = showLoading("Atualizando...");
    try {
        const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', stop.orderId);
        if (error) throw error;
        showSuccess("Sucesso!");
        setOtpCode("");
    } catch (err: any) {
        showError("Erro: " + err.message);
    } finally {
        dismissToast(tid);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 h-10 w-10" /></div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top Bar fixo */}
      <header className="bg-white p-4 border-b border-gray-100 flex items-center justify-between z-30 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/orders")} className="rounded-full"><ArrowLeft /></Button>
        <h1 className="text-lg font-black text-indigo-900">Minha Rota</h1>
        <div className="w-10" />
      </header>

      {/* Área do Mapa */}
      <div className="flex-1 relative z-10 bg-slate-200">
        <MapContainer center={activeStop ? [activeStop.lat, activeStop.lng] : [-23.55, -46.63]} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {currentLocation[0] !== 0 && (
                <Marker position={currentLocation} icon={driverIcon} />
            )}

            {stops.map((s, i) => (
                <Marker key={`${s.orderId}-${i}`} position={[s.lat, s.lng]} icon={stopIcon(s.type)} />
            ))}

            {activeStop && <MapController center={[activeStop.lat, activeStop.lng]} />}
        </MapContainer>

        {/* Botão Flutuante de Navegação Externa */}
        {activeStop && (
            <Button 
                className="absolute bottom-6 right-6 z-[1000] bg-white text-indigo-900 font-bold rounded-full shadow-2xl h-14 px-6 border-none hover:bg-gray-50 flex gap-2 animate-bounce"
                onClick={() => handleOpenExternalMap(activeStop)}
            >
                <Navigation className="h-5 w-5 text-brand-accent" />
                ABRIR NO GPS
            </Button>
        )}
      </div>

      {/* Painel Inferior Deslizável (Lista de Paradas) */}
      <div className="bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-20 max-h-[50%] overflow-y-auto shrink-0">
        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6" />
        
        <div className="space-y-4">
            {stops.length === 0 ? (
                <div className="text-center py-10">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="font-bold text-gray-800">Sem paradas ativas!</p>
                    <Button variant="link" className="text-indigo-600" onClick={() => navigate("/driver/orders")}>Voltar para o Radar</Button>
                </div>
            ) : (
                stops.map((stop, index) => (
                    <Card key={`${stop.orderId}-${index}`} className={cn("rounded-3xl border-none shadow-sm overflow-hidden", index === 0 ? "ring-2 ring-indigo-600 bg-white" : "bg-gray-50 opacity-60")}>
                        <CardContent className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-xl", stop.type === 'pickup' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")}>
                                        {stop.type === 'pickup' ? <Store className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{index === 0 ? "Próxima Parada" : `Parada ${index + 1}`}</p>
                                        <h3 className="font-bold text-gray-900">{stop.name}</h3>
                                    </div>
                                </div>
                                {index === 0 && <Badge className={stop.type === 'pickup' ? "bg-orange-500" : "bg-green-600"}>{stop.type === 'pickup' ? "Coleta" : "Entrega"}</Badge>}
                            </div>

                            <p className="text-xs text-gray-500 flex items-start gap-2">
                                <MapPin className="h-3 w-3 text-indigo-400 mt-0.5" /> {stop.address?.street}, {stop.address?.number}
                            </p>

                            {index === 0 && (
                                <div className="pt-2 animate-in slide-in-from-bottom-2">
                                    {stop.type === 'delivery' ? (
                                        <div className="space-y-4">
                                            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex flex-col items-center">
                                                <p className="text-[10px] font-black text-green-800 uppercase mb-3">Código do Cliente</p>
                                                <OtpInput length={4} value={otpCode} onChange={setOtpCode} />
                                            </div>
                                            <Button className="w-full h-14 rounded-2xl bg-green-600 text-white font-black" onClick={() => handleFinishStep(stop)} disabled={otpCode.length < 4}>FINALIZAR ENTREGA</Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {!stop.isReady && (
                                                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center gap-3">
                                                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                                    <p className="text-xs text-orange-800 font-bold">Aguardando a loja preparar...</p>
                                                </div>
                                            )}
                                            <Button className={cn("w-full h-14 rounded-2xl font-black", stop.isReady ? "bg-indigo-600 text-white shadow-lg" : "bg-gray-100 text-gray-400")} onClick={() => handleFinishStep(stop)} disabled={!stop.isReady}>CONFIRMAR RETIRADA</Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default NavigationPage;