"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Volume2, VolumeX, Bike, MapPin, CheckCircle2, Key, Phone, User, RotateCcw, X, Send, AlertTriangle } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AcceptanceTimer from "@/components/merchant/AcceptanceTimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { OtpInput } from "@/components/shared/OtpInput";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";

const MerchantOrdersPage = () => {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Novos estados para o modal de Nova Entrega
  const [isRecallDialogOpen, setIsRecallDialogOpen] = useState(false);
  const [orderToRecall, setOrderToRecall] = useState<any>(null);
  const [manualDescription, setManualDescription] = useState("");
  const [isRecalling, setIsRecalling] = useState(false);

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
    const tid = showLoading("Aceitando pedido...");
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'PREPARING',
          merchant_acceptance_deadline: null,
        })
        .eq('id', id);
      
      if (updateError) throw updateError;

      // Dispara a busca por entregador
      const { data, error: functionError } = await supabase.functions.invoke('dispatch-order', {
        body: { orderId: id }
      });

      if (functionError) throw functionError;

      showSuccess("Pedido aceito!");
      dismissToast(tid);
      fetchOrders(true);
    } catch (err: any) {
      dismissToast(tid);
      showError("Erro: " + (err.message || "Erro desconhecido"));
    }
  };

  const handleAction = async (id: string, status: string) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (!error) {
          showSuccess("Status atualizado!");
          fetchOrders(true);
      }
  };
  
  const handleCancelOrder = async (id: string) => {
    if (!window.confirm("ATENÇÃO: Você tem certeza que deseja cancelar este pedido? O cliente e o entregador serão notificados.")) return;
    
    const tid = showLoading("Cancelando pedido...");
    try {
        const { error } = await supabase.from('orders').update({ 
          status: 'CANCELLED',
          current_driver_offered_id: null,
          offer_expires_at: null
        }).eq('id', id);

        if (error) throw error;
        showSuccess("Pedido cancelado com sucesso.");
        fetchOrders(true);
    } catch (err) {
        showError("Não foi possível cancelar o pedido.");
    } finally {
        dismissToast(tid);
    }
  };

  // Abre o modal de descrição
  const handleOpenRecallDialog = (order: any) => {
    setOrderToRecall(order);
    
    // Gera descrição padrão
    const defaultDesc = order.items.map((item: any) => `${item.quantity}x ${item.name}`).join(', ');
    setManualDescription(`Itens: ${defaultDesc}. Total: R$ ${order.total.toFixed(2)}.`);
    
    setIsRecallDialogOpen(true);
  };

  // Finaliza o processo de chamar novo entregador
  const handleFinalizeReCall = async () => {
    if (!orderToRecall || !manualDescription.trim()) {
      showError("A descrição do pedido é obrigatória.");
      return;
    }

    setIsRecalling(true);
    const tid = showLoading("Reiniciando processo de entrega...");
    
    try {
      const currentRefused = orderToRecall.refused_drivers_ids || [];
      // Se havia um entregador, adicionamos aos recusados para esta nova busca não cair pra ele de novo
      if (orderToRecall.driver_id) {
          currentRefused.push(orderToRecall.driver_id);
      }

      // 1. Atualiza o pedido para PREPARING e limpa dados de entregador
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'PREPARING',
          driver_id: null,
          current_driver_offered_id: null,
          offer_expires_at: null,
          refused_drivers_ids: Array.from(new Set(currentRefused)),
          // Adiciona a descrição manual para o entregador ver
          metadata: { 
            ...orderToRecall.metadata, 
            driver_manual_description: manualDescription 
          }
        })
        .eq('id', orderToRecall.id);

      if (updateError) throw updateError;
      
      // 2. Dispara a busca por entregador (Edge Function)
      const { error: dispatchError } = await supabase.functions.invoke('dispatch-order', {
        body: { orderId: orderToRecall.id }
      });

      if (dispatchError) throw dispatchError;

      showSuccess("Nova entrega solicitada! Buscando entregador...");
      fetchOrders(true);
      setIsRecallDialogOpen(false);
    } catch (err: any) {
      showError("Erro ao solicitar nova entrega: " + err.message);
    } finally {
      dismissToast(tid);
      setIsRecalling(false);
    }
  };

  const handleConfirmPickup = async (order: any) => {
    const driverPhoneCode = (order.driver?.phone || "").replace(/\D/g, "").slice(-4);
    if (verificationCode !== driverPhoneCode) {
      showError("Código incorreto. Peça ao entregador para mostrar os últimos 4 dígitos do telefone no app dele.");
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
            <Card key={o.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden animate-in fade-in">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                   <span className="text-[10px] font-black text-gray-300">#{o.id.slice(0, 6)}</span>
                   {o.status === 'PENDING' && o.merchant_acceptance_deadline && (
                     <AcceptanceTimer deadline={o.merchant_acceptance_deadline} onExpire={() => handleAction(o.id, 'CANCELLED')} />
                   )}
                   {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && o.status !== 'PENDING' && (
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-gray-300 hover:text-red-500 rounded-full"
                        onClick={() => handleCancelOrder(o.id)}
                        title="Cancelar Pedido"
                     >
                        <X className="h-4 w-4" />
                     </Button>
                   )}
                </div>
                <div className="space-y-1">
                  {o.items.map((it: any, i: number) => (
                    <p key={i} className="text-sm font-bold text-gray-800"><span className="text-indigo-600">{it.quantity}x</span> {it.name}</p>
                  ))}
                </div>
                {o.driver && (
                  <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase">Entregador</p>
                    <p className="text-xs font-bold text-indigo-900">{o.driver.full_name}</p>
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
        <div><h1 className="text-4xl font-black text-indigo-900 tracking-tighter">Painel de Pedidos</h1></div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setAudioEnabled(!audioEnabled)} variant={audioEnabled ? "outline" : "default"} className={cn("rounded-2xl gap-2 h-12 px-6", !audioEnabled && "bg-red-500 animate-bounce")}>
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {audioEnabled ? "Som Ativo" : "ATIVAR ALARME"}
          </Button>
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-xs font-black uppercase text-indigo-900">{isStoreOpen ? 'Online' : 'Offline'}</span>
            <Switch checked={isStoreOpen} onCheckedChange={handleToggleStore} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600 h-10 w-10" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          {renderSection("Novos", "text-blue-600", o => o.status === "PENDING", o => (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-red-500 rounded-xl" onClick={() => handleCancelOrder(o.id)}>Recusar</Button>
              <Button className="flex-1 bg-blue-600 text-white font-bold rounded-xl h-12" onClick={() => handleAcceptOrder(o.id)}>Aceitar</Button>
            </div>
          ))}
          
          {renderSection("Em Preparo", "text-orange-500", o => o.status === "PREPARING", o => (
            <div className="space-y-2">
               <Button className="w-full bg-orange-500 text-white font-bold rounded-xl h-12" onClick={() => handleAction(o.id, 'WAITING_FOR_DRIVER')}>Pronto p/ Retirada</Button>
               {!o.driver && <div className="text-[10px] font-bold text-gray-400 text-center uppercase animate-pulse">Buscando Entregador...</div>}
               <Button variant="ghost" className="w-full text-red-400 text-[10px] font-bold uppercase" onClick={() => handleCancelOrder(o.id)}>Cancelar Pedido</Button>
            </div>
          ))}
          
          {renderSection("Aguardando Coleta", "text-indigo-600", o => o.status === "WAITING_FOR_DRIVER", o => (
            o.driver ? (
              <div className="space-y-2">
                <Dialog>
                    <DialogTrigger asChild><Button className="w-full bg-indigo-600 text-white font-bold rounded-xl h-12">Confirmar Retirada</Button></DialogTrigger>
                    <DialogContent className="rounded-3xl sm:max-w-md p-8">
                    <DialogHeader className="text-center"><DialogTitle className="text-2xl font-black">Validar Entregador</DialogTitle></DialogHeader>
                    <p className="text-center text-sm text-gray-500 mb-4">Insira os 4 últimos dígitos do telefone do entregador para liberar o pedido.</p>
                    <div className="py-6 flex justify-center"><OtpInput length={4} value={verificationCode} onChange={setVerificationCode} /></div>
                    <Button className="w-full h-16 rounded-2xl bg-indigo-600 text-white font-black text-lg" onClick={() => handleConfirmPickup(o)} disabled={verificationCode.length < 4 || isVerifying}>Liberar Pedido</Button>
                    </DialogContent>
                </Dialog>
                <Button variant="ghost" className="w-full text-red-400 text-[10px] font-bold uppercase" onClick={() => handleCancelOrder(o.id)}>Cancelar Pedido</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-100">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-300 mb-1" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Buscando Entregador...</span>
                </div>
                <Button variant="ghost" className="w-full text-red-400 text-[10px] font-bold uppercase" onClick={() => handleCancelOrder(o.id)}>Cancelar Pedido</Button>
              </div>
            )
          ))}

          {renderSection("Em Rota", "text-yellow-600", o => o.status === "OUT_FOR_DELIVERY", o => (
            <div className="space-y-2">
               <Badge className="w-full py-3 justify-center border-none rounded-xl text-xs font-bold uppercase bg-yellow-50 text-yellow-700">
                 Saiu para Entrega
               </Badge>
               <Button 
                  variant="outline" 
                  className="w-full border-indigo-200 text-indigo-600 rounded-xl h-12 font-bold gap-2 hover:bg-indigo-50"
                  onClick={() => handleOpenRecallDialog(o)}
               >
                  <RotateCcw className="h-4 w-4" /> Nova Entrega
               </Button>
               <Button variant="ghost" className="w-full text-red-400 text-[10px] font-bold uppercase" onClick={() => handleCancelOrder(o.id)}>Cancelar (Emergência)</Button>
            </div>
          ))}

          {renderSection("Finalizados", "text-green-600", o => ['DELIVERED', 'CANCELLED'].includes(o.status), o => (
             <div className="space-y-2">
               <Badge className={cn("w-full py-3 justify-center border-none rounded-xl text-xs font-bold uppercase", o.status === 'DELIVERED' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                 {o.status === 'DELIVERED' ? 'Entregue ✓' : 'Cancelado'}
               </Badge>
               <Button 
                  variant="outline" 
                  className="w-full border-indigo-200 text-indigo-600 rounded-xl h-12 font-bold gap-2 hover:bg-indigo-50"
                  onClick={() => handleOpenRecallDialog(o)}
               >
                  <Send className="h-4 w-4" /> Nova Entrega
               </Button>
             </div>
          ))}
        </div>
      )}
      
      {/* Modal de Nova Entrega */}
      <Dialog open={isRecallDialogOpen} onOpenChange={(open) => { setIsRecallDialogOpen(open); if (!open) { setOrderToRecall(null); setManualDescription(""); } }}>
        <DialogContent className="rounded-3xl sm:max-w-lg p-8">
          <DialogHeader className="text-center">
            <div className="bg-brand-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="h-8 w-8 text-brand-accent" />
            </div>
            <DialogTitle className="text-2xl font-black text-indigo-900">Solicitar Nova Entrega</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              O pedido <span className="font-bold">#{orderToRecall?.id.slice(0, 6)}</span> será reaberto para busca de um novo entregador.
            </p>
            
            <div className="bg-yellow-50 p-4 rounded-2xl flex items-start gap-3 border border-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800">
                    <span className="font-bold">Atenção:</span> O entregador não terá acesso ao carrinho original.
                </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-desc" className="font-bold text-gray-700">Descrição Manual do Pedido *</Label>
              <Textarea
                id="manual-desc"
                placeholder="Ex: 1x Hambúrguer, 1x Batata, 1x Coca-Cola. Total: R$ 55,00. Entregar no endereço do cliente."
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="min-h-[120px] rounded-xl border-gray-200"
                required
              />
              <p className="text-xs text-gray-400">Esta descrição será enviada ao entregador.</p>
            </div>
          </div>
          
          <DialogFooter className="pt-4 flex-col sm:flex-row">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl h-12" 
              onClick={() => setIsRecallDialogOpen(false)}
              disabled={isRecalling}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black h-12"
              onClick={handleFinalizeReCall}
              disabled={isRecalling || !manualDescription.trim()}
            >
              {isRecalling ? <Loader2 className="animate-spin h-5 w-5" /> : "Chamar Novo Entregador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantOrdersPage;