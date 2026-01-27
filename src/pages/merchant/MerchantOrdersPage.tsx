"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, User, Clock } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";

// URL de um som de notificação padrão
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3";

const MerchantOrdersPage = () => {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inicializa o áudio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.error("Erro ao tocar som (bloqueio do navegador):", err));
    }
  };

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
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
        .select(`
          *,
          driver:driver_applications!driver_id (
            full_name,
            phone
          )
        `) 
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      
      setOrders(ordersData || []);
    } catch (err: any) {
      console.error("[MerchantOrders] Erro na consulta:", err);
      if (err.message?.includes('relationship')) {
          const { data: fallbackData } = await supabase
            .from('orders')
            .select('*')
            .eq('merchant_id', user.id)
            .order('created_at', { ascending: false });
          if (fallbackData) setOrders(fallbackData);
      }
      
      if (!isSilent) showError("Sincronizando dados...");
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
            // Toca o som apenas se for um NOVO pedido (INSERT)
            if (payload.eventType === 'INSERT') {
              playNotificationSound();
              showSuccess("Novo pedido recebido!");
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
    else {
      showSuccess("Pedido aceito!");
      fetchOrders(true);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!window.confirm("Recusar este pedido?")) return;
    const { error } = await supabase.from('orders').update({ 
      status: 'CANCELLED',
      merchant_acceptance_deadline: null 
    }).eq('id', orderId);
    
    if (error) showError("Falha ao recusar");
    else fetchOrders(true);
  };

  const handleReady = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ 
      status: 'WAITING_FOR_DRIVER', 
      auto_transition_at: null 
    }).eq('id', orderId);
    
    if (error) showError("Falha ao atualizar");
    else {
      showSuccess("Pedido pronto!");
      fetchOrders(true);
    }
  };

  const toggleStoreStatus = async (open: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('merchant_applications').update({ is_open: open }).eq('id', user.id);
    if (error) showError("Erro ao mudar status");
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
            <p className="text-[10px] font-bold text-gray-300 uppercase">Vazio</p>
          </div>
        ) : (
          filtered.map(order => (
            <Card key={order.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-gray-400">#{order.id.slice(0, 6)}</span>
                  {order.status === 'PENDING' && (
                    <Badge variant="outline" className="text-red-500 border-red-100 bg-red-50 animate-pulse">
                      Urgente
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
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center">
                      <User className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">Entregador</p>
                      <p className="font-bold text-indigo-900 text-xs truncate">{order.driver?.full_name || "A caminho..."}</p>
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
        <div><h1 className="text-4xl font-black text-indigo-900">Pedidos</h1><p className="text-gray-500 text-sm">Gerencie suas vendas aqui.</p></div>
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
            <Button className="flex-1 rounded-xl bg-blue-600 h-12 text-white font-bold" onClick={() => handleAccept(o.id)}>Aceitar</Button>
          </div>
        ))}
        {renderOrderList("Preparo", "text-orange-500", o => o.status === "PREPARING", o => (
          <Button className="w-full rounded-xl bg-orange-500 h-12 text-white font-bold" onClick={() => handleReady(o.id)}>Pronto</Button>
        ))}
        {renderOrderList("Coleta", "text-indigo-600", o => o.status === "WAITING_FOR_DRIVER", o => (
          <div className="bg-indigo-50/50 p-4 rounded-2xl text-center border border-indigo-100/50">
            <p className="text-xs font-bold text-indigo-800">{o.driver_id ? "Motorista vinculado" : "Buscando entregador..."}</p>
          </div>
        ))}
        {renderOrderList("Finalizados", "text-green-600", o => o.status === "OUT_FOR_DELIVERY" || o.status === "DELIVERED", o => (
           <Badge className="w-full py-3 rounded-xl border-none justify-center font-bold bg-green-100 text-green-700">
             {o.status === "DELIVERED" ? "Entregue" : "Em Rota"}
           </Badge>
        ))}
      </div>
    </div>
  );
};

export default MerchantOrdersPage;