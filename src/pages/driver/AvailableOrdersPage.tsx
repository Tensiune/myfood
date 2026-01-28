"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, CheckCircle2, Store, ShoppingBag, ArrowDownRight, Clock } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { calculateDistance } from "@/utils/geo";
import { cn } from "@/lib/utils";

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState<any>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [feeSettings, setFeeSettings] = useState<any[]>([]);
  
  const pollingRef = useRef<any>(null);
  const { currentLocation, isTracking } = useDriverLocationTracker(true);

  const fetchFeeSettings = async () => {
    const { data } = await supabase.from('delivery_fee_settings').select('*');
    if (data) setFeeSettings(data);
  };

  const checkNewOffers = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, merchant:merchant_applications(*)')
        .eq('current_driver_offered_id', uid)
        .is('driver_id', null);

      if (error) throw error;

      if (data && data.length > 0) {
        const activeOffer = data[0];
        const expiresAt = new Date(activeOffer.offer_expires_at).getTime();
        const diff = Math.floor((expiresAt - Date.now()) / 1000);
        
        setOffer(activeOffer);
        setTimeLeft(diff > 0 ? diff : 0); 
      } else {
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

      await fetchFeeSettings();
      await checkNewOffers(user.id);

      pollingRef.current = setInterval(() => checkNewOffers(user.id), 5000);
      
      const channel = supabase.channel(`radar_sync_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          checkNewOffers(user.id);
        }).subscribe();

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
    } else if (offer && timeLeft === 0) {
       handleReject();
    }
  }, [offer, timeLeft]);

  // CÁLCULO DO VALOR DA ENTREGA
  const getCalculatedFee = () => {
    if (!offer || !driverStats || feeSettings.length === 0) return 0;
    
    const vehicleType = driverStats.metadata?.vehicle?.type || 'moto';
    const setting = feeSettings.find(s => s.vehicle_type === vehicleType);
    if (!setting) return 0;

    const storeMeta = offer.merchant?.metadata || {};
    const storeAddr = storeMeta.store_details?.address || storeMeta.address || {};
    const deliveryAddr = offer.delivery_address || {};

    // Distância Loja -> Consumidor
    const distStoreClient = calculateDistance(
      parseFloat(storeAddr.lat), parseFloat(storeAddr.lng),
      parseFloat(deliveryAddr.lat), parseFloat(deliveryAddr.lng)
    );

    const kmInt = Math.floor(distStoreClient);
    if (kmInt < 15) {
      return setting.fees_json[kmInt];
    } else {
      const base15 = setting.fees_json[15];
      const extraKm = distStoreClient - 15;
      return base15 + (extraKm * setting.extra_fee_per_km);
    }
  };

  const getDistances = () => {
    if (!offer || !currentLocation) return { toStore: 0, toClient: 0 };
    
    const storeMeta = offer.merchant?.metadata || {};
    const storeAddr = storeMeta.store_details?.address || storeMeta.address || {};
    const deliveryAddr = offer.delivery_address || {};

    const distToStore = calculateDistance(
      currentLocation[0], currentLocation[1],
      parseFloat(storeAddr.lat), parseFloat(storeAddr.lng)
    );

    const distToClient = calculateDistance(
      parseFloat(storeAddr.lat), parseFloat(storeAddr.lng),
      parseFloat(deliveryAddr.lat), parseFloat(deliveryAddr.lng)
    );

    return { toStore: distToStore.toFixed(1), toClient: distToClient.toFixed(1) };
  };

  const handleAccept = async () => {
    if (!driverId || !offer) return;
    try {
      const calculatedValue = getCalculatedFee();
      const { data, error } = await supabase.from('orders').update({
        driver_id: driverId,
        current_driver_offered_id: null,
        offer_expires_at: null,
        status: 'WAITING_FOR_DRIVER',
        total: offer.total // Mantém o total, mas poderíamos salvar o driver_fee separadamente se houvesse a coluna
      }).eq('id', offer.id).is('driver_id', null).select();

      if (error || !data || data.length === 0) {
        showError("Este pedido expirou ou outro entregador aceitou.");
        setOffer(null);
        return;
      }
      showSuccess("Pedido aceito!");
      navigate(`/driver/map?orderId=${offer.id}`);
    } catch (err) { showError("Erro de conexão."); }
  };

  const handleReject = async () => {
    if (!driverId || !offer) return;
    const currentId = offer.id;
    setOffer(null);
    const newRefused = [...(offer.refused_drivers_ids || []), driverId];
    await supabase.from('orders').update({ 
      current_driver_offered_id: null, 
      offer_expires_at: null,
      refused_drivers_ids: newRefused 
    }).eq('id', currentId);
    supabase.functions.invoke('dispatch-order', { body: { orderId: currentId } });
  };

  const distances = getDistances();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black text-indigo-900">Radar</h1>
        <Badge className={cn(driverStats?.status === 'APPROVED' ? "bg-green-500" : "bg-orange-500")}>
          {driverStats?.status === 'APPROVED' ? 'Disponível' : 'Em Análise'}
        </Badge>
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
            <div className="flex justify-between items-start border-b pb-6">
              <div className="space-y-1">
                <span className="text-3xl font-black text-indigo-900">R$ {getCalculatedFee().toFixed(2)}</span>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor da sua Entrega</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="border-indigo-100 text-indigo-600 font-bold capitalize">
                  {driverStats?.metadata?.vehicle?.type || 'moto'}
                </Badge>
              </div>
            </div>

            {/* Coleta */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="p-2 bg-indigo-50 rounded-full"><Store className="h-4 w-4 text-indigo-600" /></div>
                <div className="w-0.5 h-full bg-gray-100 my-1" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Coleta (Loja)</p>
                  <span className="text-[10px] font-black text-indigo-600">{distances.toStore} km de você</span>
                </div>
                <p className="font-bold text-gray-800">{offer.merchant?.store_name}</p>
                <p className="text-xs text-gray-500 leading-tight">
                  {offer.merchant?.metadata?.store_details?.address?.street || offer.merchant?.metadata?.address?.street}, 
                  {offer.merchant?.metadata?.store_details?.address?.number || offer.merchant?.metadata?.address?.number} - 
                  {offer.merchant?.metadata?.store_details?.address?.neighborhood || offer.merchant?.metadata?.address?.neighborhood}
                </p>
              </div>
            </div>

            {/* Entrega */}
            <div className="flex gap-4">
              <div className="p-2 bg-green-50 rounded-full h-fit"><ShoppingBag className="h-4 w-4 text-green-600" /></div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase">Entrega (Cliente)</p>
                  <span className="text-[10px] font-black text-green-600">{distances.toClient} km da loja</span>
                </div>
                <p className="font-bold text-gray-800">Endereço de Entrega</p>
                <p className="text-xs text-gray-500 leading-tight">
                  {offer.delivery_address?.street}, {offer.delivery_address?.number} - {offer.delivery_address?.neighborhood}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
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