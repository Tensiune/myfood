"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Volume2, VolumeX, Bike, MapPin, CheckCircle2, Key, Phone, User, RotateCcw } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AcceptanceTimer from "@/components/merchant/AcceptanceTimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OtpInput } from "@/components/shared/OtpInput";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";

const MerchantOrdersPage = () => {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    }
  }, []);

  const playAlert = useCallback(() => {
    if (audioEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [audioEnabled]);

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: merchantData } = await supabase.from('merchant_applications').select('is_open').eq('id', user.id).single();
      if (merchantData) setIsStoreOpen(merchantData.is_open);

      const { data, error } = await supabase
        .from('orders')
        .select(`*, driver:driver_applications!driver_id (id, full_name, phone, metadata)`)
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: any;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await fetchOrders();
      channel = supabase.channel(`orders_merchant_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `merchant_id=eq.${user.id}` }, (p) => {
          if (p.eventType === 'INSERT') playAlert();
          fetchOrders(true);
        }).subscribe();
    };
    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [fetchOrders, playAlert]);

  const handleToggleStore = async (val: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('merchant_applications').update({ is_open: val }).eq('id', user.id);
    if (!error) {
      setIsStoreOpen(val);
      showSuccess(val ? "Loja Online" : "Loja Offline");
    }
  };

  const handleAcceptOrder = async (id: string) => {
    const { error } = await supabase.from('orders').update({ status: 'PREPARING' }).eq('id', id);
    if (!error) {
      showSuccess("Pedido aceito! Buscando entregador...");
      supabase.functions.invoke('dispatch-order', { body: { orderId: id } });
      fetchOrders(true);
    }
  };

  const handleAction = async (id: string, status: string) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (!error) fetchOrders(true);
  };

  const handleRequestNewDriver = async (order: any) => {
    if (!window.confirm("Deseja remover este entregador e buscar um novo? O entregador atual não poderá mais aceitar este pedido.")) return;
    
    const tid = showLoading("Processando nova busca...");
    try {
        const currentDriverId = order.driver_id;
        const updatedRefused = Array.from(new Set([...(order.refused_drivers_ids || []), currentDriverId]));

        const { error } = await supabase
            .from('orders')
            .update({
                driver_id: null,
                current_driver_offered_id: null,
                offer_expires_at: null,
                refused_drivers_ids: updatedRefused,
                status: 'PREPARING'
            })
            .eq('id', order.id);

        if (error) throw error;

        // Dispara nova busca
        supabase.functions.invoke('dispatch-order', { body: { orderId: order.id } });

        dismissToast(tid);
        showSuccess("Novo entregador solicitado!");
        fetchOrders(true);
    } catch (err) {
        dismissToast(tid);
        showError("Erro ao solicitar novo entregador.");
    }
  };

  const handleConfirmPickup = async (order: any) => {
    const driverPhoneCode = (order.driver?.phone || "").replace(/\D/g, "").slice(-4);
    
    if (verificationCode !== driverPhoneCode) {
      showError("Código de verificação incorreto.");
      return;
    }

    setIsVerifying(true);
    const { error } = await supabase.from('orders').update({ status: 'OUT_FOR_DELIVERY' }).eq('id', order.id);
    if (!error) {
      showSuccess("Pedido liberado para entrega!");
      setVerificationCode("");
      fetchOrders(true);
    }
    setIsVerifying(false);
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
          <div className="p-10 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-center opacity-30">Vazio</div>
        ) : (
          filtered.map(o => (
            <Card key={o.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden animate-in slide-in-from-top-2">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                   <span className="text-[10px] font-black text-gray-300">#{o.id.slice(0, 6)}</span>
                   {o.status === 'PENDING' && o.merchant_acceptance_deadline && (
                     <AcceptanceTimer deadline={o.merchant_acceptance_deadline} onExpire={() => handleAction(o.id, 'CANCELLED')} />
                   )}
                </div>

                <div className="space-y-1">
                  {o.items.map((it: any, i: number) => (
                    <p key={i} className="text-sm font-bold text-gray-800"><span className="text-indigo-600">{it.quantity}x</span> {it.name}</p>
                  ))}
                </div>

                {/* Info do Entregador (Se houver) */}
                {o.driver && (
                  <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 space-y-2">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="p-2 bg-white rounded-xl"><Bike className="h-4 w-4 text-indigo-600" /></div>
                           <div>
                              <p className="text-[10px] font-black text-indigo-400 uppercase">Entregador</p>
                              <p className="text-xs font-bold text-indigo-900">{o.driver.full_name}</p>
                           </div>
                        </div>
                        {o.status === 'WAITING_FOR_DRIVER' && (
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                             title="Trocar Entregador"
                             onClick={() => handleRequestNewDriver(o)}
                           >
                             <RotateCcw className="h-4 w-4" />
                           </Button>
                        )}
                     </div>
                  </div>
                )}

                <div className="pt-2">{action(o)}</div>
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
          <p className="text-gray-500 text-sm">Gerenciamento dinâmico de entregas e despacho.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setAudioEnabled(!audioEnabled)} variant={audioEnabled ? "outline" : "default"} className={cn("rounded-2xl gap-2 h-12 px-6", !audioEnabled ? "bg-red-500 animate-bounce" : "border-indigo-100 text-indigo-600")}>
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {audioEnabled ? "Som Ativo" : "ATIVAR ALARME"}
          </Button>
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-xs font-black uppercase text-indigo-900">{isStoreOpen ? 'Online' : 'Offline'}</span>
            <Switch checked={isStoreOpen} onCheckedChange={handleToggleStore} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600 h-10 w-10" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {renderSection("Novos", "text-blue-600", o => o.status === "PENDING", o => (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-red-500 rounded-xl" onClick={() => handleAction(o.id, 'CANCELLED')}>Recusar</Button>
              <Button className="flex-1 bg-blue-600 text-white font-bold rounded-xl h-12" onClick={() => handleAcceptOrder(o.id)}>Aceitar</Button>
            </div>
          ))}
          
          {renderSection("Em Preparo", "text-orange-500", o => o.status === "PREPARING", o => (
             <div className="space-y-2">
                <Button className="w-full bg-orange-500 text-white font-bold rounded-xl h-12" onClick={() => handleAction(o.id, 'WAITING_FOR_DRIVER')}>Pronto p/ Retirada</Button>
                {!o.driver && (
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" /> Buscando Entregador...
                  </div>
                )}
             </div>
          ))}

          {renderSection("Aguardando Coleta", "text-indigo-600", o => o.status === "WAITING_FOR_DRIVER", o => (
             o.driver ? (
               <Dialog>
                 <DialogTrigger asChild>
                   <Button className="w-full bg-indigo-600 text-white font-bold rounded-xl h-12 shadow-lg shadow-indigo-100">
                     Confirmar Retirada
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="rounded-3xl sm:max-w-md p-8">
                    <DialogHeader className="text-center space-y-2">
                       <div className="bg-indigo-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-2"><Key className="h-8 w-8 text-indigo-600" /></div>
                       <DialogTitle className="text-2xl font-black text-indigo-900">Validar Código</DialogTitle>
                       <p className="text-gray-500 text-sm">Solicite ao entregador os 4 últimos dígitos do celular dele.</p>
                    </DialogHeader>
                    <div className="py-6 flex justify-center">
                       <OtpInput length={4} value={verificationCode} onChange={setVerificationCode} />
                    </div>
                    <Button 
                      className="w-full h-16 rounded-2xl bg-indigo-600 text-white font-black text-lg"
                      onClick={() => handleConfirmPickup(o)}
                      disabled={verificationCode.length < 4 || isVerifying}
                    >
                      {isVerifying ? <Loader2 className="animate-spin" /> : "Liberar Pedido"}
                    </Button>
                 </DialogContent>
               </Dialog>
             ) : (
               <div className="bg-gray-50 p-3 rounded-2xl text-center border-2 border-dashed border-gray-100">
                 <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-300 mb-1" />
                 <span className="text-[10px] font-bold text-gray-400 uppercase">Aguardando Aceite...</span>
               </div>
             )
          ))}

          {renderSection("Finalizados", "text-green-600", o => ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status), o => (
             <Badge className="w-full py-3 justify-center bg-green-50 text-green-700 border-none rounded-xl text-xs font-bold uppercase tracking-widest">
               {o.status === 'DELIVERED' ? 'Entregue ✓' : 'Em Rota...'}
             </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MerchantOrdersPage;