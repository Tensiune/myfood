"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Store, ShoppingBag, Clock, Map, XCircle, AlertTriangle, Power, FileText, Bell } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useNativeNotifications } from "@/hooks/useNativeNotifications";
import { calculateDistance } from "@/utils/geo";
import { cn } from "@/lib/utils";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const { sendNotification } = useNativeNotifications();
  
  const lastOfferIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => { audioRef.current = new Audio(NOTIFICATION_SOUND_URL); }, []);

  const playAlert = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const sync = useCallback(async (uid: string) => {
    // 1. Sincronizar Ofertas
    const { data: offers } = await supabase.from('orders').select('*, merchant:merchant_applications(*)').eq('current_driver_offered_id', uid).is('driver_id', null).neq('status', 'CANCELLED');
    
    if (offers && offers.length > 0) {
      const activeOffer = offers[0];
      if (activeOffer.id !== lastOfferIdRef.current) {
          const expiresAt = new Date(activeOffer.offer_expires_at).getTime();
          setTimeLeft(Math.floor((expiresAt - Date.now()) / 1000));
          lastOfferIdRef.current = activeOffer.id;
          playAlert();
          sendNotification("Nova Oportunidade!", `Ganhos estimados: R$ ${activeOffer.total.toFixed(2)}`);
      }
      setOffer(activeOffer);
    } else {
      setOffer(null);
      lastOfferIdRef.current = null;
    }

    // 2. Sincronizar Pedidos em Andamento
    const { data: accepted } = await supabase.from('orders').select('*, merchant:merchant_applications(*)').eq('driver_id', uid).not('status', 'in', '(DELIVERED,CANCELLED)');
    setActiveOrders(accepted || []);
    setLoading(false);
  }, [playAlert, sendNotification]);

  useEffect(() => {
    const checkStatus = () => setIsOnline(localStorage.getItem('driver_online_status') === 'online');
    checkStatus();
    const interval = setInterval(() => {
        const { data: { user } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user && localStorage.getItem('driver_online_status') === 'online') sync(session.user.id);
        });
    }, 4000);
    return () => clearInterval(interval);
  }, [sync]);

  const handleAccept = async () => {
    const tid = showLoading("Confirmando...");
    const { data, error } = await supabase.from('orders').update({ driver_id: driverId, current_driver_offered_id: null, offer_expires_at: null }).eq('id', offer.id).is('driver_id', null).select();
    dismissToast(tid);
    if (!error && data?.length) {
      showSuccess("Pedido adicionado à sua rota!");
      navigate(`/driver/map?orderId=${offer.id}`);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-indigo-900">Radar de Entregas</h1>

      {activeOrders.length > 0 && (
        <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase ml-1">Sua Rota Atual ({activeOrders.length})</p>
            {activeOrders.map(order => (
                <Card key={order.id} className="rounded-2xl border-indigo-100 bg-indigo-50/30">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-800">{order.merchant?.store_name}</p>
                            <Badge className="bg-indigo-600 text-[9px] uppercase mt-1">{order.status}</Badge>
                        </div>
                        <Button size="sm" className="rounded-xl" onClick={() => navigate(`/driver/map?orderId=${order.id}`)}>Ver no Mapa</Button>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      {offer && (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-bounce-short">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center">
            <span className="font-black text-sm uppercase">Oferta Concomitante!</span>
            <div className="bg-white text-brand-accent px-4 py-1 rounded-full font-black text-xl tabular-nums">0:{timeLeft < 10 ? '0' : ''}{timeLeft}</div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="p-2 bg-indigo-50 rounded-full h-fit"><Store className="h-4 w-4 text-indigo-600" /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Coleta Próxima</p>
                    <p className="font-bold text-gray-800">{offer.merchant?.store_name}</p>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                    <p className="text-xs text-green-800 font-bold">Esta entrega está no caminho da sua rota atual!</p>
                </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-red-500 font-bold" onClick={() => setOffer(null)}>Ignorar</Button>
              <Button className="flex-2 h-16 rounded-2xl bg-green-600 text-white font-black text-xl" onClick={handleAccept}>ACEITAR</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isOnline && !offer && activeOrders.length < 3 && (
        <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-200 mb-2" />
          <p className="text-gray-400 font-bold uppercase text-[10px]">Aguardando novas oportunidades...</p>
        </div>
      )}
    </div>
  );
};

export default AvailableOrdersPage;