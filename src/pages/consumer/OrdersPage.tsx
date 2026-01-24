"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle, Star, Loader2, Store, ChevronRight } from "lucide-react";
import RatingComponent from "@/components/consumer/RatingComponent";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const OrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*, merchant:merchant_id(store_name, metadata)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      showError("Erro ao carregar seus pedidos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Realtime subscription for status updates
    const channel = supabase
      .channel('order_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return "Aguardando Loja";
      case "PREPARING": return "Em Preparo";
      case "READY_FOR_PICKUP": return "Aguardando Coleta";
      case "OUT_FOR_DELIVERY": return "Saiu para Entrega";
      case "DELIVERED": return "Entregue";
      case "CANCELLED": return "Cancelado";
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none rounded-full">Pendente</Badge>;
      case "PREPARING": return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none rounded-full">Em Preparo</Badge>;
      case "OUT_FOR_DELIVERY": return <Badge className="bg-yellow-500 text-white rounded-full">Em Entrega</Badge>;
      case "DELIVERED": return <Badge className="bg-green-500 text-white rounded-full">Entregue</Badge>;
      case "CANCELLED": return <Badge variant="destructive" className="rounded-full">Cancelado</Badge>;
      default: return <Badge variant="secondary" className="rounded-full">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Carregando seus pedidos...</p>
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== "DELIVERED" && o.status !== "CANCELLED");
  const pastOrders = orders.filter(o => o.status === "DELIVERED" || o.status === "CANCELLED");

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-4xl font-bold text-indigo-800 text-center tracking-tight">Meus Pedidos</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
           <Clock className="h-5 w-5" /> Ativos
        </h2>
        {activeOrders.length > 0 ? (
          activeOrders.map((order) => (
            <Card key={order.id} className="rounded-3xl border-none shadow-md hover:shadow-lg transition-all overflow-hidden bg-white">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-gray-900 text-lg leading-tight">
                      {order.merchant?.store_name || "Loja"}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Pedido #{order.id.slice(0, 8)}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                
                <div className="space-y-1">
                   {order.items.map((item: any, i: number) => (
                     <p key={i} className="text-sm text-gray-600">
                       <span className="font-bold text-indigo-600">{item.quantity}x</span> {item.name}
                     </p>
                   ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <span className="font-black text-indigo-900 text-lg">R$ {order.total.toFixed(2)}</span>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                    {getStatusLabel(order.status)}
                  </div>
                </div>

                {order.status === "OUT_FOR_DELIVERY" && (
                   <Button 
                    className="w-full rounded-2xl bg-brand-accent text-white font-bold h-12 shadow-lg shadow-brand-accent/20"
                    onClick={() => navigate(`/track/${order.id}`)}
                   >
                     Acompanhar Entrega <ChevronRight className="ml-2 h-4 w-4" />
                   </Button>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-medium italic">Nenhum pedido ativo no momento.</p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
           <Package className="h-5 w-5" /> Histórico
        </h2>
        {pastOrders.length > 0 ? (
          pastOrders.map((order) => (
            <Card key={order.id} className="rounded-3xl border border-gray-100 shadow-sm opacity-80 hover:opacity-100 transition-all bg-white">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">{order.merchant?.store_name || "Loja"}</h3>
                  {getStatusBadge(order.status)}
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">
                   {order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                </p>
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase">
                  <span>{new Date(order.created_at).toLocaleDateString()} às {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-gray-900">Total: R$ {order.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-center text-gray-400 py-8 italic">Você ainda não tem pedidos entregues.</p>
        )}
      </section>
    </div>
  );
};

export default OrdersPage;