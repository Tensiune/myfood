"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Store, ShoppingBag, Clock, Map, XCircle } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { calculateDistance } from "@/utils/geo";
import { cn } from "@/lib/utils";

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState<any>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [feeSettings, setFeeSettings] = useState<any[]>([]);
  
  const pollingRef = useRef<any>(null);
  const { currentLocation } = useDriverLocationTracker(true);

  const fetchFeeSettings = async () => {
    const { data } = await supabase.from('delivery_fee_settings').select('*');
    if (data) setFeeSettings(data);
  };

  const syncOrders = useCallback(async (uid: string) => {
    try {
      // 1. Busca ofertas enviadas para este entregador
      const { data: offers } = await supabase
        .from('orders')
        .select('*, merchant:merchant_applications(*)')
        .eq('current_driver_offered_id', uid)
        .is('driver_id', null);

      if (offers && offers.length > 0) {
        const activeOffer = offers[0];
        const expiresAt = new Date(activeOffer.offer_expires_at).getTime();
        const diff = Math.floor((expiresAt - Date.now()) / 1000);
        setOffer(activeOffer);
        setTimeLeft(diff > 0 ? diff : 0); 
      } else {
        setOffer(null);
      }

      // 2. Busca pedido já aceito por este entregador (em andamento)
      const { data: accepted } = await supabase
        .from('orders')
        .select('*, merchant:merchant_applications(*)')
        .eq('driver_id', uid)
        .not('status', 'in', '("DELIVERED", "CANCELLED")')
        .order('created_at', { ascending: false });

      if (accepted && accepted.length > 0) {
        setActiveOrder(accepted[0]);
      } else {
        setActiveOrder(null);
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
      await syncOrders(user.id);

      pollingRef.current = setInterval(() => syncOrders(user.id), 5000);
      
      const channel = supabase.channel(`radar_sync_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          syncOrders(user.id);
        }).subscribe();

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        supabase.removeChannel(channel);
      };
    };
    initialize();
  }, [navigate, syncOrders]);

  useEffect(() => {
    if (offer && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (offer && timeLeft <= 0) {
       handleReject();
    }
  }, [offer, timeLeft]);

  const getCalculatedFee = (orderData: any) => {
    if (!orderData || !driverStats || feeSettings.length === 0) return 0;
    const vehicleType = driverStats.metadata?.vehicle?.type || 'moto';
    const setting = feeSettings.find(s => s.vehicle_type === vehicleType);
    if (!setting) return 0;

    const storeMeta = orderData.merchant?.metadata || {};
    const storeAddr = storeMeta.store_details?.address || storeMeta.address || {};
    const deliveryAddr = orderData.delivery_address || {};

    const distStoreClient = calculateDistance(
      parseFloat(storeAddr.lat), parseFloat(storeAddr.lng),
      parseFloat(deliveryAddr.lat), parseFloat(deliveryAddr.lng)
    );

    const kmInt = Math.floor(distStoreClient);
    const feeIndex = Math.min(kmInt, 15); 

    if (kmInt < 15) return setting.fees_json[feeIndex];
    return setting.fees_json[15] + ((distStoreClient - 15) * setting.extra_fee_per_km);
  };

  const getDistances = (orderData: any) => {
    if (!orderData || !currentLocation) return { toStore: "0", toClient: "0" };
    const storeMeta = orderData.merchant?.metadata || {};
    const storeAddr = storeMeta.store_details?.address || storeMeta.address || {};
    const deliveryAddr = orderData.delivery_address || {};

    const distToStore = calculateDistance(currentLocation[0], currentLocation[1], parseFloat(storeAddr.lat), parseFloat(storeAddr.lng));
    const distStoreClient = calculateDistance(parseFloat(storeAddr.lat), parseFloat(storeAddr.lng), parseFloat(deliveryAddr.lat), parseFloat(deliveryAddr.lng));

    return { toStore: distToStore.toFixed(1), toClient: distStoreClient.toFixed(1) };
  };

  const handleAccept = async () => {
    if (!driverId || !offer) return;
    try {
      const { data, error } = await supabase.from('orders').update({
        driver_id: driverId,
        current_driver_offered_id: null,
        offer_expires_at: null,
        // Mantemos o status original se o merchant ainda estiver preparando
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;

  const merchantMetadata = offer?.merchant?.metadata || {};
  const storeAddressData = merchantMetadata.store_details?.address || merchantMetadata.address || {};
  const deliveryAddress = offer?.delivery_address || {};
  const distances = offer ? getDistances(offer) : { toStore: "0", toClient: "0" };
  const calculatedFee = offer ? getCalculatedFee(offer) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black text-indigo-900">Radar</h1>
        <Badge className={cn(driverStats?.status === 'APPROVED' ? "bg-green-500" : "bg-orange-500")}>
          {driverStats?.status === 'APPROVED' ? 'Disponível' : 'Em Análise'}
        </Badge>
      </div>

      {activeOrder && (
        <Card className="rounded-[2rem] border-2 border-indigo-600 bg-indigo-50/30 overflow-hidden shadow-lg animate-in slide-in-from-top-4">
          <CardContent className="p-6 space-y-4">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 bg-indigo-600 rounded-full animate-pulse" />
                   <span className="font-black text-xs uppercase text-indigo-900">Em andamento</span>
                </div>
                <Badge className="bg-indigo-600">R$ {getCalculatedFee(activeOrder).toFixed(2)}</Badge>
             </div>
             <p className="font-bold text-gray-800 leading-tight">Retirar em: {activeOrder.merchant?.store_name}</p>
             <Button className="w-full rounded-xl bg-indigo-600 text-white font-bold" onClick={() => navigate(`/driver/map?orderId=${activeOrder.id}`)}>
               <Map className="h-4 w-4 mr-2" /> Continuar Rota
             </Button>
          </CardContent>
        </Card>
      )}

      {offer ? (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-in zoom-in-95">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 animate-pulse" /><span className="font-black text-sm uppercase">Pedido Recebido</span></div>
            <div className="bg-white text-brand-accent px-4 py-1 rounded-full font-black text-xl">0:{timeLeft < 10 ? '0' : ''}{timeLeft}</div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-start border-b pb-6">
              <div className="space-y-1"><span className="text-3xl font-black text-indigo-900">R$ {calculatedFee.toFixed(2)}</span><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ganhos Estimados</p></div>
              <Badge variant="outline" className="border-indigo-100 text-indigo-600 font-bold capitalize">{driverStats?.metadata?.vehicle?.type || 'moto'}</Badge>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center shrink-0"><div className="p-2 bg-indigo-50 rounded-full"><Store className="h-4 w-4 text-indigo-600" /></div><div className="w-0.5 h-full bg-gray-100 my-1" /></div>
              <div className="flex-1 space-y-1"><div className="flex justify-between"><p className="text-[10px] font-black text-gray-400 uppercase">Coleta</p><span className="text-[10px] font-black text-indigo-600">{distances.toStore} km</span></div><p className="font-bold text-gray-800">{offer.merchant?.store_name}</p><p className="text-sm text-gray-600 leading-tight">{storeAddressData.street}, {storeAddressData.number}</p></div>
            </div>
            <div className="flex gap-4">
              <div className="p-2 bg-green-50 rounded-full h-fit shrink-0"><ShoppingBag className="h-4 w-4 text-green-600" /></div>
              <div className="flex-1 space-y-1"><div className="flex justify-between"><p className="text-[10px] font-black text-gray-400 uppercase">Entrega</p><span className="text-[10px] font-black text-green-600">{distances.toClient} km</span></div><p className="font-bold text-gray-800">Cliente</p><p className="text-sm text-gray-600 leading-tight">{deliveryAddress.street}, {deliveryAddress.number}</p></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-red-500 font-bold" onClick={handleReject}>RECUSAR</Button>
              <Button className="flex-2 h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xl shadow-lg" onClick={handleAccept}>ACEITAR</Button>
            </div>
          </CardContent>
        </Card>
      ) : !activeOrder && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-indigo-50">
          <Loader2 className="h-10 w-10 text-indigo-200 animate-spin mb-4" />
          <p className="text-gray-400 font-black uppercase text-[10px] text-center px-8">Aguardando novos pedidos na sua região...</p>
        </div>
      )}
    </div>
  );
};

export default AvailableOrdersPage;