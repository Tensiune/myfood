"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, User, BellRing, Volume2, VolumeX } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Som de alerta curto e direto
const NOTIFICATION_SOUND_URL = "https://cdn.pixabay.com/audio/2022/03/15/audio_7325609470.mp3";

const MerchantOrdersPage = () => {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Referência persistente para o objeto de áudio
  const audioPlayer = useRef<HTMLAudioElement | null>(null);

  // Carrega áudio uma única vez
  useEffect(() => {
    audioPlayer.current = new Audio(NOTIFICATION_SOUND_URL);
    audioPlayer.current.load();
  }, []);

  const playAlert = useCallback(() => {
    if (audioEnabled && audioPlayer.current) {
      audioPlayer.current.currentTime = 0;
      audioPlayer.current.play().catch(e => console.warn("Erro ao tocar:", e));
    }
  }, [audioEnabled]);

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

      const { data, error } = await supabase
        .from('orders')
        .select(`*, driver:driver_applications!driver_id (full_name, phone)`)
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Erro fetch:", err);
      if (!isSilent) showError("Erro ao atualizar lista.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Configuração do Realtime com log de depuração
  useEffect(() => {
    let channel: any;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Inscrição em todas as mudanças da tabela orders para este lojista
      channel = supabase
        .channel('any-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `merchant_id=eq.${user.id}` },
          (payload) => {
            console.log("Realtime event received:", payload.eventType);
            
            if (payload.eventType === 'INSERT') {
              playAlert();
              showSuccess("Novo pedido!");
            }
            
            // Recarrega sempre para manter a UI sincronizada (independente do tipo de evento)
            fetchOrders(true);
          }
        )
        .subscribe((status) => {
          console.log("Realtime status:", status);
        });
    };

    fetchOrders();
    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchOrders, playAlert]);

  const toggleStore = async (val: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('merchant_applications').update({ is_open: val }).eq('id', user.id);
    if (!error) {
      setIsStoreOpen(val);
      showSuccess(val ? "Loja Aberta" : "Loja Fechada");
    }
  };

  const handleAction = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'PREPARING') updates.auto_transition_at = new Date(Date.now() + 15 * 60000).toISOString();
    
    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (!error) fetchOrders(true);
  };

  // Função vital para "desbloquear" o som no navegador
  const enableSound = () => {
    if (audioPlayer.current) {
      audioPlayer.current.play().then(() => {
        audioPlayer.current?.pause();
        setAudioEnabled(true);
        showSuccess("Alertas sonoros ativados!");
      }).catch(() => {
        showError("Clique novamente para ativar o som.");
      });
    }
  };

  const renderList = (title: string, color: string, filter: (o: any) => boolean, action: (o: any) => React.ReactNode) => {
    const filtered = orders.filter(filter);
    return (
      <div className="space-y-4">
        <h2 className={cn("font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-2", color)}>
          <span className={cn("h-2 w-2 rounded-full", color.replace('text-', 'bg-'))} /> {title} ({filtered.length})
        </h2>
        {filtered.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-gray-100 rounded-[2rem] text-center opacity-30">Vazio</div>
        ) : (
          filtered.map(o => (
            <Card key={o.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-gray-300">#{o.id.slice(0, 6)}</span>
                  {o.status === 'PENDING' && <Badge className="bg-red-500 animate-pulse">NOVO</Badge>}
                </div>
                <div className="space-y-1">
                  {o.items.map((it: any, i: number) => (
                    <p key={i} className="text-sm font-bold"><span className="text-indigo-600">{it.quantity}x</span> {it.name}</p>
                  ))}
                </div>
                <div className="pt-2">{action(o)}</div>
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
          <h1 className="text-4xl font-black text-indigo-900 tracking-tighter">Pedidos</h1>
          <p className="text-gray-500 text-sm">Atualização automática ativada.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={enableSound}
            variant={audioEnabled ? "outline" : "default"}
            className={cn("rounded-2xl gap-2 h-12 px-6", !audioEnabled && "bg-brand-accent animate-bounce")}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {audioEnabled ? "Som Ativo" : "Ativar Som"}
          </Button>
          
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-xs font-black uppercase text-indigo-900">{isStoreOpen ? 'Online' : 'Offline'}</span>
            <Switch checked={isStoreOpen} onCheckedChange={toggleStore} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600 h-10 w-10" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {renderList("Novos", "text-blue-600", o => o.status === "PENDING", o => (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-red-500" onClick={() => handleAction(o.id, 'CANCELLED')}>Recusar</Button>
              <Button className="flex-1 bg-blue-600 text-white font-bold" onClick={() => handleAction(o.id, 'PREPARING')}>Aceitar</Button>
            </div>
          ))}
          {renderList("Preparo", "text-orange-500", o => o.status === "PREPARING", o => (
            <Button className="w-full bg-orange-500 text-white font-bold" onClick={() => handleAction(o.id, 'WAITING_FOR_DRIVER')}>Pronto</Button>
          ))}
          {renderList("Aguardando", "text-indigo-600", o => o.status === "WAITING_FOR_DRIVER", o => (
            <div className="text-[10px] font-bold text-center text-gray-400 uppercase">Buscando Entregador...</div>
          ))}
          {renderList("Finalizados", "text-green-600", o => ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status), o => (
             <Badge className="w-full py-2 justify-center bg-green-100 text-green-700 border-none">{o.status === 'DELIVERED' ? 'Entregue' : 'Em Rota'}</Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MerchantOrdersPage;