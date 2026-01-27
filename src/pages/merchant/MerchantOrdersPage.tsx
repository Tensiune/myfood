"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, XCircle, CheckCircle2, User, Phone, Key, Clock, AlertCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";

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

      // 1. Status da loja
      const { data: merchantData } = await supabase
        .from('merchant_applications')
        .select('is_open')
        .eq('id', user.id)
        .single();
      if (merchantData) setIsStoreOpen(merchantData.is_open);

      // 2. Buscar pedidos - Ajustado para buscar da tabela correta 'driver_applications'
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          driver:driver_id (
            full_name,
            phone
          )
        `) 
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error("Erro na consulta de pedidos:", ordersError);
        throw ordersError;
      }
      
      setOrders(ordersData || []);
    } catch (err: any) {
      console.error("[MerchantOrders] Erro crítico:", err);
      if (!isSilent) showError("Erro ao sincronizar pedidos: " + (err.message || "Verifique sua conexão"));
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`merchant-orders-${user.id}`)
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'orders', filter: `merchant_id=eq.${user.id}` }, 
          (payload) => {
            if (payload.eventType === 'INSERT') {
              new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
              showSuccess("Novo pedido recebido!");
              if (!payload.new.scheduled_at) {
                supabase.functions.invoke('dispatch-order', { body: { orderId: payload.new.id } });
              }
            }
            fetchOrders(true);
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchOrders]);

  const handleAccept = async (orderId: string) => {
    const autoTransitionAt = new Date(Date.now() + 15 * 60000).toISOString();
    const { error } = await supabase.from('orders').update({ 
      status: 'PREPARING', 
      auto_transition_at: autoTransitionAt,
      merchant_acceptance_deadline: null 
    }).eq('id', orderId);
    
    if (error) showError("Falha ao aceitar pedido");
    else fetchOrders(true);
  };

  const handleReject = async (orderId: string) => {
    if (!window.confirm("Deseja realmente recusar este pedido?")) return;
    const { error } = await supabase.from('orders').update({ 
      status: 'CANCELLED',
      merchant_acceptance_deadline: null 
    }).eq('id', orderId);
    
    if (error) showError("Falha ao recusar pedido");
    else fetchOrders(true);
  };

  const handleReady = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ 
      status: 'WAITING_FOR_DRIVER', 
      auto_transition_at: null 
    }).eq('id', orderId);
    
    if (error) showError("Falha ao atualizar status");
    else fetchOrders(true);
  };

  const toggleStoreStatus = async (open: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('merchant_applications').update({ is_open: open }).eq('id', user.id);
    if (error) showError("Erro ao mudar status da loja");
    else {
      setIsStoreOpen(open);
      showSuccess(open ? "Loja Aberta!" : "Loja Fechada.");
    }
  };

  const renderOrderList = (title: string, color: string, filter: (o: any) => boolean, action: (o: any) => React.ReactNode) => {
    const filtered = orders.filter(filter);
    return (
      <div className="space-y-4">
        <h2 className={cn("font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-2", color)}>
          <span className={cn("h-2 w-2 rounded-full", color.replace('text-', 'bg-'))} /> 
          {title} ({filtered.length})
        </h2>
        
        {filtered.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
            <p className="text-[10px] font-bold text-gray-300 uppercase">Sem pedidos</p>
          </div>
        ) : (
          filtered.map(order => (
            <Card key={order.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden animate-in fade-in">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-gray-400">#{order.id.slice(0, 6)}</span>
                  {order.status === 'PENDING' && (
                    <Badge variant="outline" className="text-red-500 border-red-100 bg-red-50">
                      8 min para aceitar
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1">
                  {order.items.map((item: any, i: number) => (
                    <p key={i} className="text-sm font-medium"><span className="text-indigo-600 font-black">{item.quantity}x</span> {item.name}</p>
                  ))}
                </div>

                {order.driver_id && (
                  <div className="p-3 bg-indigo-50 rounded-2xl flex items-center gap-3 border border-indigo-100">
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 font-bold">
                      {order.driver?.full_name?.charAt(0) || "D"}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">Entregador</p>
                      <p className="font-bold text-indigo-900 text-xs truncate">{order.driver?.full_name || "Vinculado"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Coleta</p>
                      <p className="font-black text-indigo-600 text-xs">
                        *{order.driver?.phone?.slice(-4) || '----'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2">{action(order)}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-4xl font-black text-indigo-900">Painel de Pedidos</h1><p className="text-gray-500 text-sm">Controle sua operação em tempo real.</p></div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-gray-100" onClick={() => fetchOrders()}>
            <RefreshCcw className={cn("h-5 w-5", loading && "animate-spin")} />
          </Button>
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-xs font-black uppercase text-indigo-900">Loja {isStoreOpen ? 'Aberta' : 'Fechada'}</span>
            <Switch checked={isStoreOpen} onCheckedChange={toggleStoreStatus} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {renderOrderList("Novos", "text-blue-600", o => o.status === "PENDING", o => (
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 rounded-xl text-red-500 h-12" onClick={() => handleReject(o.id)}>Recusar</Button>
            <Button className="flex-1 rounded-xl bg-blue-600 h-12" onClick={() => handleAccept(o.id)}>Aceitar</Button>
          </div>
        ))}
        {renderOrderList("Em Preparo", "text-orange-500", o => o.status === "PREPARING", o => (
          <Button className="w-full rounded-xl bg-orange-500 h-12" onClick={() => handleReady(o.id)}>Pronto para Entrega</Button>
        ))}
        {renderOrderList("Aguardando Coleta", "text-indigo-600", o => o.status === "WAITING_FOR_DRIVER", o => (
          <div className="bg-indigo-50/50 p-4 rounded-2xl text-center border border-indigo-100/50">
            <p className="text-xs font-bold text-indigo-800">{o.driver_id ? "Entregador a caminho" : "Buscando entregador..."}</p>
          </div>
        ))}
        {renderOrderList("Concluídos", "text-green-600", o => o.status === "OUT_FOR_DELIVERY" || o.status === "DELIVERED", o => (
           <Badge className="w-full py-3 rounded-xl border-none justify-center font-bold bg-green-100 text-green-700">
             {o.status === "DELIVERED" ? "Entregue" : "Em Rota"}
           </Badge>
        ))}
      </div>
    </div>
  );
};

export default MerchantOrdersPage;