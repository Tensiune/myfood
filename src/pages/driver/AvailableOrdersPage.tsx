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
import { cn } from "@/lib/utils";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const { sendNotification } = useNativeNotifications();
  
  const lastOfferIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => { 
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL); 
    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const playAlert = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const sync = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Sincronizar Ofertas
    const { data: offers } = await supabase
        .from('orders')
        .select('*, merchant:merchant_applications(*)')
        .eq('current_driver_offered_id', user.id)
        .is('driver_id', null)
        .neq('status', 'CANCELLED');
    
    if (offers && offers.length > 0) {
      const activeOffer = offers[0];
      if (activeOffer.id !== lastOfferIdRef.current) {
          const expiresAt = new Date(activeOffer.offer_expires_at).getTime();
          const initialTime = Math.floor((expiresAt - Date.now()) / 1000);
          
          if (initialTime > 0) {
              setTimeLeft(initialTime);
              lastOfferIdRef.current = activeOffer.id;
              playAlert();
              sendNotification("Nova Oportunidade!", `Ganhos estimados: R$ ${activeOffer.total.toFixed(2)}`);
          } else {
              setOffer(null);
          }
      }
      setOffer(activeOffer);
    } else {
      setOffer(null);
      lastOfferIdRef.current = null;
    }

    // 2. Sincronizar Pedidos em Andamento
    const { data: accepted } = await supabase
        .from('orders')
        .select('*, merchant:merchant_applications(*)')
        .eq('driver_id', user.id)
        .not('status', 'in', '(DELIVERED,CANCELLED)');
    
    setActiveOrders(accepted || []);
    setLoading(false);
  }, [playAlert, sendNotification]);

  // Efeito para o Timer de 1 em 1 segundo
  useEffect(() => {
    if (offer && timeLeft > 0) {
        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setOffer(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [offer, timeLeft]);

  useEffect(() => {
    const checkStatus = () => setIsOnline(localStorage.getItem('driver_online_status') === 'online');
    checkStatus();
    
    // Sincronização periódica mais leve
    const interval = setInterval(() => {
        if (localStorage.getItem('driver_online_status') === 'online') sync();
    }, 5000);
    
    sync(); // Carga inicial
    return () => clearInterval(interval);
  }, [sync]);

  const handleAccept = async () => {
    if (!offer) return;
    
    const tid = showLoading("Confirmando...");
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { data, error } = await supabase
            .from('orders')
            .update({ 
                driver_id: user.id, 
                current_driver_offered_id: null, 
                offer_expires_at: null 
            })
            .eq('id', offer.id)
            .is('driver_id', null)
            .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
            showSuccess("Pedido adicionado à sua rota!");
            navigate(`/driver/map?orderId=${offer.id}`);
        } else {
            showError("Ops! Esta oferta expirou ou outro entregador aceitou.");
            setOffer(null);
        }
    } catch (err: any) {
        showError("Erro ao aceitar pedido.");
    } finally {
        dismissToast(tid);
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
                            <Badge className="bg-indigo-600 text-[9px] uppercase mt-1">Status: {order.status}</Badge>
                        </div>
                        <Button size="sm" className="rounded-xl h-10 px-4 font-bold" onClick={() => navigate(`/driver/map?orderId=${order.id}`)}>Ver no Mapa</Button>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      {offer && timeLeft > 0 && (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center">
            <span className="font-black text-sm uppercase">
                {activeOrders.length > 0 ? "Oferta Agrupada!" : "Nova Oferta!"}
            </span>
            <div className="bg-white text-brand-accent px-4 py-1 rounded-full font-black text-xl tabular-nums">
                {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="p-2 bg-indigo-50 rounded-full h-fit"><Store className="h-4 w-4 text-indigo-600" /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Coleta Próxima</p>
                    <p className="font-bold text-gray-800">{offer.merchant?.store_name || "Loja Parceira"}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{offer.delivery_address?.street}, {offer.delivery_address?.number}</p>
                  </div>
                </div>
                {activeOrders.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-green-600 mt-0.5" />
                        <p className="text-xs text-green-800 font-bold">Esta entrega está no caminho da sua rota atual. Aproveite!</p>
                    </div>
                )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-red-500 font-bold" onClick={() => { setOffer(null); lastOfferIdRef.current = null; }}>Ignorar</Button>
              <Button className="flex-2 h-16 rounded-2xl bg-green-600 text-white font-black text-xl shadow-lg active:scale-95 transition-all" onClick={handleAccept}>ACEITAR</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isOnline && !offer && activeOrders.length < 3 && (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-200 mb-3" />
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Buscando as melhores rotas para você...</p>
        </div>
      )}

      {!isOnline && (
        <Card className="rounded-[2rem] border-none bg-indigo-900 text-white p-8 text-center">
            <Power className="h-12 w-12 mx-auto mb-4 text-indigo-300" />
            <h3 className="text-xl font-bold mb-2">Você está Offline</h3>
            <p className="text-indigo-200 text-sm mb-6">Fique online para começar a receber ofertas de entrega na sua região.</p>
        </Card>
      )}
    </div>
  );
};

export default AvailableOrdersPage;