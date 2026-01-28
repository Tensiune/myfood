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
  const [driverId, setDriverId] = useState<string | null>(null);

  // Ativa o rastreamento GPS para que o servidor veja o entregador
  const { isTracking } = useDriverLocationTracker(true);

  // Buscar dados do entregador
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

  // Buscar oferta ativa
  const findActiveOffer = useCallback(async (driverId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*, merchant:merchant_id(*)')
      .eq('current_driver_offered_id', driverId)
      .not('status', 'eq', 'DELIVERED')
      .not('status', 'eq', 'CANCELLED')
      .maybeSingle();

    if (data && data.offer_expires_at) {
      const expiresAt = new Date(data.offer_expires_at).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      if (diff > 0) {
        setOffer(data);
        setTimeLeft(diff);
      } else {
        setOffer(null);
      }
    } else {
      setOffer(null);
    }
    
    setLoading(false);
  }, []);

  // Rejeitar oferta
  const handleReject = useCallback(async (isAuto = false) => {
    if (!driverId || !offer) return;

    // 1. Registra recusa para não ofertar novamente
    const newRefused = [...(offer.refused_drivers_ids || []), driverId];
    await supabase
      .from('orders')
      .update({
        current_driver_offered_id: null,
        offer_expires_at: null,
        refused_drivers_ids: newRefused
      })
      .eq('id', offer.id);

    // 2. Penalidade
    const nextRefusals = (driverStats?.consecutive_refusals || 0) + 1;
    let updates: any = { consecutive_refusals: nextRefusals };

    if (nextRefusals >= 3) {
      const blockedUntil = new Date(Date.now() + 15 * 60000).toISOString();
      updates.blocked_until = blockedUntil;
      updates.consecutive_refusals = 0;
      showError("Radar bloqueado por 15 min devido a múltiplas recusas.");
    } else {
      showError(isAuto ? "Oferta expirada." : "Oferta recusada.");
    }

    await supabase
      .from('driver_applications')
      .update(updates)
      .eq('id', driverId);

    setOffer(null);

    // Chama a Edge Function para passar o pedido ao próximo entregador do ranking
    supabase.functions.invoke('dispatch-order', {
      body: { orderId: offer.id }
    });
  }, [offer, driverStats, driverId]);

  // Aceitar oferta
  const handleAccept = async () => {
    if (!driverId || !offer) return;

    // Tenta assumir o pedido (transação atômica simulada pelo .is('driver_id', null))
    const { error } = await supabase
      .from('orders')
      .update({
        driver_id: driverId,
        current_driver_offered_id: null,
        offer_expires_at: null,
        status: 'WAITING_FOR_DRIVER' // Move status para aguardando coleta
      })
      .eq('id', offer.id)
      .is('driver_id', null);

    if (error) {
      showError("Tarde demais! Outro entregador aceitou ou a oferta expirou.");
      setOffer(null);
    } else {
      await supabase
        .from('driver_applications')
        .update({ consecutive_refusals: 0 })
        .eq('id', driverId);
        
      showSuccess("Pedido aceito! Dirija-se ao restaurante.");
      navigate(`/driver/map?orderId=${offer.id}`);
    }
  };

  // Timer regressivo rígido de 60s
  useEffect(() => {
    if (timeLeft > 0 && offer) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (offer && timeLeft === 0) {
      handleReject(true);
    }
  }, [timeLeft, offer, handleReject]);

  // Configurar escuta em tempo real
  useEffect(() => {
    let offerChannel: any;
    let statusChannel: any;

    const setup = async () => {
      const id = await fetchDriverData();
      if (!id) return;

      // Busca oferta inicial
      await findActiveOffer(id);

      // ESCUTA EM TEMPO REAL: Escuta especificamente quando o pedido é ofertado para este motorista
      offerChannel = supabase
        .channel('driver_offer_listener')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `current_driver_offered_id=eq.${id}` // Filtro CRÍTICO
          },
          (payload) => {
            console.log("Nova oferta detectada via Realtime:", payload.new);
            // Re-executa a busca para carregar os dados completos da oferta
            findActiveOffer(id);
          }
        )
        .subscribe();

      // Adiciona um listener para quando a oferta expira ou é aceita por outro
      statusChannel = supabase
        .channel('driver_status_listener')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
          },
          (payload) => {
            if (offer && payload.new.id === offer.id) {
              // Se o pedido atual for aceito por outro ou cancelado, limpa a oferta
              if (payload.new.driver_id !== driverId && payload.new.driver_id !== null) {
                setOffer(null);
              }
              if (payload.new.status === 'CANCELLED') {
                setOffer(null);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(offerChannel);
        supabase.removeChannel(statusChannel);
      };
    };

    setup();
  }, [fetchDriverData, findActiveOffer, driverId, offer]);

  // Tela de Bloqueio (Penalidade)
  if (driverStats?.blocked_until && new Date(driverStats.blocked_until) > new Date()) {
    return (
      <div className="p-10 text-center space-y-6 animate-in fade-in">
        <div className="bg-red-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-gray-900">Radar Bloqueado</h2>
          <p className="text-gray-500 mt-2">Sua taxa de aceitação está baixa. Aguarde para voltar a receber pedidos.</p>
        </div>
        <Badge variant="outline" className="text-red-500 border-red-200 h-10 px-6 rounded-full font-black text-lg">
          {Math.ceil((new Date(driverStats.blocked_until).getTime() - Date.now()) / 60000)} min restantes
        </Badge>
      </div>
    );
  }

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black text-indigo-900">Radar de Entregas</h1>
        <Badge className="bg-green-500 animate-pulse border-none">Online e Rastreando</Badge>
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
              <div className="absolute left-3 top-6 bottom-6 w-0.5 bg-dashed border-l-2 border-indigo-100 border-dashed" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow-md">1</div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coleta</p>
                  <p className="font-bold text-gray-700 leading-tight">{offer.merchant?.metadata?.address?.street}, {offer.merchant?.metadata?.address?.number}</p>
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
              >
                Recusar
              </Button>
              <Button 
                className="flex-2 h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xl shadow-xl shadow-green-100 active:scale-95 transition-all" 
                onClick={handleAccept}
              >
                ACEITAR AGORA
              </Button>
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
            Varrendo sua região (5km)<br/>por novas entregas...
          </p>
        </div>
      )}
      
      <Card className="rounded-3xl bg-indigo-900 p-6 text-white border-none shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl"><TrendingUp className="text-indigo-300" /></div>
          <div>
            <p className="text-xs font-bold text-indigo-200 uppercase">Estatísticas</p>
            <p className="text-sm font-medium">Você está entre os entregadores com melhor avaliação da sua zona.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AvailableOrdersPage;