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
  AlertCircle,
  ChevronRight,
  MessageCircle,
  Store,
  Loader2,
  MapPin
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";

const MerchantOrdersPage = () => {
  const navigate = useNavigate();
  const [merchantStatus, setMerchantStatus] = useState<string | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  const fetchStatusAndOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setMerchantStatus(user.user_metadata?.status || 'NEEDS_SETUP');
      
      // 1. Status da loja
      const { data: merchantData } = await supabase
        .from('merchant_applications')
        .select('is_open')
        .eq('id', user.id)
        .single();
      
      if (merchantData) setIsStoreOpen(merchantData.is_open);

      // 2. Pedidos reais
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
    fetchStatusAndOrders();

    // Escutar novos pedidos em tempo real
    const channel = supabase
      .channel('merchant_order_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchStatusAndOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleStore = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('merchant_applications')
        .update({ is_open: checked })
        .eq('id', user.id);

      setIsStoreOpen(checked);
      showSuccess(checked ? "Loja aberta!" : "Loja fechada.");
    } catch (err: any) {
      showError("Erro ao alterar status.");
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      showSuccess("Pedido atualizado!");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err: any) {
      showError("Erro ao atualizar pedido.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Carregando painel real...</p>
      </div>
    );
  }

  if (merchantStatus === 'PENDING') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6 bg-white rounded-3xl shadow-xl">
        <Store className="h-20 w-20 text-yellow-500 mx-auto" />
        <h1 className="text-3xl font-black text-indigo-900">Aguardando Aprovação</h1>
        <p className="text-gray-600 max-w-md">
          Seu cadastro foi enviado para análise. Você será notificado quando sua loja for aprovada.
        </p>
        <Button variant="outline" className="rounded-2xl" onClick={() => navigate("/merchant/setup")}>Revisar Configuração</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Gestão de Pedidos</h1>
          <p className="text-gray-500 text-sm">Controle sua operação em tempo real.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100">
            <div className={cn("h-2 w-2 rounded-full animate-pulse", isStoreOpen ? "bg-green-500" : "bg-red-500")} />
            <span className={cn("text-sm font-black uppercase tracking-widest", isStoreOpen ? "text-green-600" : "text-red-500")}>
              Loja {isStoreOpen ? 'Aberta' : 'Fechada'}
            </span>
            <Switch 
              checked={isStoreOpen} 
              onCheckedChange={handleToggleStore} 
              className="data-[state=checked]:bg-green-500"
            />
          </div>
          <Badge className="bg-indigo-900 text-white px-4 py-2 rounded-xl border-none">{orders.filter(o => o.status !== 'DELIVERED').length} Ativos</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* NOVOS / PENDENTES */}
        <div className="space-y-4">
          <h2 className="font-black text-indigo-900 text-xs uppercase tracking-widest flex items-center gap-2 px-1">
            <span className="h-3 w-3 bg-blue-500 rounded-full" /> Novos Pedidos
          </h2>
          <div className="space-y-4">
            {orders.filter(o => o.status === "PENDING").length > 0 ? (
              orders.filter(o => o.status === "PENDING").map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onAction={() => updateOrderStatus(order.id, "PREPARING")} 
                  actionLabel="Aceitar e Preparar"
                  variant="primary"
                />
              ))
            ) : (
              <p className="text-xs text-gray-400 italic px-2">Nenhum novo pedido.</p>
            )}
          </div>
        </div>

        {/* EM PREPARO */}
        <div className="space-y-4">
          <h2 className="font-black text-indigo-900 text-xs uppercase tracking-widest flex items-center gap-2 px-1">
            <span className="h-3 w-3 bg-orange-500 rounded-full" /> Em Preparo
          </h2>
          <div className="space-y-4">
            {orders.filter(o => o.status === "PREPARING").map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onAction={() => updateOrderStatus(order.id, "OUT_FOR_DELIVERY")} 
                actionLabel="Pedido Pronto"
                variant="warning"
              />
            ))}
          </div>
        </div>

        {/* EM ENTREGA */}
        <div className="space-y-4">
          <h2 className="font-black text-indigo-900 text-xs uppercase tracking-widest flex items-center gap-2 px-1">
            <span className="h-3 w-3 bg-green-500 rounded-full" /> Em Rota de Entrega
          </h2>
          <div className="space-y-4">
            {orders.filter(o => o.status === "OUT_FOR_DELIVERY").map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onAction={() => updateOrderStatus(order.id, "DELIVERED")} 
                actionLabel="Confirmar Entrega"
                variant="success"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const OrderCard = ({ order, onAction, actionLabel, variant = "default" }: any) => {
  return (
    <Card className="rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
      <CardContent className="p-0">
        <div className="p-6 border-b border-gray-50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">#{order.id.slice(0, 8)}</span>
              <h3 className="font-black text-gray-900 text-lg">Consumidor</h3>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold bg-gray-100">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Badge>
          </div>
          
          <div className="space-y-2 mb-4">
             {order.items.map((item: any, i: number) => (
               <div key={i} className="flex justify-between text-sm">
                 <span className="text-gray-600 font-medium"><span className="text-indigo-600 font-bold">{item.quantity}x</span> {item.name}</span>
                 <span className="text-gray-400">R$ {(item.price * item.quantity).toFixed(2)}</span>
               </div>
             ))}
          </div>

          <div className="flex items-start gap-2 bg-indigo-50/50 p-3 rounded-2xl">
             <MapPin className="h-4 w-4 text-indigo-400 mt-1 shrink-0" />
             <p className="text-xs text-indigo-900 font-medium">
               {order.delivery_address?.street}, {order.delivery_address?.number}
             </p>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50/30 flex justify-between items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Total</span>
            <span className="font-black text-indigo-900">R$ {order.total.toFixed(2)}</span>
          </div>
          <Button 
            className={cn(
              "rounded-xl font-bold h-12 px-6 flex-1 shadow-lg transition-transform active:scale-95",
              variant === "primary" && "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100",
              variant === "warning" && "bg-orange-500 hover:bg-orange-600 shadow-orange-100",
              variant === "success" && "bg-green-600 hover:bg-green-700 shadow-green-100"
            )} 
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantOrdersPage;