"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, CheckCircle2, ShieldAlert } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { cn } from "@/lib/utils";

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState<any>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  
  const pollingRef = useRef<any>(null);
  const { isTracking } = useDriverLocationTracker(true);

  const checkNewOffers = useCallback(async (uid: string) => {
    try {
      // Busca simplificada sem joins complexos para garantir que o RLS não bloqueie a query inteira
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('current_driver_offered_id', uid)
        .is('driver_id', null);

      if (error) throw error;

      if (data && data.length > 0) {
        const activeOffer = data[0];
        
        // Busca os dados do restaurante separadamente para evitar erro de join
        const { data: merchantData } = await supabase
          .from('merchant_applications')
          .select('store_name')
          .eq('id', activeOffer.merchant_id)
          .single();

        const expiresAt = new Date(activeOffer.offer_expires_at).getTime();
        const diff = Math.floor((expiresAt - Date.now()) / 1000);
        
        // Se a oferta ainda é válida (ou acabou de expirar por erro de sync, damos 10s)
        if (diff > -5) {
          setOffer({ ...activeOffer, merchant: merchantData });
          setTimeLeft(Math.max(diff, 15));
        } else {
          setOffer(null);
        }
      } else {
        setOffer(null);
      }
    } catch (err) {
      console.error("[Radar] Erro de busca:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setDriverId(user.id);

      const { data: stats } = await supabase.from('driver_applications').select('*').eq('id', user.id).single();
      setDriverStats(stats);

      await checkNewOffers(user.id);

      // Polling agressivo para testes
      pollingRef.current = setInterval(() => checkNewOffers(user.id), 4000);
      
      // Canal de tempo real
      const channel = supabase.channel(`radar_${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => checkNewOffers(user.id))
        .subscribe();

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        supabase.removeChannel(channel);
      };
    };

    initialize();
  }, [navigate, checkNewOffers]);

  useEffect(() => {
    if (offer && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (offer && timeLeft <= 0) { 
      setOffer(null); 
    }
  }, [offer, timeLeft]);

  const handleAccept = async () => {
    if (!driverId || !offer) return;
    try {
      const { data, error } = await supabase.from('orders').update({
        driver_id: driverId,
        current_driver_offered_id: null,
        offer_expires_at: null,
        status: 'WAITING_FOR_DRIVER'
      }).eq('id', offer.id).is('driver_id', null).select();

      if (error || !data || data.length === 0) {
        showError("A oferta não está mais disponível.");
        setOffer(null);
        return;
      }
      showSuccess("Pedido aceito!");
      navigate(`/driver/map?orderId=${offer.id}`);
    } catch (err) { showError("Erro ao aceitar."); }
  };

  const handleReject = async () => {
    if (!driverId || !offer) return;
    const newRefused = [...(offer.refused_drivers_ids || []), driverId];
    setOffer(null);
    await supabase.from('orders').update({ 
      current_driver_offered_id: null, 
      refused_drivers_ids: newRefused 
    }).eq('id', offer.id);
    
    supabase.functions.invoke('dispatch-order', { body: { orderId: offer.id } });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black text-indigo-900">Radar</h1>
        <Badge className={cn(driverStats?.status === 'APPROVED' ? "bg-green-500" : "bg-orange-500")}>
          {driverStats?.status === 'APPROVED' ? 'Aprovado' : 'Em Análise'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", isTracking ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase">GPS</p>
            <p className="text-xs font-bold">{isTracking ? "Transmitindo" : "Desconectado"}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", driverStats?.status === 'APPROVED' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600")}>
            {driverStats?.status === 'APPROVED' ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase">Sistema</p>
            <p className="text-xs font-bold">{driverStats?.status === 'APPROVED' ? "Pronto" : "Bloqueado"}</p>
          </div>
        </div>
      </div>
      
      {offer ? (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-in zoom-in-95">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center">
            <span className="font-black text-sm uppercase">Nova Oferta!</span>
            <div className="bg-white text-brand-accent px-4 py-1 rounded-full font-black text-xl">
              0:{timeLeft < 10 ? '0' : ''}{timeLeft}
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-black text-xl text-gray-900 block">
                  {offer.merchant?.store_name || "Loja Parceira"}
                </span>
                <p className="text-xs text-gray-500 font-bold uppercase mt-1">
                  Retirada em {offer.delivery_address?.neighborhood || "sua região"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase">Ganhos</p>
                <span className="text-2xl font-black text-green-600">R$ {(offer.total * 0.15 + 5).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-red-500 font-bold" onClick={handleReject}>RECUSAR</Button>
              <Button className="flex-2 h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xl shadow-lg" onClick={handleAccept}>ACEITAR</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-indigo-50">
          <Loader2 className="h-10 w-10 text-indigo-200 animate-spin mb-4" />
          <p className="text-gray-400 font-black uppercase text-[10px] text-center px-8">
            {driverStats?.status !== 'APPROVED' 
              ? "Sua conta está em análise. Você será notificado quando for liberado." 
              : "Aguardando novos pedidos na sua região..."}
          </p>
        </div>
      )}
    </div>
  );
};

export default AvailableOrdersPage;