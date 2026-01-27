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

const MerchantOrdersPage = () => {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Atualizar status da loja
      const { data: merchantData } = await supabase
        .from('merchant_applications')
        .select('is_open')
        .eq('id', user.id)
        .single();
      if (merchantData) setIsStoreOpen(merchantData.is_open);

      // 2. Buscar pedidos vinculados a este lojista
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, driver:driver_id(full_name, metadata)') 
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      
      console.log("[MerchantOrders] Pedidos carregados:", ordersData?.length);
      setOrders(ordersData || []);
    } catch (err: any) {
      console.error("[MerchantOrders] Erro ao buscar pedidos:", err.message);
      if (!isSilent) showError("Erro ao sincronizar pedidos.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log("[MerchantOrders] Iniciando canal Realtime para:", user.id);

      // Escuta mudanças na tabela de pedidos para este merchant_id
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
            console.log("[MerchantOrders] Mudança detectada:", payload.eventType, payload.new?.id);
            
            if (payload.eventType === 'INSERT') {
              // Tocar som de novo pedido
              new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
              showSuccess("Novo pedido recebido!");
              
              // Disparar despacho imediato se não for agendado
              if (!payload.new.scheduled_at) {
                supabase.functions.invoke('dispatch-order', { body: { orderId: payload.new.id } });
              }
            }
            
            // Recarregar a lista inteira para garantir consistência
            fetchOrders(true);
          }
        )
        .subscribe((status) => {
          console.log("[MerchantOrders] Status do canal:", status);
        });

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        console.log("[MerchantOrders] Removendo canal Realtime");
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchOrders]);

  const handleAccept = async (orderId: string) => {
    // 15 minutos para preparo por padrão
    const autoTransitionAt = new Date(Date.now() + 15 * 60000).toISOString();
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'PREPARING', 
        auto_transition_at: autoTransitionAt,
        merchant_acceptance_deadline: null 
      })
      .eq('id', orderId);
    
    if (error) {
      showError("Erro ao aceitar pedido.");
    } else {
      showSuccess("Pedido aceito! Comece o preparo.");
      fetchOrders(true);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!window.confirm("Deseja realmente recusar este pedido? O cliente será notificado.")) return;
    
    const { error } = await supabase
      .from('orders')
      .update({ status: 'CANCELLED', merchant_acceptance_deadline: null })
      .eq('id', orderId);

    if (error) {
      showError("Erro ao recusar pedido.");
    } else {
      showSuccess("Pedido recusado.");
      fetchOrders(true);
    }
  };

  const handleReady = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'WAITING_FOR_DRIVER', auto_transition_at: null })
      .eq('id', orderId);

    if (error) {
      showError("Erro ao atualizar status.");
    } else {
      showSuccess("Pedido pronto para coleta!");
      fetchOrders(true);
    }
  };

  const toggleStoreStatus = async (open: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('merchant_applications')
      .update({ is_open: open })
      .eq('id', user.id);

    if (error) {
      showError("Erro ao atualizar status da loja.");
    } else {
      setIsStoreOpen(open);
      showSuccess(open ? "Loja Aberta!" : "Loja Fechada.");
    }
  };

  const renderOrderList = (title: string, color: string, filter: (o: any) => boolean, action: (o: any) => React.ReactNode) => {
    const filteredOrders = orders.filter(filter);
    
    return (
      <div className="space-y-4">
        <h2 className={cn("font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-2", color)}>
          <span className={cn("h-2 w-2 rounded-full", color.replace('text-', 'bg-'))} /> 
          {title} ({filteredOrders.length})
        </h2>
        
        {filteredOrders.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
            <p className="text-[10px] font-bold text-gray-300 uppercase">Sem pedidos</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <Card key={order.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-gray-400">#{order.id.slice(0, 6)}</span>
                  {order.merchant_acceptance_deadline && order.status === 'PENDING' && (
                    <Badge variant="outline" className="text-red-500 border-red-100 bg-red-50 animate-pulse">
                      <Clock className="h-3 w-3 mr-1" /> Expira em breve
                    </Badge>
                  )}
                  {order.scheduled_at && (
                    <Badge className="bg-indigo-100 text-indigo-600 border-none">
                      Agendado: {new Date(order.scheduled_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1">
                  {order.items.map((item: any, i: number) => (
                    <p key={i} className="text-sm font-medium">
                      <span className="text-indigo-600 font-black">{item.quantity}x</span> {item.name}
                    </p>
                  ))}
                </div>

                {order.driver_id && (
                  <div className="p-3 bg-indigo-50 rounded-2xl flex items-center gap-3 border border-indigo-100">
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center">
                      <User className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">Entregador</p>
                      <p className="font-bold text-indigo-900 text-xs truncate">{order.driver?.full_name || "Vinculando..."}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Celular</p>
                      <p className="font-black text-indigo-600 text-xs">
                        *{order.driver?.metadata?.phone?.slice(-4) || '----'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  {action(order)}
                </div>
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
        <div>
          <h1 className="text-4xl font-black text-indigo-900">Gestão de Pedidos</h1>
          <p className="text-gray-500 text-sm">Acompanhe e despache suas vendas em tempo real.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full h-12 w-12 border-gray-100 text-gray-400 hover:text-indigo-600"
            onClick={() => fetchOrders()}
          >
            <RefreshCcw className={cn("h-5 w-5", loading && "animate-spin")} />
          </Button>
          
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-xs font-black uppercase text-indigo-900">
              Loja {isStoreOpen ? 'Aberta' : 'Fechada'}
            </span>
            <Switch 
              checked={isStoreOpen} 
              onCheckedChange={toggleStoreStatus} 
              className="data-[state=checked]:bg-green-500" 
            />
          </div>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-bold">Carregando painel...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {renderOrderList("Novos Pedidos", "text-blue-600", o => o.status === "PENDING", o => (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 rounded-xl text-red-500 hover:bg-red-50 h-12 font-bold" onClick={() => handleReject(o.id)}>Recusar</Button>
              <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 h-12 font-bold text-white shadow-lg shadow-blue-100" onClick={() => handleAccept(o.id)}>Aceitar</Button>
            </div>
          ))}
          
          {renderOrderList("Em Preparo", "text-orange-500", o => o.status === "PREPARING", o => (
            <Button className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 h-12 font-bold text-white shadow-lg shadow-orange-100" onClick={() => handleReady(o.id)}>
              Concluir Preparo
            </Button>
          ))}
          
          {renderOrderList("Aguardando Coleta", "text-indigo-600", o => o.status === "WAITING_FOR_DRIVER", o => (
            <div className="bg-indigo-50/50 p-4 rounded-2xl text-center border border-indigo-100/50">
              <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Aguardando Coleta</p>
              <p className="text-xs font-bold text-indigo-800">
                {o.driver_id ? "Entregador a caminho da loja" : "Buscando entregador parceiro..."}
              </p>
            </div>
          ))}
          
          {renderOrderList("Em Rota / Finalizados", "text-green-600", o => o.status === "OUT_FOR_DELIVERY" || o.status === "DELIVERED", o => (
            <Badge className={cn(
              "w-full py-3 rounded-xl border-none justify-center font-bold",
              o.status === "DELIVERED" ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"
            )}>
              {o.status === "DELIVERED" ? "Pedido Finalizado" : "Entregador em Rota"}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MerchantOrdersPage;