"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Bike, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Navigation,
  Clock,
  ShieldCheck,
  Store,
  Loader2,
  X,
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { calculateDistance } from "@/utils/geo";
import DynamicMap from "@/components/shared/DynamicMap";

const OrderTrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [merchantDetails, setMerchantDetails] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDriverLocation = async (driverId: string) => {
    if (!driverId) return;
    const { data } = await supabase
      .from('driver_locations')
      .select('latitude, longitude')
      .eq('driver_id', driverId)
      .single();
    
    if (data) {
      setDriverLocation([parseFloat(data.latitude), parseFloat(data.longitude)]);
    }
  };

  const fetchOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);
      
      // Redireciona se for retirada ou já entregue
      if (orderData.delivery_type === 'pickup' || orderData.status === 'DELIVERED') {
          navigate('/orders');
          return;
      }

      if (orderData.merchant_id) {
        const { data: merchantApp, error: merchantError } = await supabase
          .from('merchant_applications')
          .select('*')
          .eq('id', orderData.merchant_id)
          .single();
        
        if (merchantError) throw merchantError;
        setMerchantDetails(merchantApp);
      }

      if (orderData.status === 'OUT_FOR_DELIVERY' && orderData.driver_id) {
        fetchDriverLocation(orderData.driver_id);
      }
    } catch (err: any) {
      console.error("Erro ao buscar pedido/loja:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    const orderChannel = supabase
      .channel(`order_${id}_status`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        setOrder(payload.new);
        if (payload.new.delivery_type === 'pickup' || payload.new.status === 'DELIVERED') {
            navigate('/orders');
            return;
        }
        if (payload.new.status === 'OUT_FOR_DELIVERY' && payload.new.driver_id) {
          fetchDriverLocation(payload.new.driver_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [id, navigate]);

  const deliveryAddress = order?.delivery_address;
  const storeAddress = merchantDetails?.metadata?.store_details?.address || merchantDetails?.metadata?.address;

  const destinationPos: [number, number] = useMemo(() => 
    deliveryAddress?.lat && deliveryAddress?.lng 
      ? [deliveryAddress.lat, deliveryAddress.lng] 
      : [-23.5505, -46.6333]
  , [deliveryAddress]);

  const storePos: [number, number] = useMemo(() => 
    storeAddress?.lat && storeAddress?.lng 
      ? [storeAddress.lat, storeAddress.lng] 
      : [-23.5505, -46.6333]
  , [storeAddress]);

  const mapCenter: [number, number] = useMemo(() => {
    if (order?.status === 'OUT_FOR_DELIVERY' && driverLocation) {
      return driverLocation;
    }
    return destinationPos;
  }, [order?.status, driverLocation, destinationPos]);

  const distanceToClient = useMemo(() => {
    if (order?.status === 'OUT_FOR_DELIVERY' && driverLocation) {
      if (driverLocation[0] && driverLocation[1] && destinationPos[0] && destinationPos[1]) {
        return calculateDistance(driverLocation[0], driverLocation[1], destinationPos[0], destinationPos[1]).toFixed(1);
      }
    }
    return null;
  }, [order?.status, driverLocation, destinationPos]);

  const progress = order?.status === 'DELIVERED' ? 100 : 
                   order?.status === 'OUT_FOR_DELIVERY' ? 75 : 
                   order?.status === 'WAITING_FOR_DRIVER' ? 50 : 
                   order?.status === 'PREPARING' ? 25 : 0;

  if (loading || !order || order.delivery_type === 'pickup') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Carregando rastreamento...</p>
      </div>
    );
  }

  const isTrackingActive = order.status === 'OUT_FOR_DELIVERY';

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-[100] overflow-hidden max-w-2xl mx-auto shadow-2xl">
      {/* Header com botão de fechar/voltar proeminente */}
      <header className="absolute top-0 left-0 right-0 p-4 z-[110] flex items-center justify-between pointer-events-none">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => navigate(-1)} 
          className="rounded-full bg-white shadow-xl border-none pointer-events-auto hover:bg-gray-50 active:scale-95 transition-all"
        >
          <X className="h-6 w-6 text-indigo-900" />
        </Button>
        {isTrackingActive && (
          <Badge className="bg-brand-accent text-white px-4 py-2 rounded-full shadow-lg border-none flex gap-2 animate-in fade-in pointer-events-auto">
            <Clock className="h-4 w-4" /> {distanceToClient} km restantes
          </Badge>
        )}
      </header>

      {/* Área do Mapa */}
      <div className="flex-1 relative overflow-hidden bg-slate-100">
        <DynamicMap
          center={mapCenter}
          zoom={14}
          driverLocation={driverLocation}
          destinationPos={destinationPos}
          storePos={storePos}
          isTrackingActive={isTrackingActive}
        />
      </div>

      {/* Painel de Informações */}
      <Card className="rounded-t-[2.5rem] border-none shadow-[0_-10px_40px_rgba(0,0,0,0.1)] bg-white z-[110] pb-safe">
        <CardContent className="p-6 space-y-6">
          <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-4" />
          
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black text-indigo-900 leading-tight">
                {order.status === 'DELIVERED' ? 'Pedido Entregue!' : isTrackingActive ? "Seu pedido está a caminho!" : "Aguardando Entregador"}
              </h2>
              <p className="text-gray-500 text-sm mt-1">Pedido #{order.id.slice(0, 8)} • {merchantDetails?.store_name || "Loja"}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-indigo-600">
                {isTrackingActive ? distanceToClient : '--'}
              </span>
              <span className="text-xs font-bold text-gray-400 block uppercase">
                {isTrackingActive ? 'Km' : 'Status'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-3 bg-indigo-50" />
          </div>

          {isTrackingActive && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl flex-wrap gap-4 border border-gray-100 animate-in fade-in">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full bg-indigo-200 border-2 border-white shadow-sm overflow-hidden">
                    <img src="https://via.placeholder.com/100/4682B4/FFFFFF?text=Joao" alt="Motorista" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 p-1 rounded-full border-2 border-white">
                    <ShieldCheck className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">João Silva</h4>
                  <div className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase">
                    <span>Moto Honda</span> • <span className="text-indigo-600">ABC-1234</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" className="rounded-full border-indigo-100 text-indigo-600" onClick={() => navigate(`/chat/${order.driver_id}?orderId=${order.id}`)}>
                  <MessageCircle className="h-5 w-5" />
                </Button>
                <Button size="icon" variant="outline" className="rounded-full border-indigo-100 text-indigo-600">
                  <Phone className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          
          {!isTrackingActive && order.status !== 'DELIVERED' && (
            <div className="p-4 bg-yellow-50 rounded-2xl flex items-center gap-4 border border-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-800 font-medium">
                O pedido está em preparo ou aguardando um entregador parceiro.
              </p>
            </div>
          )}

          {order.status === 'DELIVERED' && (
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 font-bold" onClick={() => navigate(-1)}>
              Concluir e Voltar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderTrackingPage;