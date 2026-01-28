"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, CheckCircle2, ShieldAlert, Clock } from "lucide-react";
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
      // REGRA: Se o banco diz que o pedido é seu, ele aparece.
      const { data, error } = await supabase
        .from('orders')
        .select('*, merchant:merchant_applications(store_name)')
        .eq('current_driver_offered_id', uid)
        .is('driver_id', null);

      if (error) throw error;

      if (data && data.length > 0) {
        const activeOffer = data[0];
        
        // Cálculo do tempo apenas para o cronômetro visual
        const expiresAt = new Date(activeOffer.offer_expires_at).getTime();
        const diff = Math.floor((expiresAt - Date.now()) / 1000);
        
        setOffer(activeOffer);
        // Se o tempo local estiver maluco, mostramos 30s fixos no visual para não confundir
        setTimeLeft(diff > 0 ? diff : 30); 
      } else {
        // Se o banco não retornou nada, limpamos a tela imediatamente
        setOffer(null);
      }
    } catch (err) {
      console.error("[Radar] Erro de sincronia:", err);
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

      // Polling de segurança (Sincroniza o estado a cada 5s caso o Realtime falhe)
      pollingRef.current = setInterval(() => checkNewOffers(user.id), 5000);
      
      // REALTIME: O sinal mestre do servidor
      const channel = supabase.channel(`radar_sync_${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, (payload: any) => {
          console.log("[Radar] Sinal do Servidor:", payload.eventType);
          
          // Se houve qualquer mudança na tabela de ordens, re-sincronizamos o estado local com o banco
          checkNewOffers(user.id);
        })
        .subscribe();

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        supabase.removeChannel(channel);
      };
    };

    initialize();
  }, [navigate, checkNewOffers]);

  // Cronômetro APENAS VISUAL - Não remove o card da tela.
  useEffect(() => {
    if (offer && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
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
        showError("Este pedido já foi pego por outro entregador ou expirou.");
        setOffer(null);
        return;
      }
      showSuccess("Pedido aceito com sucesso!");
      navigate(`/driver/map?orderId=${offer.id}`);
    } catch (err) { showError("Erro de conexão ao aceitar."); }
  };

  const handleReject = async () => {
    if (!driverId || !offer) return;
    // Removemos localmente para feedback imediato
    const currentId = offer.id;
    setOffer(null);
    
    const newRefused = [...(offer.refused_drivers_ids || []), driverId];
    await supabase.from('orders').update({ 
      current_driver_offered_id: null, 
      refused_drivers_ids: newRefused 
    }).eq('id', currentId);
    
    // Chama o despacho para o próximo motorista
    supabase.functions.invoke('dispatch-order', { body: { orderId: currentId } });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black text-indigo-900">Radar</h1>
        <Badge className={cn(driverStats?.status === 'APPROVED' ? "bg-green-500" : "bg-orange-500")}>
          {driverStats?.status === 'APPROVED' ? 'Disponível' : 'Em Análise'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", isTracking ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase">Localização</p>
            <p className="text-xs font-bold">{isTracking ? "Ativa" : "Inativa"}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", driverStats?.status === 'APPROVED' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600")}>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase">Conta</p>
            <p className="text-xs font-bold">{driverStats?.status === 'APPROVED' ? "Verificada" : "Pendente"}</p>
          </div>
        </div>
      </div>
      
      {offer ? (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-in zoom-in-95">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
               <Clock className="h-4 w-4 animate-pulse" />
               <span className="font-black text-sm uppercase">Pedido Recebido</span>
            </div>
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
                   Distância calculada pelo servidor
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase">Você recebe</p>
                <span className="text-2xl font-black text-green-600">R$ {(offer.total * 0.15 + 5).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-red-500 font-bold" onClick={handleReject}>RECUSAR</Button>
              <Button className="flex-2 h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xl shadow-lg" onClick={handleAccept}>ACEITAR AGORA</Button>
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