"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Volume2, VolumeX, Bike, MapPin, CheckCircle2, Key, Phone, User, RotateCcw, X, Send, AlertTriangle, Search, Check, List, Settings, Printer } from "lucide-react";
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
import OrderReceipt from "@/components/merchant/OrderReceipt";
import ReactDOMServer from 'react-dom/server';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import OrderCardDetails from "@/components/merchant/OrderCardDetails";
import { printReceipt } from "@/utils/print";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";

// Tipagem para as configurações de impressão (sincronizada com MerchantSettingsPage)
interface PrintSettings {
  paperWidth: "80mm" | "58mm";
  fontSize: "small" | "medium" | "large";
  includeLogo: boolean;
  margin: number; // em mm
}

const defaultPrintSettings: PrintSettings = {
  paperWidth: "80mm",
  fontSize: "medium",
  includeLogo: false,
  margin: 5,
};

const MerchantOrdersPage = () => {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Novos estados de UI
  const [searchTerm, setSearchTerm] = useState("");
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [autoAccept, setAutoAccept] = useState(() => localStorage.getItem('merchant_auto_accept') === 'true');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Estados de Nova Entrega
  const [isRecallDialogOpen, setIsRecallDialogOpen] = useState(false);
  const [orderToRecall, setOrderToRecall] = useState<any>(null);
  const [manualDescription, setManualDescription] = useState("");
  const [isRecalling, setIsRecalling] = useState(false);
  const [merchantName, setMerchantName] = useState("Minha Loja");
  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('merchant_auto_print') === 'true');

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

  // 1. Função de impressão (depende de estados que mudam raramente)
  const handlePrintReceipt = useCallback((order: any, customerName: string) => {
    printReceipt(order, merchantName, customerName, printSettings);
  }, [merchantName, printSettings]);

  // 2. Função de aceitar pedido (depende de autoPrint e handlePrintReceipt)
  const handleAcceptOrder = useCallback(async (order: any, isSilent = false) => {
    const tid = isSilent ? null : showLoading("Aceitando pedido...");
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'PREPARING',
          merchant_acceptance_deadline: null,
        })
        .eq('id', order.id);
      
      if (updateError) throw updateError;

      // Dispara a busca por entregador
      const { data, error: functionError } = await supabase.functions.invoke('dispatch-order', {
        body: { orderId: order.id }
      });

      if (functionError) throw functionError;

      if (!isSilent) {
        dismissToast(tid);
        showSuccess("Pedido aceito e comanda impressa!");
      }
      
      // IMPRIMIR COMANDA (se autoPrint estiver desligado, pois o autoPrint no channel cuida do INSERT)
      if (!autoPrint) {
        handlePrintReceipt(order, order.customer_full_name);
      }
      
    } catch (err: any) {
      if (!isSilent) dismissToast(tid);
      showError("Erro: " + (err.message || "Erro desconhecido"));
    }
  }, [autoPrint, handlePrintReceipt]);

  // 3. Função principal de fetch (NÃO depende de 'orders')
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Merchant Data and Settings
      const { data: merchantData } = await supabase.from('merchant_applications').select('is_open, store_name, metadata').eq('id', user.id).single();
      if (merchantData) {
        setIsStoreOpen(merchantData.is_open);
        setMerchantName(merchantData.store_name || "Minha Loja");
        setPrintSettings(merchantData.metadata?.print_settings || defaultPrintSettings);
      }

      // Fetch Orders
      const { data, error } = await supabase
        .from('orders')
        .select(`*, driver:driver_applications!driver_id (id, full_name, phone, metadata)`)
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[MerchantOrdersPage] Error fetching orders:", error);
        throw error;
      }
      
      const fetchedOrders = data || [];
      console.log(`[MerchantOrdersPage] Fetched ${fetchedOrders.length} orders.`);

      // Fetch customer names for all orders
      const ordersWithCustomerNames = await Promise.all(fetchedOrders.map(async (order) => {
        if (order.customer_id) {
          try {
            const { data: customerNameData } = await supabase.rpc('get_user_full_name', { user_id: order.customer_id });
            return { ...order, customer_full_name: customerNameData || 'Cliente' };
          } catch (rpcError) {
            console.error("[MerchantOrdersPage] RPC Error fetching customer name:", rpcError);
            return { ...order, customer_full_name: 'Cliente (Erro RPC)' };
          }
        }
        return { ...order, customer_full_name: 'Cliente' };
      }));

      // Se o aceite automático estiver ativo, aceita novos pedidos
      if (autoAccept) {
        const pendingOrders = ordersWithCustomerNames.filter(o => o.status === 'PENDING');
        for (const order of pendingOrders) {
          // Chama a função de aceite estável
          await handleAcceptOrder(order, true); 
        }
      }

      setOrders(ordersWithCustomerNames);
    } catch (err) {
      console.error("[MerchantOrdersPage] Main fetch error:", err);
      setOrders([]);
      // Propaga o erro para o bloco de setup lidar com o loading
      throw err; 
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [autoAccept, handleAcceptOrder, handlePrintReceipt]);

  // 4. Efeito principal para setup e real-time
  useEffect(() => {
    let channel: any;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // 1. Fetch inicial
        await fetchOrders();
        
        // 2. Configura o canal de real-time
        channel = supabase.channel(`orders_merchant_${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `merchant_id=eq.${user.id}` }, async (p) => {
            if (p.eventType === 'INSERT') {
              playAlert();
              
              // Se auto-print estiver ativo, imprime o novo pedido
              if (autoPrint) {
                  const newOrder = p.new;
                  // Busca o nome do cliente para a impressão
                  const { data: customerNameData } = await supabase.rpc('get_user_full_name', { user_id: newOrder.customer_id });
                  handlePrintReceipt(newOrder, customerNameData || 'Cliente');
              }
            }
            // Em qualquer evento (INSERT, UPDATE, DELETE), atualiza a lista
            fetchOrders(true);
          }).subscribe();
      } catch (error) {
        console.error("[MerchantOrdersPage] Setup failed:", error);
      } finally {
        setLoading(false); // Garante que o loading seja desativado
      }
    };
    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [fetchOrders, playAlert, autoPrint, handlePrintReceipt]);

  const handleToggleStore = async (val: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('merchant_applications').update({ is_open: val }).eq('id', user.id);
    if (!error) {
      setIsStoreOpen(val);
      showSuccess(val ? "Loja Online" : "Loja Offline");
    }
  };
  
  const handleToggleAutoAccept = (checked: boolean) => {
    setAutoAccept(checked);
    localStorage.setItem('merchant_auto_accept', checked.toString());
    showSuccess(checked ? "Aceite automático ativado!" : "Aceite automático desativado.");
  };
  
  const handleToggleAutoPrint = (checked: boolean) => {
    setAutoPrint(checked);
    localStorage.setItem('merchant_auto_print', checked.toString());
    showSuccess(checked ? "Auto impressão ativada!" : "Auto impressão desativada.");
  };

  const handleAction = async (id: string, status: string) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (!error) {
          showSuccess("Status atualizado!");
          // Não precisa chamar fetchOrders, o canal fará isso.
      }
  };
  
  const handleCancelOrder = async (id: string) => {
    if (!window.confirm("ATENÇÃO: Tem certeza que deseja cancelar este pedido? O cliente e o entregador serão notificados.")) return;
    
    const tid = showLoading("Cancelando pedido...");
    try {
        const { error } = await supabase.from('orders').update({ 
          status: 'CANCELLED',
          current_driver_offered_id: null,
          offer_expires_at: null
        }).eq('id', id);

        if (error) throw error;
        showSuccess("Pedido cancelado com sucesso.");
        // Não precisa chamar fetchOrders, o canal fará isso.
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
      // Não precisa chamar fetchOrders, o canal fará isso.
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
      // Não precisa chamar fetchOrders, o canal fará isso.
    }
    setIsVerifying(false);
  };
  
  const handleCardClick = (order: any) => {
    setSelectedOrderDetails(order);
    setIsDetailsDialogOpen(true);
  };

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    return orders.filter(order => {
      const matchesId = order.id.slice(0, 6).toLowerCase().includes(lowerCaseSearch);
      const matchesCustomer = order.customer_full_name?.toLowerCase().includes(lowerCaseSearch);
      const matchesAddress = order.delivery_address?.street?.toLowerCase().includes(lowerCaseSearch) ||
                             order.delivery_address?.neighborhood?.toLowerCase().includes(lowerCaseSearch);
      const matchesItems = order.items.some((item: any) => item.name.toLowerCase().includes(lowerCaseSearch));
      
      return matchesId || matchesCustomer || matchesAddress || matchesItems;
    });
  }, [orders, searchTerm]);

  const renderSection = (title: string, color: string, filter: (o: any) => boolean, action: (o: any) => React.ReactNode) => {
    const filtered = filteredOrders.filter(filter);
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
            <Card 
              key={o.id} 
              className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden animate-in fade-in cursor-pointer hover:shadow-md transition-all"
              onClick={() => handleCardClick(o)}
            >
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
                        className="h-6 w-6 text-gray-300 hover:text-red-500 rounded-full shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleCancelOrder(o.id); }}
                        title="Cancelar Pedido"
                     >
                        <X className="h-4 w-4" />
                     </Button>
                   )}
                </div>
                
                {/* Exibição de Detalhes ou Resumo */}
                {showItemDetails ? (
                    <OrderCardDetails order={o} />
                ) : (
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
                            <User className="h-3 w-3 text-indigo-400" /> {o.customer_full_name}
                        </p>
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-brand-accent" /> {o.delivery_address?.street}, {o.delivery_address?.number}
                        </p>
                        <p className="text-xs text-gray-500 pt-1">
                            {o.items.length} item(s) • R$ {o.total.toFixed(2)}
                        </p>
                    </div>
                )}

                {o.driver && (
                  <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase">Entregador</p>
                    <p className="text-xs font-bold text-indigo-900">{o.driver.full_name}</p>
                  </div>
                )}
                <div className="pt-2" onClick={(e) => e.stopPropagation()}>{action(o)}</div>
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
      
      {/* Barra de Ferramentas e Filtro */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar pedido (ID, cliente, item, rua...)"
            className="rounded-2xl pl-12 h-12 bg-white border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-100 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
        </div>
        
        <div className="flex gap-3 shrink-0">
          <Button 
            variant={showItemDetails ? "default" : "outline"} 
            className={cn("rounded-2xl h-12 px-4 gap-2", showItemDetails ? "bg-indigo-600 text-white" : "border-gray-200 text-gray-600")}
            onClick={() => setShowItemDetails(!showItemDetails)}
            title="Mostrar detalhes dos itens"
          >
            <List className="h-5 w-5" />
            <span className="hidden sm:inline">Detalhes</span>
          </Button>
          
          <Button 
            variant={autoAccept ? "default" : "outline"} 
            className={cn("rounded-2xl h-12 px-4 gap-2", autoAccept ? "bg-green-600 text-white" : "border-gray-200 text-gray-600")}
            onClick={() => handleToggleAutoAccept(!autoAccept)}
            title="Aceitar pedidos automaticamente"
          >
            <Check className="h-5 w-5" />
            <span className="hidden sm:inline">Auto Aceite</span>
          </Button>
          
          <Button 
            variant={autoPrint ? "default" : "outline"} 
            className={cn("rounded-2xl h-12 px-4 gap-2", autoPrint ? "bg-brand-accent text-white" : "border-gray-200 text-gray-600")}
            onClick={() => handleToggleAutoPrint(!autoPrint)}
            title="Imprimir automaticamente ao receber"
          >
            <Printer className="h-5 w-5" />
            <span className="hidden sm:inline">Auto Impressão</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600 h-10 w-10" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          {renderSection("Novos", "text-blue-600", o => o.status === "PENDING", o => (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-red-500 rounded-xl" onClick={(e) => { e.stopPropagation(); handleCancelOrder(o.id); }}>Recusar</Button>
              <Button className="flex-1 bg-blue-600 text-white font-bold rounded-xl h-12" onClick={(e) => { e.stopPropagation(); handleAcceptOrder(o); }}>Aceitar</Button>
            </div>
          ))}
          
          {renderSection("Em Preparo", "text-orange-500", o => o.status === "PREPARING", o => (
            <div className="space-y-2">
               <Button className="w-full bg-orange-500 text-white font-bold rounded-xl h-12" onClick={(e) => { e.stopPropagation(); handleAction(o.id, 'WAITING_FOR_DRIVER'); }}>Pronto p/ Retirada</Button>
               {!o.driver && <div className="text-[10px] font-bold text-gray-400 text-center uppercase animate-pulse">Buscando Entregador...</div>}
               <Button variant="ghost" className="w-full text-red-400 text-[10px] font-bold uppercase" onClick={(e) => { e.stopPropagation(); handleCancelOrder(o.id); }}>Cancelar Pedido</Button>
            </div>
          ))}
          
          {renderSection("Aguardando Coleta", "text-indigo-600", o => o.status === "WAITING_FOR_DRIVER", o => (
            o.driver ? (
              <div className="space-y-2">
                <Dialog>
                    <DialogTrigger asChild><Button className="w-full bg-indigo-600 text-white font-bold rounded-xl h-12" onClick={(e) => e.stopPropagation()}>Confirmar Retirada</Button></DialogTrigger>
                    <DialogContent className="rounded-3xl sm:max-w-md p-8">
                    <DialogHeader className="text-center"><DialogTitle className="text-2xl font-black">Validar Entregador</DialogTitle></DialogHeader>
                    <p className="text-center text-sm text-gray-500 mb-4">Insira os 4 últimos dígitos do telefone do entregador para liberar o pedido.</p>
                    <div className="py-6 flex justify-center"><OtpInput length={4} value={verificationCode} onChange={setVerificationCode} /></div>
                    <Button className="w-full h-16 rounded-2xl bg-indigo-600 text-white font-black text-lg" onClick={() => handleConfirmPickup(o)} disabled={verificationCode.length < 4 || isVerifying}>Liberar Pedido</Button>
                    </DialogContent>
                </Dialog>
                <Button variant="ghost" className="w-full text-red-400 text-[10px] font-bold uppercase" onClick={(e) => { e.stopPropagation(); handleCancelOrder(o.id); }}>Cancelar Pedido</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-100">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-300 mb-1" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Buscando Entregador...</span>
                </div>
                <Button variant="ghost" className="w-full text-red-400 text-[10px] font-bold uppercase" onClick={(e) => { e.stopPropagation(); handleCancelOrder(o.id); }}>Cancelar Pedido</Button>
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
                  onClick={(e) => { e.stopPropagation(); handleOpenRecallDialog(o); }}
               >
                  <RotateCcw className="h-4 w-4" /> Nova Entrega
               </Button>
               <Button variant="ghost" className="w-full text-red-400 text-[10px] font-bold uppercase" onClick={(e) => { e.stopPropagation(); handleCancelOrder(o.id); }}>Cancelar (Emergência)</Button>
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
                  onClick={(e) => { e.stopPropagation(); handleOpenRecallDialog(o); }}
               >
                  <Send className="h-4 w-4" /> Nova Entrega
               </Button>
             </div>
          ))}
        </div>
      )}
      
      {/* Modal de Detalhes do Pedido (Comanda) */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md p-0 overflow-hidden border-none shadow-2xl h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-4 bg-indigo-900 text-white shrink-0">
            <DialogTitle className="text-2xl font-bold">Detalhes do Pedido</DialogTitle>
            <p className="text-indigo-200 text-sm">#{selectedOrderDetails?.id.slice(0, 6)}</p>
          </DialogHeader>
          <ScrollArea className="flex-1 w-full bg-white">
            <div className="p-6">
              {selectedOrderDetails && (
                <OrderReceipt 
                  order={selectedOrderDetails} 
                  merchantName={merchantName} 
                  customerName={selectedOrderDetails.customer_full_name} 
                  printSettings={printSettings}
                />
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 border-t border-gray-100 shrink-0">
            <Button 
              className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black h-12"
              onClick={() => handlePrintReceipt(selectedOrderDetails, selectedOrderDetails.customer_full_name)}
            >
              Imprimir Comanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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