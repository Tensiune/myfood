"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  ChefHat, 
  Bike, 
  CheckCircle2, 
  Loader2,
  MapPin,
  Store,
  BellRing
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import OrderTimer from "@/components/merchant/OrderTimer";

const MerchantOrdersPage = () => {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: merchantData } = await supabase
        .from('merchant_applications')
        .select('is_open')
        .eq('id', user.id)
        .single();
      
      if (merchantData) setIsStoreOpen(merchantData.is_open);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Sincronização em Tempo Real (Realtime)
    const channel = supabase
      .channel('merchant_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        // Se for um novo pedido, toca um alerta opcional e atualiza a lista
        if (payload.eventType === 'INSERT') {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        }
        fetchOrders(); // Recarrega os dados para garantir consistência
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    let updatePayload: any = { status: newStatus };

    if (newStatus === 'PREPARING') {
      // Set initial timer for 15 minutes when moving to PREPARING
      const autoTransitionAt = new Date(Date.now() + 15 * 60000).toISOString();
      updatePayload = { status: newStatus, auto_transition_at: autoTransitionAt };
    } else {
      // Clear timer for other transitions
      updatePayload = { status: newStatus, auto_transition_at: null };
    }
    
    try {
      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (error) throw error;
      showSuccess("Pedido atualizado!");
    } catch (err: any) {
      showError("Erro ao atualizar status.");
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
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-3xl shadow-sm border border-gray-100">
           <div className={cn("h-2.5 w-2.5 rounded-full animate-pulse", isStoreOpen ? "bg-green-500" : "bg-red-500")} />
           <span className="text-xs font-black uppercase tracking-widest text-indigo-900">Loja {isStoreOpen ? 'Aberta' : 'Fechada'}</span>
           <Switch checked={isStoreOpen} onCheckedChange={handleToggleStore} className="data-[state=checked]:bg-green-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* NOVOS */}
        <div className="space-y-4">
          <h2 className="font-black text-blue-600 text-[10px] uppercase tracking-widest flex items-center gap-2 px-2">
            <span className="h-2 w-2 bg-blue-500 rounded-full" /> Recebidos ({orders.filter(o => o.status === "PENDING").length})
          </h2>
          {orders.filter(o => o.status === "PENDING").map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onAction={() => updateOrderStatus(order.id, "PREPARING")} 
              actionLabel="Aceitar Pedido"
              variant="blue"
            />
          ))}
        </div>

        {/* EM PREPARO */}
        <div className="space-y-4">
          <h2 className="font-black text-orange-500 text-[10px] uppercase tracking-widest flex items-center gap-2 px-2">
            <span className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" /> Em Preparo ({orders.filter(o => o.status === "PREPARING").length})
          </h2>
          {orders.filter(o => o.status === "PREPARING").map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onAction={() => updateOrderStatus(order.id, "WAITING_FOR_DRIVER")} 
              actionLabel="Chamar Entregador"
              variant="orange"
              showTimer
              onTimerEnd={() => updateOrderStatus(order.id, "WAITING_FOR_DRIVER")}
            />
          ))}
        </div>

        {/* AGUARDANDO ENTREGADOR */}
        <div className="space-y-4">
          <h2 className="font-black text-indigo-600 text-[10px] uppercase tracking-widest flex items-center gap-2 px-2">
            <span className="h-2 w-2 bg-indigo-500 rounded-full" /> Aguardando Coleta ({orders.filter(o => o.status === "WAITING_FOR_DRIVER").length})
          </h2>
          {orders.filter(o => o.status === "WAITING_FOR_DRIVER").map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onAction={() => updateOrderStatus(order.id, "OUT_FOR_DELIVERY")} 
              actionLabel="Entregar para Motoboy"
              variant="indigo"
            />
          ))}
        </div>

        {/* SAIU PARA ENTREGA */}
        <div className="space-y-4">
          <h2 className="font-black text-green-600 text-[10px] uppercase tracking-widest flex items-center gap-2 px-2">
            <span className="h-2 w-2 bg-green-500 rounded-full" /> Em Rota ({orders.filter(o => o.status === "OUT_FOR_DELIVERY").length})
          </h2>
          {orders.filter(o => o.status === "OUT_FOR_DELIVERY").map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onAction={() => {}} // Entregador confirma
              actionLabel="Em Trânsito..."
              variant="green"
              disabled
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const OrderCard = ({ order, onAction, actionLabel, variant, showTimer, onTimerEnd, disabled }: any) => {
  return (
    <Card className="rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all bg-white overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-gray-50 rounded-xl">
               <span className="text-[10px] font-black text-gray-400">#{order.id.slice(0, 6)}</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400">{new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
          </div>

          <div className="space-y-1.5">
             {order.items.map((item: any, i: number) => (
               <div key={i} className="flex justify-between text-sm">
                 <p className="text-gray-700 font-medium"><span className="text-indigo-600 font-black">{item.quantity}x</span> {item.name}</p>
               </div>
             ))}
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-2xl">
            <MapPin className="h-3 w-3 mt-0.5 text-indigo-400 shrink-0" />
            <p className="line-clamp-1">{order.delivery_address?.street}, {order.delivery_address?.number}</p>
          </div>

          {showTimer && (
            <OrderTimer 
              orderId={order.id} 
              autoTransitionAt={order.auto_transition_at} 
              onTimerEnd={onTimerEnd} 
            />
          )}
        </div>

        <div className="px-4 pb-4">
          <Button 
            className={cn(
              "w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95",
              variant === "blue" && "bg-blue-600 hover:bg-blue-700 shadow-blue-100",
              variant === "orange" && "bg-orange-500 hover:bg-orange-600 shadow-orange-100",
              variant === "indigo" && "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100",
              variant === "green" && "bg-green-600 opacity-60 cursor-default"
            )}
            onClick={onAction}
            disabled={disabled}
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantOrdersPage;