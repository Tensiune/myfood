"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Store, Package, ArrowRight, Clock, AlertCircle, Loader2, XCircle, Bike } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { calculateDistance } from "@/utils/geo";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";

interface AvailableOrder {
  id: string;
  storeName: string;
  storeNeighborhood: string;
  deliveryNeighborhood: string;
  distanceToStore: string;
  deliveryDistance: string;
  earnings: string;
  itemCount: number;
  storeLat: number;
  storeLng: number;
  deliveryLat: number;
  deliveryLng: number;
}

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  
  const { currentLocation } = useDriverLocationTracker(true);
  const [driverLat, driverLng] = currentLocation;

  const fetchDriverStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setDriverStatus(user.user_metadata?.status || 'NEEDS_SETUP');
      return user.id;
    }
    return null;
  }, []);

  const mapOrderData = useCallback((order: any, currentDriverLat: number, currentDriverLng: number): AvailableOrder => {
    const merchantMeta = order.merchant?.metadata || {};
    const storeDetails = merchantMeta.store_details || {};
    const storeAddress = storeDetails.address || merchantMeta.address || {};
    
    const safeParseFloat = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? null : parsed;
    };

    const storeLat = safeParseFloat(storeAddress.lat);
    const storeLng = safeParseFloat(storeAddress.lng);
    const deliveryLat = safeParseFloat(order.delivery_address?.lat);
    const deliveryLng = safeParseFloat(order.delivery_address?.lng);

    let distanceToStore = 'N/A';
    let deliveryDistance = 'N/A';

    // 1. Distância Entregador -> Loja
    if (storeLat !== null && storeLng !== null && currentDriverLat !== 0 && currentDriverLng !== 0) {
        const dist = calculateDistance(currentDriverLat, currentDriverLng, storeLat, storeLng);
        distanceToStore = dist.toFixed(1);
    }

    // 2. Distância Loja -> Cliente
    if (storeLat !== null && storeLng !== null && deliveryLat !== null && deliveryLng !== null) {
        const dist = calculateDistance(storeLat, storeLng, deliveryLat, deliveryLng);
        deliveryDistance = dist.toFixed(1);
    }

    // Calcular total de itens (soma das quantidades)
    const items = Array.isArray(order.items) ? order.items : [];
    const totalItems = items.reduce((acc: number, item: any) => acc + (parseInt(item.quantity) || 1), 0);

    return {
        id: order.id,
        storeName: order.merchant?.store_name || 'Loja Parceira',
        storeNeighborhood: storeAddress.neighborhood || 'N/A',
        deliveryNeighborhood: order.delivery_address?.neighborhood || 'N/A',
        distanceToStore,
        deliveryDistance,
        earnings: (parseFloat(order.total) * 0.15 + 5).toFixed(2),
        itemCount: totalItems,
        storeLat: storeLat || 0, 
        storeLng: storeLng || 0, 
        deliveryLat: deliveryLat || 0, 
        deliveryLng: deliveryLng || 0
    };
  }, []);

  const fetchAvailableOrders = useCallback(async (currentDriverLat: number, currentDriverLng: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
            id, total, items, delivery_address, created_at,
            merchant:merchant_id (store_name, metadata)
        `)
        .eq('status', 'WAITING_FOR_DRIVER')
        .is('driver_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedOrders = (data || []).map(order => mapOrderData(order, currentDriverLat, currentDriverLng));
      
      mappedOrders.sort((a, b) => {
        const distA = parseFloat(a.distanceToStore);
        const distB = parseFloat(b.distanceToStore);
        if (isNaN(distA)) return 1;
        if (isNaN(distB)) return -1;
        return distA - distB;
      });

      setAvailableOrders(mappedOrders);
    } catch (err: any) {
      showError("Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, [mapOrderData]);

  useEffect(() => {
    fetchDriverStatus();
  }, [fetchDriverStatus]);

  useEffect(() => {
    if (driverLat !== 0 && driverLng !== 0) {
      fetchAvailableOrders(driverLat, driverLng);
    }
  }, [driverLat, driverLng, fetchAvailableOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    const driverId = await fetchDriverStatus();
    if (!driverId || driverStatus !== 'APPROVED') {
      showError("Sua conta precisa estar aprovada.");
      return;
    }

    setAcceptingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'OUT_FOR_DELIVERY', driver_id: driverId })
        .eq('id', orderId)
        .eq('status', 'WAITING_FOR_DRIVER')
        .is('driver_id', null);

      if (error) throw error;

      showSuccess("Pedido aceito!");
      navigate(`/driver/map?orderId=${orderId}`);
    } catch (error: any) {
      showError("O pedido não está mais disponível.");
      fetchAvailableOrders(driverLat, driverLng);
    } finally {
      setAcceptingId(null);
    }
  };
  
  const handleRejectOrder = (orderId: string) => {
    setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
  };

  if (loading || driverLat === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Localizando entregas próximas...</p>
      </div>
    );
  }

  if (driverStatus !== 'APPROVED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-6">
        <div className="bg-yellow-100 p-6 rounded-full">
          <Clock className="h-16 w-16 text-yellow-600 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black text-indigo-900">Perfil em Análise</h1>
        <p className="text-gray-500 max-w-sm">Você será avisado assim que sua conta for liberada para entregas.</p>
        <Button variant="outline" onClick={() => navigate("/driver/setup")}>Revisar Dados</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-indigo-900">Pedidos Disponíveis</h1>
        <Badge className="bg-indigo-100 text-indigo-700 border-none">{availableOrders.length} novos</Badge>
      </div>

      <div className="space-y-4">
        {availableOrders.length > 0 ? (
          availableOrders.map((order) => (
            <Card key={order.id} className="rounded-[2rem] border-none shadow-md overflow-hidden bg-white">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                      <Store className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-gray-800">{order.storeName}</span>
                  </div>
                  <span className="text-lg font-black text-green-600">R$ {order.earnings}</span>
                </div>

                <div className="space-y-3 relative">
                  <div className="absolute left-2.5 top-6 bottom-6 w-0.5 border-l-2 border-dashed border-gray-200" />
                  
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 bg-white rounded-full" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Retirada ({order.storeNeighborhood})</p>
                      <p className="text-sm font-medium text-gray-600">{order.distanceToStore} km de você</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-brand-accent shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Entrega ({order.deliveryNeighborhood})</p>
                      <p className="text-sm font-medium text-gray-600">{order.deliveryDistance} km da loja</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Package className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase">{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleRejectOrder(order.id)} variant="ghost" className="rounded-xl text-red-400">Recusar</Button>
                    <Button 
                      onClick={() => handleAcceptOrder(order.id)}
                      className="rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold px-6"
                      disabled={acceptingId === order.id}
                    >
                      {acceptingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aceitar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <Bike className="h-16 w-16 text-gray-100 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Nenhum pedido na sua área no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableOrdersPage;