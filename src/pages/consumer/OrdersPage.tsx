"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, Loader2, Key, XCircle, History, MessageCircle, Bike, Store, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const OrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*, merchant:merchant_applications(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error(err);
      showError("Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('client_order_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.new.status === 'OUT_FOR_DELIVERY') {
           showSuccess("Seu pedido saiu para entrega!");
        }
        if (payload.new.status === 'READY_FOR_PICKUP') {
           showSuccess("Seu pedido está pronto para retirada!");
        }
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge className="bg-blue-100 text-blue-700 border-none rounded-full">Aguardando Loja</Badge>;
      case "PREPARING": return <Badge className="bg-orange-100 text-orange-700 border-none rounded-full">Em Preparo</Badge>;
      case "WAITING_FOR_DRIVER": return <Badge className="bg-indigo-100 text-indigo-700 border-none rounded-full">Aguardando Entregador</Badge>;
      case "OUT_FOR_DELIVERY": return <Badge className="bg-yellow-500 text-white rounded-full">Em Rota de Entrega</Badge>;
      case "READY_FOR_PICKUP": return <Badge className="bg-green-500 text-white rounded-full">Pronto para Retirada</Badge>;
      case "DELIVERED": return <Badge className="bg-green-500 text-white rounded-full">Entregue</Badge>;
      case "CANCELLED": return <Badge className="bg-red-100 text-red-600 border-none rounded-full">Pedido Recusado</Badge>;
      default: return <Badge variant="secondary" className="rounded-full">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Sincronizando seus pedidos...</p>
      </div>
    );
  }

  const activeOrders = orders.filter(o => ['PENDING', 'PREPARING', 'WAITING_FOR_DRIVER', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'].includes(o.status));
  const historyOrders = orders.filter(o => ['DELIVERED', 'CANCELLED'].includes(o.status));

  const renderOrderCard = (order: any) => (
    <Card key={order.id} className={cn(
      "rounded-3xl border-none shadow-md overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-2",
      order.status === 'CANCELLED' && "opacity-90 border-l-4 border-l-red-500"
    )}>
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-black text-gray-900 text-lg">
              {order.merchant?.store_name || "Restaurante"}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pedido #{order.id.slice(0, 8)}</p>
          </div>
          {getStatusBadge(order.status)}
        </div>

        {/* Botões de Chat para pedidos ativos */}
        {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
            <div className="grid grid-cols-2 gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl border-indigo-100 text-indigo-600 h-9 text-xs gap-2"
                    onClick={() => navigate(`/chat/${order.merchant_id}?orderId=${order.id}`)}
                >
                    <Store className="h-3.5 w-3.5" /> Falar com Loja
                </Button>
                {order.driver_id && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl border-blue-100 text-blue-600 h-9 text-xs gap-2"
                        onClick={() => navigate(`/chat/${order.driver_id}?orderId=${order.id}`)}
                    >
                        <Bike className="h-3.5 w-3.5" /> Falar com Entregador
                    </Button>
                )}
            </div>
        )}

        {/* Informações de Retirada/Entrega */}
        {order.status === "READY_FOR_PICKUP" && (
          <div className="bg-green-50 p-4 rounded-2xl flex items-center justify-between border border-green-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm"><Key className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-[10px] font-bold text-green-400 uppercase">Código de Retirada</p>
                <p className="text-xl font-black text-green-900">{order.confirmation_code}</p>
              </div>
            </div>
            <Button size="sm" className="rounded-xl bg-green-600 h-10 font-bold" onClick={() => navigate(`/restaurant/${order.merchant_id}`)}>Ver Local</Button>
          </div>
        )}
        
        {order.status === "OUT_FOR_DELIVERY" && (
          <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between border border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm"><Key className="h-5 w-5 text-indigo-600" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase">Código de Entrega</p>
                <p className="text-xl font-black text-indigo-900">{order.confirmation_code}</p>
              </div>
            </div>
            <Button size="sm" className="rounded-xl bg-indigo-600 h-10 font-bold" onClick={() => navigate(`/track/${order.id}`)}>Rastrear</Button>
          </div>
        )}
        
        <div className="space-y-1">
           {order.items.map((item: any, i: number) => (
             <p key={i} className="text-sm text-gray-600"><span className="font-bold text-indigo-600">{item.quantity}x</span> {item.name}</p>
           ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="font-black text-indigo-900">Total: R$ {order.total.toFixed(2)}</span>
          <span className="text-xs text-gray-400 font-bold uppercase">
            {new Date(order.created_at).toLocaleDateString([], {day:'2-digit', month:'2-digit'})} {new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-4xl font-bold text-indigo-800 text-center tracking-tight">Meus Pedidos</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
          <Package className="h-5 w-5" /> Pedidos Ativos ({activeOrders.length})
        </h2>
        {activeOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
            <Package className="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 font-medium">Você não tem pedidos em andamento.</p>
          </div>
        ) : (
          activeOrders.map(renderOrderCard)
        )}
      </section>
      
      <section className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
          <History className="h-5 w-5" /> Histórico ({historyOrders.length})
        </h2>
        {historyOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
            <History className="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 font-medium">Nenhum pedido finalizado ou cancelado.</p>
          </div>
        ) : (
          historyOrders.map(renderOrderCard)
        )}
      </section>
    </div>
  );
};

export default OrdersPage;