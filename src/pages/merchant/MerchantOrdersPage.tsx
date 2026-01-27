"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, User, BellRing, Volume2, VolumeX, Store, Clock } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Som de notificação curto e confiável
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3";

const MerchantOrdersPage = () => {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Referência para o áudio para evitar recriações
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inicializa o player de áudio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      audioRef.current.preload = "auto";
    }
  }, []);

  const playAlert = useCallback(() => {
    if (audioEnabled && audioRef.current) {
      // Reinicia o som se já estiver tocando
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("[Audio] Erro ao tocar som:", error);
          setAudioEnabled(false); // Desativa se o navegador bloquear novamente
        });
      }
    }
  }, [audioEnabled]);

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

      // Busca pedidos (com dados do motorista se houver)
      const { data, error } = await supabase
        .from('orders')
        .select(`*, driver:driver_applications!driver_id (full_name, phone)`)
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("[Orders] Erro ao buscar pedidos:", err);
      if (!isSilent) showError("Erro ao atualizar a lista de pedidos.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Configuração do Realtime - Canal específico por lojista
  useEffect(() => {
    let channel: any;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Inicia com a lista atual
      await fetchOrders();

      // Cria um canal único para este lojista
      channel = supabase
        .channel(`orders_channel_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Monitora Insert, Update e Delete
            schema: 'public',
            table: 'orders',
            filter: `merchant_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("[Realtime] Mudança detectada:", payload.eventType, payload.new.id);
            
            // Se for um novo pedido, toca o som e mostra sucesso
            if (payload.eventType === 'INSERT') {
              playAlert();
              showSuccess("Novo pedido recebido!");
            }
            
            // Recarrega os dados imediatamente
            fetchOrders(true);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Status da conexão: ${status}`);
          if (status === 'CHANNEL_ERROR') {
              console.error("[Realtime] Erro no canal, tentando reconectar...");
              setTimeout(setupRealtime, 2000);
          }
        });
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchOrders, playAlert]);

  const handleToggleStore = async (val: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('merchant_applications')
      .update({ is_open: val })
      .eq('id', user.id);

    if (error) {
      showError("Erro ao alterar status da loja.");
    } else {
      setIsStoreOpen(val);
      showSuccess(val ? "Loja aberta com sucesso!" : "Loja fechada.");
    }
  };

  const handleAction = async (id: string, status: string) => {
    const updates: any = { status };
    // Se aceitar, define tempo de preparo de 15min
    if (status === 'PREPARING') {
      updates.auto_transition_at = new Date(Date.now() + 15 * 60000).toISOString();
    }
    
    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (error) {
      showError("Erro ao atualizar pedido.");
    } else {
      fetchOrders(true);
    }
  };

  // Desbloqueia o áudio através de uma interação do usuário
  const enableAudio = () => {
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => {
          // O navegador agora permitiu o som para este domínio
          audioRef.current?.pause();
          setAudioEnabled(true);
          showSuccess("Notificações sonoras ativas!");
        })
        .catch((e) => {
          console.error("[Audio] Falha no desbloqueio:", e);
          showError("Interaja com a página e tente ativar o som novamente.");
        });
    }
  };

  const renderSection = (title: string, color: string, filter: (o: any) => boolean, action: (o: any) => React.ReactNode) => {
    const filtered = orders.filter(filter);
    return (
      <div className="space-y-4">
        <h2 className={cn("font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-2", color)}>
          <span className={cn("h-2 w-2 rounded-full", color.replace('text-', 'bg-'))} />
          {title} ({filtered.length})
        </h2>
        {filtered.length === 0 ? (
          <div className="p-10 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-center bg-white/50">
            <p className="text-[10px] font-bold text-gray-300 uppercase">Nenhum pedido</p>
          </div>
        ) : (
          filtered.map(order => (
            <Card key={order.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden animate-in fade-in slide-in-from-top-1">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-gray-300">#{order.id.slice(0, 6)}</span>
                  {order.status === 'PENDING' && <Badge className="bg-red-500 animate-pulse">NOVO</Badge>}
                </div>
                <div className="space-y-1">
                  {order.items.map((item: any, i: number) => (
                    <p key={i} className="text-sm font-bold text-gray-800">
                      <span className="text-indigo-600">{item.quantity}x</span> {item.name}
                    </p>
                  ))}
                </div>
                <div className="pt-2">{action(order)}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-indigo-900 tracking-tighter">Painel de Pedidos</h1>
          <p className="text-gray-500 text-sm">Atualizações automáticas em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={enableAudio}
            variant={audioEnabled ? "outline" : "default"}
            className={cn(
              "rounded-2xl gap-2 h-12 px-6 transition-all", 
              !audioEnabled ? "bg-brand-accent hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/20 animate-bounce" : "border-indigo-100 text-indigo-600"
            )}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {audioEnabled ? "Som Ativo" : "Ativar Alerta Sonoro"}
          </Button>
          
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-xs font-black uppercase text-indigo-900">{isStoreOpen ? 'Online' : 'Offline'}</span>
            <Switch checked={isStoreOpen} onCheckedChange={handleToggleStore} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600 h-10 w-10" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {renderSection("Novos", "text-blue-600", o => o.status === "PENDING", o => (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-red-500 h-11" onClick={() => handleAction(o.id, 'CANCELLED')}>Recusar</Button>
              <Button className="flex-1 bg-blue-600 text-white font-bold h-11 rounded-xl shadow-lg shadow-blue-100" onClick={() => handleAction(o.id, 'PREPARING')}>Aceitar</Button>
            </div>
          ))}

          {renderSection("Preparando", "text-orange-500", o => o.status === "PREPARING", o => (
            <Button className="w-full bg-orange-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-orange-100" onClick={() => handleAction(o.id, 'WAITING_FOR_DRIVER')}>Pronto p/ Coleta</Button>
          ))}

          {renderSection("Aguardando", "text-indigo-600", o => o.status === "WAITING_FOR_DRIVER", o => (
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-widest bg-gray-50 p-2 rounded-xl">Buscando Entregador...</div>
              {o.driver_id && (
                <div className="p-3 bg-green-50 rounded-2xl border border-green-100">
                  <p className="text-[10px] font-black text-green-600 uppercase">Entregador Vinculado</p>
                  <p className="text-xs font-bold text-green-900">{o.driver?.full_name}</p>
                </div>
              )}
            </div>
          ))}

          {renderSection("Finalizados", "text-green-600", o => ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status), o => (
             <Badge className={cn(
               "w-full py-3 rounded-2xl justify-center font-black border-none text-xs uppercase tracking-widest",
               o.status === 'DELIVERED' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
             )}>
               {o.status === 'DELIVERED' ? 'Entregue' : 'Em Rota'}
             </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MerchantOrdersPage;