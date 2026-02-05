"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Bike, 
  MapPin, 
  User, 
  X, 
  Search, 
  Printer,
  Eye,
  MessageCircle,
  Trash2,
  Clock,
  CreditCard,
  Truck,
  CheckCircle2,
  Store,
  ShieldCheck,
  ChevronDown,
  Settings2,
  AlertCircle
} from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AcceptanceTimer from "@/components/merchant/AcceptanceTimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { OtpInput } from "@/components/shared/OtpInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import OrderReceipt from "@/components/merchant/OrderReceipt";
import { Input } from "@/components/ui/input";
import { printReceipt } from "@/utils/print";
import { useNavigate } from "react-router-dom";
import { subHours } from "date-fns";
import OrderCardDetails from "@/components/merchant/OrderCardDetails";

interface PrintSettings {
  paperWidth: "80mm" | "58mm";
  fontSize: "small" | "medium" | "large";
  includeLogo: boolean;
  margin: number;
}

const defaultPrintSettings: PrintSettings = {
  paperWidth: "80mm",
  fontSize: "medium",
  includeLogo: false,
  margin: 5,
};

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";

const MerchantOrdersPage = () => {
  const navigate = useNavigate();
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [verificationCode, setVerificationCode] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showFullDetails, setShowFullDetails] = useState(() => localStorage.getItem('merchant_show_details') === 'true');
  const [autoAccept, setAutoAccept] = useState(() => localStorage.getItem('merchant_auto_accept') === 'true');
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('merchant_auto_print') === 'true');
  
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const [merchantName, setMerchantName] = useState("Minha Loja");
  const [merchantDeliveryMode, setMerchantDeliveryMode] = useState<'APP' | 'OWN'>('APP');
  const [authorizedEmails, setAuthorizedEmails] = useState<string[]>([]);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
  }, []);

  const playAlert = useCallback(() => {
    if (audioEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [audioEnabled]);

  const handlePrint = useCallback((order: any) => {
    if (!order) return;
    printReceipt(order, merchantName, order.customer_full_name || 'Cliente', printSettings);
  }, [merchantName, printSettings]);

  const handleAcceptOrder = useCallback(async (order: any, isSilent = false) => {
    const tid = isSilent ? null : showLoading("Aceitando pedido...");
    try {
      const mode = merchantDeliveryMode;
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'PREPARING',
          merchant_acceptance_deadline: null,
          logistics_mode: mode
        })
        .eq('id', order.id);
      
      if (updateError) throw updateError;
      
      if (order.delivery_type === 'delivery' && mode === 'APP') {
        supabase.functions.invoke('dispatch-order', { body: { orderId: order.id } }).catch(console.error);
      }
      
      if (autoPrint) handlePrint(order);
      if (!isSilent) { dismissToast(tid); showSuccess("Pedido aceito!"); }
    } catch (err) { 
      if (!isSilent) { dismissToast(tid); showError("Erro ao aceitar."); } 
    }
  }, [handlePrint, merchantDeliveryMode, autoPrint]);

  const handleReadyForShipping = async (order: any) => {
    const tid = showLoading("Atualizando status...");
    try {
        const newStatus = order.delivery_type === 'pickup' ? 'READY_FOR_PICKUP' : 'WAITING_FOR_DRIVER';
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', order.id);
        
        if (error) throw error;
        
        // Se for entrega via rede do app, tenta despachar imediatamente
        if (newStatus === 'WAITING_FOR_DRIVER' && order.logistics_mode === 'APP') {
            supabase.functions.invoke('dispatch-order', { body: { orderId: order.id } }).catch(console.error);
        }

        showSuccess("Pedido pronto!");
        fetchOrders(true);
    } catch (err: any) {
        showError("Erro ao atualizar.");
    } finally {
        dismissToast(tid);
    }
  };

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isInitialMount.current) {
        const { data: mData } = await supabase.from('merchant_applications').select('is_open, store_name, metadata').eq('id', user.id).single();
        if (mData) {
          setIsStoreOpen(mData.is_open);
          setMerchantName(mData.store_name || "Minha Loja");
          setMerchantDeliveryMode(mData.metadata?.delivery_area?.delivery_mode || 'APP');
          setAuthorizedEmails(mData.metadata?.delivery_area?.authorized_drivers || []);
          if (mData.metadata?.print_settings) setPrintSettings(mData.metadata.print_settings);
        }
        isInitialMount.current = false;
      }

      const dayAgo = subHours(new Date(), 24).toISOString();
      const { data: raw, error } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user.id)
        .gte('created_at', dayAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar nomes de clientes e entregadores
      const cIds = Array.from(new Set((raw || []).map(o => o.customer_id).filter(Boolean)));
      const dIds = Array.from(new Set((raw || []).map(o => o.driver_id).filter(Boolean)));
      
      const { data: cProfiles } = cIds.length > 0 ? await supabase.from('profiles').select('id, first_name, last_name').in('id', cIds) : { data: [] };
      const { data: dProfiles } = dIds.length > 0 ? await supabase.from('driver_applications').select('id, full_name').in('id', dIds) : { data: [] };

      const enriched = (raw || []).map(o => {
        const p = cProfiles?.find(p => p.id === o.customer_id);
        const d = dProfiles?.find(d => d.id === o.driver_id);
        
        const customerName = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Cliente';
        const driverName = d?.full_name || null;
        
        if (o.status === 'PENDING' && autoAccept) {
            handleAcceptOrder(o, true);
        }

        // Se o pedido estiver esperando entregador e for da rede do app, e não houver oferta ativa, tenta buscar
        if (o.status === 'WAITING_FOR_DRIVER' && o.logistics_mode === 'APP' && !o.current_driver_offered_id) {
            // Chamada de background
            supabase.functions.invoke('dispatch-order', { body: { orderId: o.id } }).catch(() => {});
        }

        return {
          ...o,
          customer_full_name: customerName,
          driver_full_name: driverName,
          delivery_address: o.delivery_address || {}
        };
      });

      setOrders(enriched);
    } catch (err: any) { 
        showError("Falha na sincronização.");
    } finally { 
        if (!isSilent) setLoading(false); 
    }
  }, [autoAccept, handleAcceptOrder]);

  useEffect(() => {
    fetchOrders();
    const chan = supabase.channel(`merchant_orders_realtime`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') playAlert();
        fetchOrders(true);
    }).subscribe();

    // Busca contínua por entregadores (a cada 15s para pedidos WAITING_FOR_DRIVER sem oferta)
    const searchInterval = setInterval(() => {
        const pendingDispatch = orders.filter(o => o.status === 'WAITING_FOR_DRIVER' && o.logistics_mode === 'APP' && !o.current_driver_offered_id);
        pendingDispatch.forEach(o => {
            supabase.functions.invoke('dispatch-order', { body: { orderId: o.id } }).catch(() => {});
        });
    }, 15000);

    return () => { 
        supabase.removeChannel(chan); 
        clearInterval(searchInterval);
    };
  }, [fetchOrders, playAlert, orders]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(o => {
      const addr = o.delivery_address || {};
      const shortId = o.id.slice(0, 6).toLowerCase();
      return o.id.toLowerCase().includes(term) || 
             shortId.includes(term) ||
             o.customer_full_name.toLowerCase().includes(term) ||
             (addr.street || "").toLowerCase().includes(term) ||
             (addr.number || "").toLowerCase().includes(term);
    });
  }, [orders, searchTerm]);

  const toggleConfig = (key: string, value: boolean) => {
    localStorage.setItem(key, value.toString());
    if (key === 'merchant_show_details') setShowFullDetails(value);
    if (key === 'merchant_auto_accept') setAutoAccept(value);
    if (key === 'merchant_auto_print') setAutoPrint(value);
    showSuccess("Configuração salva!");
  };

  const renderColumn = (title: string, color: string, statusList: string[]) => {
    const data = filteredOrders.filter(o => statusList.includes(o.status));
    return (
      <div className="space-y-4 flex flex-col min-h-[600px] bg-indigo-50/30 p-3 rounded-[2.5rem]">
        <h2 className={cn("font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-3 py-2", color)}>
          <span className={cn("h-2 w-2 rounded-full", color.replace('text-', 'bg-'))} />
          {title} ({data.length})
        </h2>
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="p-10 border-2 border-dashed border-gray-200 rounded-[2rem] text-center text-gray-300 text-[10px] font-black uppercase">Vazio</div>
          ) : (
            data.map(o => (
              <Card key={o.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden hover:shadow-md transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-gray-300 bg-gray-50 px-2 py-1 rounded-lg">#{o.id.slice(0, 6)}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-400" onClick={() => { setSelectedOrderDetails(o); setIsDetailsDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-400" onClick={() => handlePrint(o)}><Printer className="h-4 w-4" /></Button>
                      </div>
                  </div>
                  <div>
                      <p className="text-sm font-bold text-gray-800 truncate">{o.customer_full_name}</p>
                      <p className="text-[10px] text-gray-400 uppercase mt-0.5 flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>

                  {/* Informação do Entregador */}
                  {o.delivery_type === 'delivery' && (
                      <div className={cn(
                          "px-3 py-2 rounded-xl border flex items-center gap-2",
                          o.driver_full_name ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-gray-50 border-gray-100 text-gray-500"
                      )}>
                        <Bike className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black uppercase truncate">
                            {o.driver_full_name ? `Entregador: ${o.driver_full_name}` : 
                             o.current_driver_offered_id ? "Aguardando Resposta..." : "Buscando Entregador..."}
                        </span>
                      </div>
                  )}

                  {showFullDetails && <OrderCardDetails order={o} />}

                  {!showFullDetails && (
                    <div className="bg-gray-50 p-3 rounded-2xl flex items-start gap-2 text-xs text-gray-500">
                        <MapPin className="h-3.5 w-3.5 text-brand-accent mt-0.5 shrink-0" />
                        <p className="line-clamp-1">{o.delivery_type === 'pickup' ? 'Retirada no Local' : `${o.delivery_address?.street}, ${o.delivery_address?.number}`}</p>
                    </div>
                  )}

                  {o.status === 'PENDING' && (
                    <div className="space-y-3">
                        {o.merchant_acceptance_deadline && <AcceptanceTimer deadline={o.merchant_acceptance_deadline} onExpire={() => fetchOrders(true)} />}
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-black text-xs uppercase" onClick={() => handleAcceptOrder(o)}>Aceitar Pedido</Button>
                    </div>
                  )}

                  {o.status === 'PREPARING' && (
                    <Button 
                        className="w-full bg-orange-500 hover:bg-orange-600 h-12 rounded-xl font-black text-xs uppercase" 
                        onClick={() => handleReadyForShipping(o)}
                    >
                        Pronto para Envio
                    </Button>
                  )}

                  {['READY_FOR_PICKUP', 'WAITING_FOR_DRIVER'].includes(o.status) && (
                    <Dialog>
                       <DialogTrigger asChild><Button className="w-full bg-green-600 h-12 rounded-xl font-black text-xs uppercase">Validar Código</Button></DialogTrigger>
                       <DialogContent className="rounded-[2.5rem] p-8 space-y-6 text-center border-none shadow-2xl">
                           <DialogHeader>
                               <DialogTitle className="text-2xl font-black text-indigo-900">Validar Entrega</DialogTitle>
                               <DialogDescription>Insira os 4 dígitos informados pelo {o.status === 'READY_FOR_PICKUP' ? 'cliente' : 'entregador'}.</DialogDescription>
                           </DialogHeader>
                           <div className="flex justify-center"><OtpInput length={4} value={verificationCode} onChange={setVerificationCode} /></div>
                           <Button className="w-full h-16 rounded-2xl bg-indigo-600 font-black" onClick={async () => {
                               if (verificationCode === o.confirmation_code) {
                                   const newStatus = o.status === 'READY_FOR_PICKUP' ? 'DELIVERED' : 'OUT_FOR_DELIVERY';
                                   await supabase.from('orders').update({ status: newStatus }).eq('id', o.id);
                                   setVerificationCode("");
                                   showSuccess("Validado!");
                                   fetchOrders(true);
                               } else {
                                   showError("Código incorreto.");
                               }
                           }}>Confirmar e Finalizar</Button>
                       </DialogContent>
                    </Dialog>
                  )}

                  {o.status === 'OUT_FOR_DELIVERY' && (
                    <div className="space-y-2">
                        <Badge className="w-full py-2.5 justify-center bg-yellow-50 text-yellow-700 border-none rounded-xl font-bold uppercase text-[10px]">A caminho do cliente</Badge>
                        <Button variant="outline" className="w-full rounded-xl border-indigo-100 text-indigo-600 text-xs font-bold" onClick={() => navigate(`/chat/${o.driver_id}?orderId=${o.id}`)}><Bike className="h-3.5 w-3.5 mr-2" /> Chat Entregador</Button>
                    </div>
                  )}

                  {o.status === 'DELIVERED' && (
                    <Button variant="outline" className="w-full h-11 rounded-xl border-green-100 text-green-700 text-xs font-black uppercase" onClick={() => navigate(`/chat/${o.customer_id}?orderId=${o.id}`)}>
                        <MessageCircle className="h-4 w-4 mr-2" /> Falar com Cliente
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm">
        <div className="space-y-1">
            <h1 className="text-3xl font-black text-indigo-900 tracking-tight">{merchantName}</h1>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-black text-[10px] gap-2 border-none", isStoreOpen ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                    <div className={cn("h-2 w-2 rounded-full", isStoreOpen ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                    LOJA {isStoreOpen ? "ABERTA" : "FECHADA"}
                </Badge>
                <Switch checked={isStoreOpen} onCheckedChange={async (v) => { 
                    const { data } = await supabase.auth.getUser(); 
                    await supabase.from('merchant_applications').update({ is_open: v }).eq('id', data.user?.id); 
                    setIsStoreOpen(v); 
                    showSuccess(v ? "Loja aberta!" : "Loja fechada.");
                }} />
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-2 rounded-3xl border border-gray-100">
            <div className="flex items-center gap-3 px-4 py-2 border-r border-gray-200">
                <span className="text-[10px] font-black text-gray-400 uppercase">Auto Aceite</span>
                <Switch checked={autoAccept} onCheckedChange={(v) => toggleConfig('merchant_auto_accept', v)} className="scale-75" />
            </div>
            <div className="flex items-center gap-3 px-4 py-2 border-r border-gray-200">
                <span className="text-[10px] font-black text-gray-400 uppercase">Auto Impressão</span>
                <Switch checked={autoPrint} onCheckedChange={(v) => toggleConfig('merchant_auto_print', v)} className="scale-75" />
            </div>
            <div className="flex items-center gap-3 px-4 py-2">
                <span className="text-[10px] font-black text-gray-400 uppercase">Ver Detalhes</span>
                <Switch checked={showFullDetails} onCheckedChange={(v) => toggleConfig('merchant_show_details', v)} className="scale-75" />
            </div>
        </div>
      </div>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
        <Input 
          placeholder="Busque por cliente, endereço ou #código do pedido..." 
          className="rounded-[2rem] pl-14 h-16 bg-white border-none shadow-sm text-lg focus:ring-4 focus:ring-indigo-100 transition-all" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {loading ? (
        <div className="py-40 text-center space-y-4">
            <Loader2 className="animate-spin h-12 w-12 mx-auto text-indigo-600" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sincronizando Pedidos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {renderColumn("Aceitar", "text-blue-600", ["PENDING"])}
          {renderColumn("Preparando", "text-orange-600", ["PREPARING"])}
          {renderColumn("Coleta/Retirada", "text-indigo-600", ["WAITING_FOR_DRIVER", "READY_FOR_PICKUP"])}
          {renderColumn("Em Rota", "text-yellow-600", ["OUT_FOR_DELIVERY"])}
          {renderColumn("Concluídos", "text-green-600", ["DELIVERED"])}
        </div>
      )}

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-xl h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-8 bg-indigo-900 text-white shrink-0 flex justify-between items-center">
              <div>
                <DialogTitle className="text-2xl font-black">Detalhes do Pedido</DialogTitle>
                <DialogDescription className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Confira os itens e endereço</DialogDescription>
              </div>
              <Button variant="ghost" size="icon" className="text-white/50 hover:text-white" onClick={() => setIsDetailsDialogOpen(false)}><X /></Button>
          </div>
          <ScrollArea className="flex-1 p-8 bg-white">
            {selectedOrderDetails && (
              <div className="space-y-8 pb-10">
                <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex justify-center shadow-inner">
                    <OrderReceipt order={selectedOrderDetails} merchantName={merchantName} customerName={selectedOrderDetails.customer_full_name} printSettings={printSettings} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-16 rounded-2xl border-indigo-100 text-indigo-600 font-black gap-3" onClick={() => navigate(`/chat/${selectedOrderDetails.customer_id}?orderId=${selectedOrderDetails.id}`)}>
                        <MessageCircle className="h-5 w-5" /> CHAT CLIENTE
                    </Button>
                    <Button variant="outline" className="h-16 rounded-2xl border-indigo-100 text-indigo-600 font-black gap-3" onClick={() => handlePrint(selectedOrderDetails)}>
                        <Printer className="h-5 w-5" /> REIMPRIMIR
                    </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantOrdersPage;