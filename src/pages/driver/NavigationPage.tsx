"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Store, User, CheckCircle2, MapPin, Navigation, LocateFixed, Clock, ChevronRight, MessageCircle, PhoneCall } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { useAuth } from "@/context/AuthContext";
import { useNativeNotifications } from "@/hooks/useNativeNotifications";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";

const MapEventHandler = ({ onInteraction }: { onInteraction: () => void }) => {
  useMapEvents({ dragstart: onInteraction, zoomstart: onInteraction, touchstart: onInteraction });
  return null;
};

const MapController = ({ center, isFollowing }: { center: [number, number], isFollowing: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (isFollowing && center && center[0] !== 0) {
      map.panTo(center, { animate: true, duration: 1 });
    }
  }, [center, isFollowing, map]);
  return null;
};

const NavigationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sendNotification } = useNativeNotifications();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpCode, setOtpCode] = useState("");
  const [isFollowing, setIsFollowing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [offer, setOffer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastOfferIdRef = useRef<string | null>(null);
  
  const { currentLocation, heading } = useDriverLocationTracker(true, user?.id || null);

  useEffect(() => { 
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL); 
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, []);

  const playAlert = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const driverIcon = useMemo(() => L.divIcon({
    html: `<div style="transform: rotate(${heading}deg); transition: transform 0.2s linear;"><div class="bg-indigo-600 p-2 rounded-full border-2 border-white shadow-xl flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg></div></div>`,
    className: "", iconSize: [40, 40], iconAnchor: [20, 20]
  }), [heading]);

  const fetchStatusAndOffers = useCallback(async () => {
    if (!user) return;
    try {
      const { data: acceptedData } = await supabase
          .from('orders')
          .select('*, merchant:merchant_applications(*)')
          .eq('driver_id', user.id)
          .not('status', 'in', '(DELIVERED,CANCELLED)');
      
      const ordersWithNames = await Promise.all((acceptedData || []).map(async (order) => {
        const { data: customerName } = await supabase.rpc('get_user_full_name', { user_id: order.customer_id });
        return { ...order, customer_name: customerName || "Consumidor" };
      }));
      setOrders(ordersWithNames);
      
      const { data: offerData } = await supabase
          .from('orders')
          .select('*, merchant:merchant_applications(*)')
          .eq('current_driver_offered_id', user.id)
          .is('driver_id', null)
          .neq('status', 'CANCELLED');
      
      if (offerData && offerData.length > 0) {
        const activeOffer = offerData[0];
        const expiresAt = new Date(activeOffer.offer_expires_at).getTime();
        const initialTime = Math.floor((expiresAt - Date.now()) / 1000);
        
        if (initialTime > 0) {
            if (activeOffer.id !== lastOfferIdRef.current) {
                lastOfferIdRef.current = activeOffer.id;
                playAlert();
                sendNotification("Nova Oferta de Entrega!", `Ganhos: R$ ${activeOffer.total.toFixed(2)}`);
            }
            setTimeLeft(initialTime);
            setOffer(activeOffer);
        } else {
            setOffer(null);
        }
      } else {
        setOffer(null);
        lastOfferIdRef.current = null;
      }
    } catch (err) { 
      console.error("[NAV] Sync Error:", err);
    } finally { 
      setLoading(false); 
    }
  }, [user, playAlert, sendNotification]);

  useEffect(() => {
    if (!user) return;
    fetchStatusAndOffers();
    const interval = setInterval(fetchStatusAndOffers, 5000);
    return () => clearInterval(interval);
  }, [user, fetchStatusAndOffers]);

  useEffect(() => {
    if (offer && timeLeft > 0) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
        }, 1000);
    }
  }, [offer, timeLeft]);

  const stops = useMemo(() => {
    const res: any[] = [];
    orders.forEach(o => {
      if (['PREPARING', 'WAITING_FOR_DRIVER'].includes(o.status)) {
        const addr = o.merchant?.metadata?.store_details?.address || o.merchant?.metadata?.address || {};
        res.push({ 
            type: 'pickup', 
            orderId: o.id, 
            name: o.merchant?.store_name || "Loja", 
            contactId: o.merchant_id,
            phone: o.merchant?.phone,
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
            contactId: o.customer_id,
            phone: o.delivery_address?.phone,
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
        showError("Código incorreto.");
        return;
    }
    setIsProcessing(true);
    const tid = showLoading("Atualizando...");
    try {
        const { error } = await supabase.from('orders').update({ status: stop.type === 'pickup' ? 'OUT_FOR_DELIVERY' : 'DELIVERED' }).eq('id', stop.orderId);
        if (error) throw error;
        showSuccess(stop.type === 'pickup' ? "Retirado!" : "Entregue!");
        setOtpCode("");
        if (user) supabase.functions.invoke('dispatch-order', { body: { driverId: user.id } }).catch(() => {});
        if (stops.length <= 1 && stop.type === 'delivery') navigate("/driver/orders");
    } catch (err: any) { showError(err.message); } 
    finally { dismissToast(tid); setIsProcessing(false); }
  };

  const handleAcceptOffer = async () => {
    if (!offer || !user) return;
    setIsProcessing(true);
    const tid = showLoading("Aceitando...");
    try {
        const { data, error } = await supabase.from('orders').update({ driver_id: user.id, current_driver_offered_id: null, offer_expires_at: null }).eq('id', offer.id).is('driver_id', null).select();
        if (error) throw error;
        if (data && data.length > 0) {
            showSuccess("Nova entrega adicionada à rota!");
            setOffer(null);
            fetchStatusAndOffers();
        } else {
            showError("Oferta expirada.");
            setOffer(null);
        }
    } catch (err: any) { showError("Erro ao aceitar."); } 
    finally { dismissToast(tid); setIsProcessing(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <header className="bg-white p-4 border-b flex items-center justify-between z-30 shrink-0 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/orders")} className="rounded-full"><ArrowLeft /></Button>
        <h1 className="text-lg font-black text-indigo-900">Mapa de Rota</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 relative z-10">
        <MapContainer center={targetPos} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapEventHandler onInteraction={() => setIsFollowing(false)} />
            <MapController center={targetPos} isFollowing={isFollowing} />
            {currentLocation[0] !== 0 && <Marker position={currentLocation} icon={driverIcon} />}
            {stops.map((s, i) => (
              <Marker key={i} position={[s.lat, s.lng]} icon={L.divIcon({ html: `<div class="${s.type === 'pickup' ? 'bg-orange-500' : 'bg-green-600'} p-2 rounded-full border-2 border-white shadow-lg"></div>`, className: "", iconSize: [20, 20] })} />
            ))}
        </MapContainer>

        {offer && timeLeft > 0 && (
            <div className="absolute top-4 left-4 right-4 z-[2000] animate-in slide-in-from-top-4 duration-500">
                <Card className="rounded-3xl border-4 border-brand-accent shadow-2xl bg-white overflow-hidden">
                    <div className="bg-brand-accent p-3 text-white flex justify-between items-center">
                        <span className="font-black text-xs uppercase">Nova Entrega Disponível!</span>
                        <Badge variant="secondary" className="font-black tabular-nums">{timeLeft}s</Badge>
                    </div>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl"><Store className="h-4 w-4 text-indigo-600" /></div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 truncate">{offer.merchant?.store_name}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Ganhos: R$ {offer.total.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="flex-1 text-red-500 font-bold" onClick={() => setOffer(null)}>Ignorar</Button>
                            <Button size="sm" className="flex-2 bg-green-600 text-white font-black" onClick={handleAcceptOffer}>ACEITAR</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {!isFollowing && (
            <Button className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[1000] bg-brand-accent text-white font-black rounded-full shadow-2xl h-12 px-6 border-none" onClick={() => setIsFollowing(true)}>
                <LocateFixed className="h-4 w-4 mr-2" /> CENTRALIZAR
            </Button>
        )}

        {activeStop && (
            <div className="absolute bottom-32 right-4 z-[1000] flex flex-col gap-2">
                <Button className="bg-white text-indigo-900 font-bold rounded-full shadow-2xl h-12 px-4 border-none flex gap-2" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeStop.lat},${activeStop.lng}&travelmode=driving`, '_blank')}>
                    <Navigation className="h-4 w-4 text-brand-accent" /> GPS
                </Button>
                <div className="flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-1 rounded-3xl shadow-2xl border border-gray-100">
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-indigo-600 hover:bg-indigo-50" onClick={() => navigate(`/chat/${activeStop.contactId}?orderId=${activeStop.orderId}`)}>
                        <MessageCircle className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-indigo-600 hover:bg-indigo-50" asChild>
                        <a href={`tel:${activeStop.phone || ""}`}><PhoneCall className="h-6 w-6" /></a>
                    </Button>
                </div>
            </div>
        )}
      </div>

      <div className="bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-20 max-h-[40%] overflow-y-auto shrink-0">
        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6" />
        {stops.length > 0 ? (
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className={cn("p-4 rounded-2xl", activeStop.type === 'pickup' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")}>
                        {activeStop.type === 'pickup' ? <Store className="h-6 w-6" /> : <User className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeStop.type === 'pickup' ? "Retirar em" : "Entregar para"}</p>
                        <h3 className="font-bold text-gray-900 text-xl leading-tight truncate">{activeStop.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 truncate">{activeStop.address?.street}, {activeStop.address?.number}</p>
                    </div>
                </div>
                {activeStop.type === 'pickup' && (
                    <Button className={cn("w-full h-16 rounded-2xl font-black text-lg shadow-xl", activeStop.isReady ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400")} onClick={() => handleFinishStep(activeStop)} disabled={!activeStop.isReady || isProcessing}>CONFIRMAR RETIRADA</Button>
                )}
                {activeStop.type === 'delivery' && (
                    <div className="space-y-4 pt-2">
                        <div className="bg-green-50 p-5 rounded-3xl flex flex-col items-center">
                            <p className="text-xs font-black text-green-800 uppercase mb-4">Código do Cliente</p>
                            <OtpInput length={4} value={otpCode} onChange={setOtpCode} />
                        </div>
                        <Button className="w-full h-16 rounded-2xl bg-green-600 text-white font-black text-xl shadow-xl" onClick={() => handleFinishStep(activeStop)} disabled={otpCode.length < 4 || isProcessing}>FINALIZAR ENTREGA</Button>
                    </div>
                )}
            </div>
        ) : (
            <div className="text-center py-10 space-y-4">
                <CheckCircle2 className="h-8 w-8 text-indigo-600 mx-auto" />
                <p className="text-gray-600 font-bold">Nenhuma parada pendente.</p>
                <Button variant="outline" className="rounded-xl" onClick={() => navigate("/driver/orders")}>Radar de Pedidos</Button>
            </div>
        )}
      </div>
    </div>
  );
};

export default NavigationPage;