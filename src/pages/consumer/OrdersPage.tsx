"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, Loader2, ChevronRight, Key, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

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
        .select('*, merchant:merchant_id(*)')
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

    // Inscrição Realtime para atualizações de status
    const channel = supabase
      .channel('client_order_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        // Se o status mudou para entrega, avisa o usuário
        if (payload.new.status === 'OUT_FOR_DELIVERY') {
           showSuccess("Seu pedido saiu para entrega!");
        }
        // Força a busca completa para atualizar o estado local
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
      case "DELIVERED": return <Badge className="bg-green-500 text-white rounded-full">Entregue</Badge>;
      case "CANCELLED": return <Badge variant="destructive" className="rounded-full">Cancelado</Badge>;
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

  const activeOrders = orders.filter(o => o.status !== "DELIVERED" && o.status !== "CANCELLED");

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-4xl font-bold text-indigo-800 text-center tracking-tight">Meus Pedidos</h1>

      {activeOrders.map((order) => (
        <Card key={order.id} className="rounded-3xl border-none shadow-md overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-2">
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
              <span className="text-xs text-gray-400 font-bold uppercase">{new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
          </CardContent>
        </Card>
      ))}

      {activeOrders.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
          <Package className="h-10 w-10 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 font-medium">Você não tem pedidos ativos.</p>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;