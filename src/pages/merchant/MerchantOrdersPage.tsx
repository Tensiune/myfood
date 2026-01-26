"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import OrderCard from "@/components/merchant/OrderCard";
import { RealtimeChannel } from "@supabase/supabase-js";

const MerchantOrdersPage = () => {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Busca status da loja
      const { data: merchantData } = await supabase
        .from('merchant_applications')
        .select('is_open')
        .eq('id', user.id)
        .single();
      
      if (merchantData) setIsStoreOpen(merchantData.is_open);

      // Busca pedidos
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (err) {
      console.error("[MerchantOrders] Erro ao buscar pedidos:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Busca inicial
    fetchOrders();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log("[MerchantOrders] Inicializando Realtime para o lojista:", user.id);

      // Remove canal anterior se existir
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Cria um novo canal exclusivo para este lojista
      const channel = supabase
        .channel(`merchant-orders-${user.id}`)
        .on(
          'postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'orders',
            filter: `merchant_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log("[MerchantOrders] Mudança detectada:", payload.eventType);
            
            if (payload.eventType === 'INSERT') {
              // Toca som de alerta
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log("Erro ao tocar áudio:", e));
              showSuccess("🔔 Novo pedido recebido!");
            }
            
            // Atualiza a lista silenciosamente para não interromper o lojista
            fetchOrders(true);
          }
        )
        .subscribe((status) => {
          console.log("[MerchantOrders] Status da inscrição:", status);
        });

      channelRef.current = channel;
    };

    setupRealtime();

    // Limpeza ao desmontar o componente
    return () => {
      if (channelRef.current) {
        console.log("[MerchantOrders] Removendo canal Realtime");
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    let updatePayload: any = { status: newStatus };

    if (newStatus === 'PREPARING') {
      const autoTransitionAt = new Date(Date.now() + 15 * 60000).toISOString();
      updatePayload = { status: newStatus, auto_transition_at: autoTransitionAt };
    } else {
      updatePayload = { status: newStatus, auto_transition_at: null };
    }
    
    // Atualização otimista
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatePayload } : o));

    try {
      const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
      if (error) throw error;
    } catch (err: any) {
      showError("Erro ao atualizar status.");
      fetchOrders(true); 
    }
  };

  const handleAdjustTimer = async (orderId: string, minutes: number, isAbsolute: boolean = false) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    let newAt: Date;
    if (isAbsolute) {
      newAt = new Date(Date.now() + minutes * 60000);
    } else {
      const currentAt = order.auto_transition_at ? new Date(order.auto_transition_at) : new Date();
      const baseDate = currentAt.getTime() < Date.now() ? new Date() : currentAt;
      newAt = new Date(baseDate.getTime() + minutes * 60000);
    }

    const newAtIso = newAt.toISOString();
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, auto_transition_at: newAtIso } : o));

    try {
      const { error } = await supabase.from('orders').update({ auto_transition_at: newAtIso }).eq('id', orderId);
      if (error) throw error;
    } catch (err) {
      showError("Erro ao salvar tempo.");
      fetchOrders(true);
    }
  };

  const handleToggleStore = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('merchant_applications').update({ is_open: checked }).eq('id', user?.id);
      setIsStoreOpen(checked);
      showSuccess(checked ? "Loja aberta!" : "Loja fechada.");
    } catch (err) { showError("Erro ao alterar status."); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold text-lg">Conectando ao terminal de pedidos...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-indigo-900 tracking-tighter">Pedidos</h1>
          <p className="text-gray-500 text-sm font-medium">Acompanhamento instantâneo da sua cozinha.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => fetchOrders()} 
            className="rounded-full bg-white shadow-sm border-gray-100 hover:bg-gray-50"
            title="Sincronizar Manualmente"
          >
            <RefreshCcw className="h-4 w-4 text-indigo-600" />
          </Button>
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-3xl shadow-sm border border-gray-100">
            <div className={cn("h-2.5 w-2.5 rounded-full animate-pulse", isStoreOpen ? "bg-green-500" : "bg-red-500")} />
            <span className="text-xs font-black uppercase tracking-widest text-indigo-900">Loja {isStoreOpen ? 'Aberta' : 'Fechada'}</span>
            <Switch checked={isStoreOpen} onCheckedChange={handleToggleStore} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="space-y-4">
          <h2 className="font-black text-blue-600 text-[10px] uppercase tracking-widest flex items-center gap-2 px-2">
            <span className="h-2 w-2 bg-blue-500 rounded-full" /> Recebidos ({orders.filter(o => o.status === "PENDING").length})
          </h2>
          {orders.filter(o => o.status === "PENDING").map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onAction={() => updateOrderStatus(order.id, "PREPARING")} 
              onAdjustTimer={(mins, isAbs) => handleAdjustTimer(order.id, mins, isAbs)}
              actionLabel="Aceitar Pedido"
              variant="blue"
            />
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="font-black text-orange-500 text-[10px] uppercase tracking-widest flex items-center gap-2 px-2">
            <span className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" /> Em Preparo ({orders.filter(o => o.status === "PREPARING").length})
          </h2>
          {orders.filter(o => o.status === "PREPARING").map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onAction={() => updateOrderStatus(order.id, "WAITING_FOR_DRIVER")} 
              onAdjustTimer={(mins, isAbs) => handleAdjustTimer(order.id, mins, isAbs)}
              actionLabel="Chamar Entregador"
              variant="orange"
              showTimer
              onTimerEnd={() => updateOrderStatus(order.id, "WAITING_FOR_DRIVER")}
            />
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="font-black text-indigo-600 text-[10px] uppercase tracking-widest flex items-center gap-2 px-2">
            <span className="h-2 w-2 bg-indigo-500 rounded-full" /> Aguardando Coleta ({orders.filter(o => o.status === "WAITING_FOR_DRIVER").length})
          </h2>
          {orders.filter(o => o.status === "WAITING_FOR_DRIVER").map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onAction={() => updateOrderStatus(order.id, "OUT_FOR_DELIVERY")} 
              onAdjustTimer={(mins, isAbs) => handleAdjustTimer(order.id, mins, isAbs)}
              actionLabel="Entregar para Motoboy"
              variant="indigo"
            />
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="font-black text-green-600 text-[10px] uppercase tracking-widest flex items-center gap-2 px-2">
            <span className="h-2 w-2 bg-green-500 rounded-full" /> Em Rota ({orders.filter(o => o.status === "OUT_FOR_DELIVERY").length})
          </h2>
          {orders.filter(o => o.status === "OUT_FOR_DELIVERY").map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onAction={() => {}}
              onAdjustTimer={(mins, isAbs) => handleAdjustTimer(order.id, mins, isAbs)}
              actionLabel="Em Trânsito..."
              variant="green"
              disabled
              showTrackingButton
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MerchantOrdersPage;