"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Store, Package, Clock, Loader2, Bike, AlertTriangle, TrendingUp, RefreshCcw } from "lucide-react";
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
  
  // Ref para evitar múltiplas subscrições simultâneas
  const channelRef = useRef<any>(null);

  // Ativa o rastreamento GPS
  const { isTracking } = useDriverLocationTracker(true);

  // Buscar oferta ativa de forma direta e sem filtros no JS para evitar erros de tipo
  const findActiveOffer = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, merchant:merchant_id(*)')
        .eq('current_driver_offered_id', uid)
        .is('driver_id', null)
        .not('status', 'in', '("DELIVERED","CANCELLED")')
        .maybeSingle();

      if (error) throw error;

      if (data && data.offer_expires_at) {
        const expiresAt = new Date(data.offer_expires_at).getTime();
        const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        
        if (diff > 0) {
          setOffer(data);
          setTimeLeft(diff);
          console.log("[Radar] Oferta encontrada:", data.id);
        } else {
          setOffer(null);
        }
      } else {
        setOffer(null);
      }
    } catch (err) {
      console.error("[Radar] Erro ao buscar oferta:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDriverData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    setDriverId(user.id);
    
    const { data } = await supabase
      .from('driver_applications')
      .select('*')
      .eq('id', user.id)
      .single();
      
    setDriverStats(data);
    return user.id;
  }, []);

  // Rejeitar oferta
  const handleReject = useCallback(async (isAuto = false) => {
    if (!driverId || !offer) return;

    console.log(`[Radar] Rejeitando oferta ${offer.id}. Auto: ${isAuto}`);

    try {
      const newRefused = [...(offer.refused_drivers_ids || []), driverId];
      
      // Remove a oferta de mim primeiro para atualizar a UI instantaneamente
      const currentOfferId = offer.id;
      setOffer(null);

      // Atualiza no banco
      await supabase
        .from('orders')
        .update({
          current_driver_offered_id: null,
          offer_expires_at: null,
          refused_drivers_ids: newRefused
        })
        .eq('id', currentOfferId);

      // Penalidade
      const nextRefusals = (driverStats?.consecutive_refusals || 0) + 1;
      let updates: any = { consecutive_refusals: nextRefusals };

      if (nextRefusals >= 3) {
        const blockedUntil = new Date(Date.now() + 15 * 60000).toISOString();
        updates.blocked_until = blockedUntil;
        updates.consecutive_refusals = 0;
        showError("Radar bloqueado por 15 min devido a múltiplas recusas.");
      } else {
        if (!isAuto) showSuccess("Oferta recusada.");
      }

      await supabase.from('driver_applications').update(updates).eq('id', driverId);

      // Chama o despacho novamente para o próximo da fila
      supabase.functions.invoke('dispatch-order', { body: { orderId: currentOfferId } });

    } catch (err) {
      console.error("[Radar] Erro ao rejeitar:", err);
    }
  }, [offer, driverStats, driverId]);

  const handleAccept = async () => {
    if (!driverId || !offer) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          driver_id: driverId,
          current_driver_offered_id: null,
          offer_expires_at: null,
          status: 'WAITING_FOR_DRIVER'
        })
        .eq('id', offer.id)
        .is('driver_id', null) // Segurança atômica
        .select();

      if (error || !data || data.length === 0) {
        showError("Tarde demais! A oferta expirou ou outro aceitou.");
        setOffer(null);
        return;
      }

      await supabase.from('driver_applications').update({ consecutive_refusals: 0 }).eq('id', driverId);
      showSuccess("Pedido aceito! Vá até a loja.");
      navigate(`/driver/map?orderId=${offer.id}`);
    } catch (err) {
      showError("Erro ao aceitar pedido.");
    }
  };

  // Ciclo de vida principal
  useEffect(() => {
    const setup = async () => {
      const uid = await fetchDriverData();
      if (!uid) return;

      // 1. Busca inicial forçada
      await findActiveOffer(uid);

      // 2. Configura Realtime Resiliente
      // Ouvimos todas as mudanças na tabela de pedidos. O RLS garante que só recebamos o que nos pertence.
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      channelRef.current = supabase
        .channel(`driver_radar_${uid}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload) => {
            console.log("[Realtime] Mudança detectada no pedido:", payload.new.id);
            
            // Se o pedido foi ofertado para mim agora
            if (payload.new.current_driver_offered_id === uid) {
              findActiveOffer(uid);
            } 
            // Se eu tinha uma oferta e ela mudou (foi cancelada ou atribuída a outro)
            else if (offer && payload.new.id === offer.id) {
              if (payload.new.current_driver_offered_id !== uid) {
                setOffer(null);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log("[Realtime] Status da conexão:", status);
        });
    };

    setup();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchDriverData, findActiveOffer]); // Dependências estáveis

  // Timer regressivo
  useEffect(() => {
    if (timeLeft > 0 && offer) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (offer && timeLeft === 0) {
      handleReject(true);
    }
  }, [timeLeft, offer, handleReject]);

  // UI de Bloqueio
  if (driverStats?.blocked_until && new Date(driverStats.blocked_until) > new Date()) {
    const remaining = Math.ceil((new Date(driverStats.blocked_until).getTime() - Date.now()) / 60000);
    return (
      <div className="p-10 text-center space-y-6 animate-in fade-in">
        <div className="bg-red-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-gray-900">Radar Bloqueado</h2>
        <p className="text-gray-500 mt-2">Muitas recusas consecutivas. Aguarde para voltar a receber pedidos.</p>
        <Badge variant="outline" className="text-red-500 border-red-200 h-10 px-6 rounded-full font-black text-lg">
          {remaining} min restantes
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black text-indigo-900">Radar de Entregas</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-indigo-400" 
            onClick={() => driverId && findActiveOffer(driverId)}
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Badge className="bg-green-500 animate-pulse border-none">Online</Badge>
        </div>
      </div>
      
      {offer ? (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <span className="font-black text-sm uppercase tracking-tighter">Oferta Exclusiva</span>
            </div>
            <div className="bg-white text-brand-accent px-4 py-1 rounded-full font-black text-xl tabular-nums shadow-lg">
              0:{timeLeft < 10 ? '0' : ''}{timeLeft}
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-2xl"><Store className="h-6 w-6 text-indigo-600" /></div>
                <span className="font-black text-xl text-gray-900 leading-tight">{offer.merchant?.store_name}</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase">Seu Ganho</p>
                <span className="text-2xl font-black text-green-600">R$ {(offer.total * 0.15 + 5).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-5 relative">
              <div className="absolute left-3 top-6 bottom-6 w-0.5 border-l-2 border-indigo-100 border-dashed" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow-md">1</div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coleta</p>
                  <p className="font-bold text-gray-700 leading-tight">
                    {offer.merchant?.metadata?.address?.street}, {offer.merchant?.metadata?.address?.number}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="h-6 w-6 rounded-full bg-brand-accent flex items-center justify-center text-white text-[10px] font-bold shadow-md">2</div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entrega</p>
                  <p className="font-bold text-gray-700 leading-tight">{offer.delivery_address?.neighborhood}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="ghost" 
                className="flex-1 h-16 rounded-2xl text-red-500 font-bold hover:bg-red-50" 
                onClick={() => handleReject()}
                disabled={loading}
              >
                Recusar
              </Button>
              <Button 
                className="flex-2 h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xl shadow-xl shadow-green-100 active:scale-95 transition-all" 
                onClick={handleAccept}
                disabled={loading}
              >
                ACEITAR AGORA
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-indigo-50 shadow-inner">
          {loading ? (
            <Loader2 className="h-12 w-12 text-indigo-400 animate-spin" />
          ) : (
            <>
              <div className="relative mb-6">
                <Bike className="h-20 w-20 text-indigo-50 opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full border-4 border-indigo-100 border-t-indigo-400 animate-spin" />
                </div>
              </div>
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs text-center px-8">
                Varrendo sua região (5km)<br/>por novas entregas...
              </p>
            </>
          )}
        </div>
      )}
      
      <Card className="rounded-3xl bg-indigo-900 p-6 text-white border-none shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl"><TrendingUp className="text-indigo-300" /></div>
          <div>
            <p className="text-xs font-bold text-indigo-200 uppercase">Status</p>
            <p className="text-sm font-medium">Sua conta Gabriel está ativa e pronta para receber ofertas reais.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AvailableOrdersPage;