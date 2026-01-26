"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Store, Package, ArrowRight, Clock, AlertCircle, Loader2, XCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { calculateDistance } from "@/utils/geo";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  
  // Use a localização do hook (mesmo que mockada, é a fonte de dados)
  const { currentLocation, isTracking } = useDriverLocationTracker(true);
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
    const merchantMeta = order.merchant.metadata || {};
    const storeAddress = merchantMeta.store_details?.address || merchantMeta.address || {};
    
    const storeLat = parseFloat(storeAddress.lat) || 0;
    const storeLng = parseFloat(storeAddress.lng) || 0;
    
    const deliveryLat = order.delivery_address?.lat || 0;
    const deliveryLng = order.delivery_address?.lng || 0;

    // Distance calculations using current driver location
    const distanceToStore = calculateDistance(currentDriverLat, currentDriverLng, storeLat, storeLng);
    const deliveryDistance = calculateDistance(storeLat, storeLng, deliveryLat, deliveryLng);

    return {
        id: order.id,
        storeName: order.merchant.store_name || 'Loja Parceira',
        storeNeighborhood: storeAddress.neighborhood || 'N/A',
        deliveryNeighborhood: order.delivery_address?.neighborhood || 'N/A',
        distanceToStore: distanceToStore.toFixed(1),
        deliveryDistance: deliveryDistance.toFixed(1),
        earnings: (parseFloat(order.total) * 0.15 + 5).toFixed(2), // Mock earnings calculation
        itemCount: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        storeLat, storeLng, deliveryLat, deliveryLng
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
      
      // Sort by distance to store (closest first)
      mappedOrders.sort((a, b) => parseFloat(a.distanceToStore) - parseFloat(b.distanceToStore));

      setAvailableOrders(mappedOrders);
    } catch (err: any) {
      showError("Erro ao carregar pedidos disponíveis.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mapOrderData]);

  useEffect(() => {
    fetchDriverStatus();
  }, [fetchDriverStatus]);

  // Efeito para buscar pedidos quando a localização do motorista for atualizada
  useEffect(() => {
    if (driverLat !== 0 && driverLng !== 0) {
      fetchAvailableOrders(driverLat, driverLng);
    }
  }, [driverLat, driverLng, fetchAvailableOrders]);

  // Efeito para Realtime: Remover pedidos aceitos por outros
  useEffect(() => {
    const channel = supabase
      .channel('available-orders-updates')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: 'status=eq.OUT_FOR_DELIVERY' // Filtra apenas pedidos que saíram para entrega
        },
        (payload) => {
          const acceptedOrderId = payload.new.id;
          
          // Se o pedido aceito não for o que este motorista aceitou (para evitar race condition)
          if (payload.new.driver_id !== supabase.auth.getUser().data.user?.id) {
            setAvailableOrders(prev => {
              const isRemoved = prev.some(o => o.id === acceptedOrderId);
              if (isRemoved) {
                showError(`Pedido #${acceptedOrderId.slice(0, 6)} foi aceito por outro entregador.`);
              }
              return prev.filter(o => o.id !== acceptedOrderId);
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);


  const handleAcceptOrder = async (orderId: string) => {
    const driverId = await fetchDriverStatus();
    if (!driverId || driverStatus !== 'APPROVED') {
      showError("Você não está autorizado a aceitar pedidos.");
      return;
    }

    setAcceptingId(orderId);
    try {
      // Update order status and assign driver_id
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'OUT_FOR_DELIVERY', 
          driver_id: driverId 
        })
        .eq('id', orderId)
        .eq('status', 'WAITING_FOR_DRIVER') // Optimistic locking check
        .is('driver_id', null);

      if (error) throw error;

      showSuccess(`Pedido ${orderId.slice(0, 6)} aceito! Navegando para a loja.`);
      
      // Remove accepted order from list locally
      setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
      
      // Navigate to navigation page
      navigate(`/driver/map?orderId=${orderId}`);

    } catch (error: any) {
      showError("Falha ao aceitar pedido. Ele pode ter sido aceito por outro entregador.");
      // Re-fetch to update the list
      fetchAvailableOrders(driverLat, driverLng);
    } finally {
      setAcceptingId(null);
    }
  };
  
  const handleRejectOrder = (orderId: string) => {
    // Simplesmente remove da lista localmente. 
    // O pedido permanece no banco para outros motoristas.
    setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
    showSuccess("Pedido recusado. Ele será oferecido a outros parceiros.");
  };

  if (loading || driverLat === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Buscando sua localização e novas entregas...</p>
      </div>
    );
  }

  if (driverStatus === 'PENDING' || driverStatus === 'NEEDS_SETUP' || driverStatus === 'REJECTED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-6">
        <div className="bg-yellow-100 p-6 rounded-full">
          <Clock className="h-16 w-16 text-yellow-600 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-indigo-900">Perfil em Análise</h1>
          <p className="text-gray-500 max-w-sm mx-auto">
            Recebemos seus dados! Você receberá uma notificação assim que for aprovado.
          </p>
        </div>
        <Card className="p-4 bg-indigo-50 border-indigo-100 rounded-2xl flex items-start gap-3 text-left">
          <AlertCircle className="h-5 w-5 text-indigo-600 mt-1 shrink-0" />
          <p className="text-xs text-indigo-800 font-medium">
            O prazo médio de aprovação é de 24 a 48 horas úteis.
          </p>
        </Card>
        <Button variant="outline" className="rounded-xl border-indigo-200" onClick={() => navigate("/driver/setup")}>
          Revisar meus dados
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-indigo-900">Disponíveis</h1>
        <Badge className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/10 border-none px-3">
          {availableOrders.length} pedidos
        </Badge>
      </div>

      <div className="space-y-4">
        {availableOrders.length > 0 ? (
          availableOrders.map((order) => (
            <Card key={order.id} className="rounded-3xl border-none shadow-md overflow-hidden bg-white">
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
                    <Button 
                      onClick={() => handleRejectOrder(order.id)}
                      variant="outline"
                      size="icon"
                      className="rounded-xl border-red-100 text-red-500 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => handleAcceptOrder(order.id)}
                      className="rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold px-6 shadow-lg shadow-brand-accent/20"
                      disabled={acceptingId === order.id}
                    >
                      {acceptingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="ml-2 h-4 w-4" /> Aceitar</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <Bike className="h-16 w-16 text-gray-100 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Nenhum pedido disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableOrdersPage;