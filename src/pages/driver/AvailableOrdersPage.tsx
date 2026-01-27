"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Store, Package, Clock, Loader2, Bike, AlertTriangle, TrendingUp } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState<any>(null);
  
  // Rastreamento ativo para ser visto pela Edge Function
  const { isTracking } = useDriverLocationTracker(true);

  const fetchDriverData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('driver_applications').select('*').eq('id', user.id).single();
    setDriverStats(data);
    return user.id;
  }, []);

  const checkForOffers = useCallback(async (driverId: string) => {
    // Busca pedidos onde este entregador é o ofertado ATUAL
    const { data, error } = await supabase
      .from('orders')
      .select('*, merchant:merchant_id(*)')
      .eq('current_driver_offered_id', driverId)
      .in('status', ['PREPARING', 'WAITING_FOR_DRIVER', 'PENDING'])
      .single();

    if (data) {
      const expiresAt = new Date(data.offer_expires_at).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      
      if (diff > 0) {
        setOffer(data);
        setTimeLeft(diff);
      } else {
        // Se expirou e ainda está aqui, limpa localmente
        setOffer(null);
      }
    } else {
      setOffer(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let interval: any;
    fetchDriverData().then(id => {
      if (id) {
        checkForOffers(id);
        interval = setInterval(() => checkForOffers(id), 4000);
      }
    });
    return () => clearInterval(interval);
  }, [fetchDriverData, checkForOffers]);

  // Efeito do Timer
  useEffect(() => {
    if (timeLeft > 0 && offer) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (offer && timeLeft === 0) {
      handleReject(true); // Recusa automática por tempo
    }
  }, [timeLeft, offer]);

  const handleAccept = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Transação de aceite: Remove oferta e define como driver oficial
    const { error } = await supabase
      .from('orders')
      .update({ 
        driver_id: user?.id, 
        current_driver_offered_id: null,
        offer_expires_at: null 
      })
      .eq('id', offer.id)
      .is('driver_id', null); // Garante atomicidade (ninguém aceitou antes)

    if (error) {
      showError("Tarde demais! A oferta expirou ou outro aceitou.");
      setOffer(null);
    } else {
      // Zera contador de recusas
      await supabase.from('driver_applications').update({ consecutive_refusals: 0 }).eq('id', user?.id);
      showSuccess("Pedido aceito! Vá até a loja.");
      navigate(`/driver/map?orderId=${offer.id}`);
    }
  };

  const handleReject = async (isAuto = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !offer) return;

    // 1. Registrar recusa no pedido (para não ofertar de novo pro mesmo)
    const newRefused = [...(offer.refused_drivers_ids || []), user.id];
    await supabase.from('orders').update({ 
      current_driver_offered_id: null,
      offer_expires_at: null,
      refused_drivers_ids: newRefused
    }).eq('id', offer.id);

    // 2. Incrementar penalidade
    const nextRefusals = (driverStats?.consecutive_refusals || 0) + 1;
    let updates: any = { consecutive_refusals: nextRefusals };
    
    if (nextRefusals >= 3) {
      // Bloqueio de 15 minutos
      const blockedUntil = new Date(Date.now() + 15 * 60000).toISOString();
      updates.blocked_until = blockedUntil;
      updates.consecutive_refusals = 0;
      showError("Você ignorou 3 pedidos. Seu radar ficará desligado por 15 min.");
    } else {
      showError(isAuto ? "Oferta expirada." : "Oferta recusada.");
    }

    await supabase.from('driver_applications').update(updates).eq('id', user.id);
    setOffer(null);
    
    // 3. Notifica a Edge Function para procurar o PRÓXIMO motorista
    supabase.functions.invoke('dispatch-order', { body: { orderId: offer.id } });
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>;

  // Verificação de bloqueio
  if (driverStats?.blocked_until && new Date(driverStats.blocked_until) > new Date()) {
    return (
      <div className="p-10 text-center space-y-6 animate-in fade-in">
        <div className="bg-red-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-gray-900">Radar Bloqueado</h2>
          <p className="text-gray-500 mt-2">Você recusou muitas ofertas consecutivas. Sua conta voltará ao normal em instantes.</p>
        </div>
        <Badge variant="outline" className="text-red-500 border-red-200 h-10 px-6 rounded-full font-black text-lg">
           {Math.ceil((new Date(driverStats.blocked_until).getTime() - Date.now()) / 60000)} min restantes
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black text-indigo-900">Radar Ativo</h1>
        <Badge className="bg-green-500 animate-pulse border-none">Online</Badge>
      </div>
      
      {offer ? (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
               <TrendingUp className="h-5 w-5" />
               <span className="font-black text-sm uppercase tracking-tighter">Oferta Prioritária</span>
            </div>
            <div className="bg-white text-brand-accent px-4 py-1 rounded-full font-black text-xl tabular-nums shadow-lg">
              0:{timeLeft < 10 ? '0' : ''}{timeLeft}
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 rounded-2xl"><Store className="text-indigo-600 h-6 w-6" /></div>
                  <span className="font-black text-xl text-gray-900 leading-tight">{offer.merchant?.store_name}</span>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Ganhos</p>
                  <span className="text-2xl font-black text-green-600">R$ {(offer.total * 0.15 + 5).toFixed(2)}</span>
               </div>
            </div>

            <div className="space-y-5 relative">
              <div className="absolute left-3 top-6 bottom-6 w-0.5 bg-dashed border-l-2 border-indigo-100 border-dashed" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow-md">1</div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coleta na Loja</p>
                  <p className="font-bold text-gray-700 leading-tight">{offer.merchant?.metadata?.address?.street}, {offer.merchant?.metadata?.address?.number}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="h-6 w-6 rounded-full bg-brand-accent flex items-center justify-center text-white text-[10px] font-bold shadow-md">2</div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entrega no Cliente</p>
                  <p className="font-bold text-gray-700 leading-tight">{offer.delivery_address?.neighborhood}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-red-500 font-bold hover:bg-red-50" onClick={() => handleReject()}>Recusar</Button>
              <Button className="flex-2 h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xl shadow-xl shadow-green-100 active:scale-95 transition-all" onClick={handleAccept}>ACEITAR</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-indigo-50 shadow-inner">
           <div className="relative mb-6">
              <Bike className="h-20 w-20 text-indigo-50 opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-12 w-12 text-indigo-200 animate-spin" /></div>
           </div>
           <p className="text-gray-400 font-black uppercase tracking-widest text-xs text-center px-8">
             Aguardando novos pedidos<br/>num raio de 5km de você
           </p>
        </div>
      )}

      {/* Dica de ganhos */}
      <Card className="rounded-3xl bg-indigo-900 p-6 text-white border-none shadow-xl">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl"><TrendingUp className="text-indigo-300" /></div>
            <div>
               <p className="text-xs font-bold text-indigo-200 uppercase">Dica do dia</p>
               <p className="text-sm font-medium">Fique próximo a centros comerciais para receber mais ofertas.</p>
            </div>
         </div>
      </Card>
    </div>
  );
};

export default AvailableOrdersPage;