"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Store, Package, Clock, Loader2, Bike, AlertTriangle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { calculateDistance } from "@/utils/geo";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState<any>(null);
  
  const { currentLocation } = useDriverLocationTracker(true);

  const fetchDriverData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('driver_applications').select('*').eq('id', user.id).single();
    setDriverStats(data);
    return user.id;
  }, []);

  const checkForOffers = useCallback(async (driverId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*, merchant:merchant_id(*)')
      .eq('current_driver_offered_id', driverId)
      .eq('status', 'PENDING') // Ou logicamente adequado ao fluxo
      .single();

    if (data) {
      setOffer(data);
      const diff = Math.max(0, Math.floor((new Date(data.offer_expires_at).getTime() - new Date().getTime()) / 1000));
      setTimeLeft(diff);
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
        interval = setInterval(() => checkForOffers(id), 5000);
      }
    });
    return () => clearInterval(interval);
  }, [fetchDriverData, checkForOffers]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (offer) {
      handleReject(true); // Rejeição automática por tempo
    }
  }, [timeLeft, offer]);

  const handleAccept = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('orders')
      .update({ 
        driver_id: user?.id, 
        current_driver_offered_id: null,
        offer_expires_at: null 
      })
      .eq('id', offer.id);

    if (error) {
      showError("Oferta expirada ou aceita por outro.");
    } else {
      // Zera contador de recusas ao aceitar
      await supabase.from('driver_applications').update({ consecutive_refusals: 0 }).eq('id', user?.id);
      showSuccess("Pedido aceito!");
      navigate(`/driver/map?orderId=${offer.id}`);
    }
  };

  const handleReject = async (isAuto = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Adiciona ID do driver à lista de recusados do pedido
    const newRefused = [...(offer.refused_drivers_ids || []), user?.id];
    
    await supabase.from('orders').update({ 
      current_driver_offered_id: null,
      offer_expires_at: null,
      refused_drivers_ids: newRefused
    }).eq('id', offer.id);

    // Lógica de Penalidade
    const nextRefusals = (driverStats?.consecutive_refusals || 0) + 1;
    let updates: any = { consecutive_refusals: nextRefusals };
    
    if (nextRefusals >= 3) {
      updates.blocked_until = new Date(Date.now() + 15 * 60000).toISOString();
      updates.consecutive_refusals = 0;
      showError("Você recusou 3 pedidos e ficará 15 min sem ofertas.");
    }

    await supabase.from('driver_applications').update(updates).eq('id', user?.id);
    setOffer(null);
    
    // Chama o próximo via Edge Function (re-dispara o despacho para outro)
    supabase.functions.invoke('dispatch-order', { body: { orderId: offer.id } });
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  if (driverStats?.blocked_until && new Date(driverStats.blocked_until) > new Date()) {
    return (
      <div className="p-10 text-center space-y-4">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-black">Acesso Suspenso</h2>
        <p className="text-gray-500">Você recusou muitas ofertas. Volte em 15 minutos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-indigo-900">Radar de Pedidos</h1>
      
      {offer ? (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-in zoom-in-95">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center">
            <span className="font-black text-lg">NOVA OFERTA EXCLUSIVA</span>
            <div className="bg-white text-brand-accent px-4 py-1 rounded-full font-black text-xl">
              {timeLeft}s
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-3"><Store className="text-indigo-600" /><span className="font-black text-xl">{offer.merchant?.store_name}</span></div>
               <span className="text-2xl font-black text-green-600">R$ {(offer.total * 0.15 + 5).toFixed(2)}</span>
            </div>

            <div className="space-y-4 relative">
              <div className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">1</div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase">Retirada</p><p className="font-bold">{offer.merchant?.metadata?.address?.street}</p></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-brand-accent flex items-center justify-center text-white text-[10px] font-bold">2</div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase">Entrega</p><p className="font-bold">{offer.delivery_address?.neighborhood}</p></div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-red-500 font-bold" onClick={() => handleReject()}>Recusar</Button>
              <Button className="flex-2 h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xl shadow-xl shadow-green-100" onClick={handleAccept}>ACEITAR</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
           <div className="relative">
              <Bike className="h-20 w-20 text-gray-100 mb-4" />
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-10 w-10 text-indigo-200 animate-spin" /></div>
           </div>
           <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Buscando melhores rotas...</p>
        </div>
      )}
    </div>
  );
};

export default AvailableOrdersPage;