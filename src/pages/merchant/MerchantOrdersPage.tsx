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
  Clock,
  CheckCircle2,
  ChevronDown,
  AlertCircle
} from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AcceptanceTimer from "@/components/merchant/AcceptanceTimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [searchTerm, setSearchTerm] = useState("");
  
  // Configurações persistentes
  const [showFullDetails, setShowFullDetails] = useState(() => localStorage.getItem('merchant_show_details') === 'true');
  const [autoAccept, setAutoAccept] = useState(() => localStorage.getItem('merchant_auto_accept') === 'true');
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('merchant_auto_print') === 'true');
  
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // Dados da Loja
  const [merchantConfig, setMerchantConfig] = useState({
    name: "Minha Loja",
    deliveryMode: 'APP' as 'APP' | 'OWN',
    printSettings: defaultPrintSettings
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    // Carrega configurações da loja apenas UMA VEZ ao montar
    const loadConfig = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('merchant_applications').select('is_open, store_name, metadata').eq('id', user.id).single();
        if (data) {
            setIsStoreOpen(data.is_open);
            setMerchantConfig({
                name: data.store_name || "Minha Loja",
                deliveryMode: data.metadata?.delivery_area?.delivery_mode || 'APP',
                printSettings: data.metadata?.print_settings || defaultPrintSettings
            });
        }
    };
    loadConfig();
  }, []);

  const handlePrint = useCallback((order: any) => {
    printReceipt(order, merchantConfig.name, order.customer_full_name || 'Cliente', merchantConfig.printSettings);
  }, [merchantConfig]);

  const handleAcceptOrder = useCallback(async (order: any, isSilent = false) => {
    const tid = isSilent ? null : showLoading("Aceitando pedido...");
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'PREPARING',
          merchant_acceptance_deadline: null,
          logistics_mode: merchantConfig.deliveryMode
        })
        .eq('id', order.id);
      
      if (error) throw error;
      
      if (order.delivery_type === 'delivery' && merchantConfig.deliveryMode === 'APP') {
        supabase.functions.invoke('dispatch-order', { body: { orderId: order.id } }).catch(() => {});
      }
      
      if (autoPrint) handlePrint(order);
      if (!isSilent) { dismissToast(tid); showSuccess("Pedido aceito!"); }
    } catch (err) { 
      if (!isSilent) { dismissToast(tid); showError("Erro ao aceitar pedido."); } 
    }
  }, [merchantConfig, autoPrint, handlePrint]);

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dayAgo = subHours(new Date(), 24).toISOString();
      const { data: raw, error } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user.id)
        .gte('created_at', dayAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const cIds = Array.from(new Set((raw || []).map(o => o.customer_id).filter(Boolean)));
      const dIds = Array.from(new Set((raw || []).map(o => o.driver_id).filter(Boolean)));
      
      const { data: cProfiles } = cIds.length > 0 ? await supabase.from('profiles').select('id, first_name, last_name').in('id', cIds) : { data: [] };
      const { data: dProfiles } = dIds.length > 0 ? await supabase.from('driver_applications').select('id, full_name').in('id', dIds) : { data: [] };

      const enriched = (raw || []).map(o => {
        const p = cProfiles?.find(p => p.id === o.customer_id);
        const d = dProfiles?.find(d => d.id === o.driver_id);
        const customerName = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Cliente';
        const driverName = d?.full_name || null;

        return {
          ...o,
          customer_full_name: customerName,
          driver_full_name: driverName,
          delivery_address: o.delivery_address || {}
        };
      });

      setOrders(enriched);
    } catch (err) { 
        console.error("Fetch error", err);
    } finally { 
        setLoading(false); 
    }
  }, []);

  // Efeito principal de sincronização
  useEffect(() => {
    fetchOrders();

    const channel = supabase.channel('merchant_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            if (audioRef.current) audioRef.current.play().catch(() => {});
        }
        fetchOrders(true);
      })
      .subscribe();

    const autoDispatchInterval = setInterval(() => {
        // Tenta despachar pedidos que estão esperando entregador e são da rede do app
        const pending = orders.filter(o => o.status === 'WAITING_FOR_DRIVER' && o.logistics_mode === 'APP' && !o.current_driver_offered_id);
        pending.forEach(o => supabase.functions.invoke('dispatch-order', { body: { orderId: o.id } }).catch(() => {}));
    }, 15000);

    return () => {
        supabase.removeChannel(channel);
        clearInterval(autoDispatchInterval);
    };
  }, [fetchOrders]); // Agora fetchOrders é estável pois loadConfig é separado

  const handleReadyForShipping = async (order: any) => {
    const tid = showLoading("Atualizando...");
    try {
        const newStatus = order.delivery_type === 'pickup' ? 'READY_FOR_PICKUP' : 'WAITING_FOR_DRIVER';
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
        if (error) throw error;
        showSuccess("Pedido pronto!");
        fetchOrders(true);
    } catch (err) { showError("Erro ao atualizar status."); }
    finally { dismissToast(tid); }
  };

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(o => 
        o.id.toLowerCase().includes(term) || 
        o.customer_full_name.toLowerCase().includes(term) ||
        (o.delivery_address?.street || "").toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  const renderColumn = (title: string, color: string, statusList: string[]) => {
    const data = filteredOrders.filter(o => statusList.includes(o.status));
    return (
      <div className="space-y-4 flex flex-col min-h-[500px] bg-indigo-50/20 p-3 rounded-[2rem]">
        <h2 className={cn("font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-3 py-2", color)}>
          <span className={cn("h-2 w-2 rounded-full", color.replace('text-', 'bg-'))} />
          {title} ({data.length})
        </h2>
        <div className="space-y-3">
          {data.map(o => (
            <Card key={o.id} className="rounded-2xl border-none shadow-sm bg-white overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-gray-300">#{o.id.slice(0, 6)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-400" onClick={() => { setSelectedOrderDetails(o); setIsDetailsDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-400" onClick={() => handlePrint(o)}><Printer className="h-4 w-4" /></Button>
                    </div>
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-800 truncate">{o.customer_full_name}</p>
                    <p className="text-[10px] text-gray-400 uppercase mt-0.5">{new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </div>

                {o.delivery_type === 'delivery' && (
                    <div className={cn(
                        "px-2 py-1.5 rounded-lg border flex items-center gap-2",
                        o.driver_full_name ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-gray-50 border-gray-100 text-gray-400"
                    )}>
                      <Bike className="h-3 w-3" />
                      <span className="text-[9px] font-black uppercase truncate">
                          {o.driver_full_name ? `Entregador: ${o.driver_full_name}` : 
                           o.current_driver_offered_id ? "Aguardando Resposta..." : "Buscando Entregador..."}
                      </span>
                    </div>
                )}

                {showFullDetails ? <OrderCardDetails order={o} /> : (
                   <div className="bg-gray-50 p-2 rounded-xl flex items-start gap-2 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 text-brand-accent mt-0.5 shrink-0" />
                      <p className="line-clamp-1 truncate">{o.delivery_type === 'pickup' ? 'Retirada no Local' : `${o.delivery_address?.street}, ${o.delivery_address?.number}`}</p>
                   </div>
                )}

                {o.status === 'PENDING' && (
                  <div className="space-y-2">
                      {o.merchant_acceptance_deadline && <AcceptanceTimer deadline={o.merchant_acceptance_deadline} onExpire={() => fetchOrders(true)} />}
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 h-10 rounded-xl font-black text-xs uppercase" onClick={() => handleAcceptOrder(o)}>Aceitar</Button>
                  </div>
                )}

                {o.status === 'PREPARING' && (
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 h-10 rounded-xl font-black text-xs uppercase" onClick={() => handleReadyForShipping(o)}>Pronto para Envio</Button>
                )}

                {['READY_FOR_PICKUP', 'WAITING_FOR_DRIVER'].includes(o.status) && (
                  <Dialog>
                     <DialogTrigger asChild><Button className="w-full bg-green-600 h-10 rounded-xl font-black text-xs uppercase">Validar Código</Button></DialogTrigger>
                     <DialogContent className="rounded-[2rem] p-8 text-center">
                         <DialogHeader>
                             <DialogTitle>Validar Entrega</DialogTitle>
                             <DialogDescription>Insira o código informado pelo {o.status === 'READY_FOR_PICKUP' ? 'cliente' : 'entregador'}.</DialogDescription>
                         </DialogHeader>
                         <div className="flex justify-center my-4"><OtpInput length={4} value={verificationCode} onChange={setVerificationCode} /></div>
                         <Button className="w-full h-14 rounded-xl bg-indigo-600 font-bold" onClick={async () => {
                             if (verificationCode === o.confirmation_code) {
                                 await supabase.from('orders').update({ status: o.status === 'READY_FOR_PICKUP' ? 'DELIVERED' : 'OUT_FOR_DELIVERY' }).eq('id', o.id);
                                 setVerificationCode("");
                                 showSuccess("Validado!");
                                 fetchOrders(true);
                             } else { showError("Incorreto."); }
                         }}>Confirmar</Button>
                     </DialogContent>
                  </Dialog>
                )}

                {o.status === 'OUT_FOR_DELIVERY' && (
                   <div className="space-y-2">
                       <Badge className="w-full py-2 justify-center bg-yellow-50 text-yellow-700 border-none rounded-lg font-bold uppercase text-[9px]">Em Entrega</Badge>
                       <Button variant="outline" className="w-full rounded-lg border-indigo-100 text-indigo-600 text-xs h-9" onClick={() => navigate(`/chat/${o.driver_id}?orderId=${o.id}`)}><Bike className="h-3 w-3 mr-2" /> Chat</Button>
                   </div>
                )}

                {o.status === 'DELIVERED' && (
                  <Button variant="outline" className="w-full h-9 rounded-lg border-green-100 text-green-700 text-xs font-black uppercase" onClick={() => navigate(`/chat/${o.customer_id}?orderId=${o.id}`)}>Falar com Cliente</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm">
        <div className="space-y-1">
            <h1 className="text-2xl font-black text-indigo-900">{merchantConfig.name}</h1>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-black text-[9px] gap-2 border-none", isStoreOpen ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                    <div className={cn("h-1.5 w-1.5 rounded-full", isStoreOpen ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                    LOJA {isStoreOpen ? "ABERTA" : "FECHADA"}
                </Badge>
                <Switch checked={isStoreOpen} onCheckedChange={async (v) => { 
                    const { data } = await supabase.auth.getUser(); 
                    await supabase.from('merchant_applications').update({ is_open: v }).eq('id', data.user?.id); 
                    setIsStoreOpen(v); 
                    showSuccess(v ? "Aberta!" : "Fechada.");
                }} />
            </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl">
            <div className="flex items-center gap-2 px-3 border-r border-gray-200">
                <span className="text-[9px] font-black text-gray-400 uppercase">Auto Aceite</span>
                <Switch checked={autoAccept} onCheckedChange={(v) => { setAutoAccept(v); localStorage.setItem('merchant_auto_accept', v.toString()); }} className="scale-75" />
            </div>
            <div className="flex items-center gap-2 px-3">
                <span className="text-[9px] font-black text-gray-400 uppercase">Detalhes</span>
                <Switch checked={showFullDetails} onCheckedChange={(v) => { setShowFullDetails(v); localStorage.setItem('merchant_show_details', v.toString()); }} className="scale-75" />
            </div>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
        <Input 
          placeholder="Busque por cliente ou endereço..." 
          className="rounded-2xl pl-11 h-12 bg-white border-none shadow-sm" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {loading ? (
        <div className="py-40 text-center space-y-4">
            <Loader2 className="animate-spin h-10 w-10 mx-auto text-indigo-600" />
            <p className="text-gray-400 font-bold uppercase text-[10px]">Sincronizando...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {renderColumn("Aceitar", "text-blue-600", ["PENDING"])}
          {renderColumn("Preparando", "text-orange-600", ["PREPARING"])}
          {renderColumn("Coleta", "text-indigo-600", ["WAITING_FOR_DRIVER", "READY_FOR_PICKUP"])}
          {renderColumn("Em Rota", "text-yellow-600", ["OUT_FOR_DELIVERY"])}
          {renderColumn("Concluídos", "text-green-600", ["DELIVERED"])}
        </div>
      )}

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-xl h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-6 bg-indigo-900 text-white shrink-0 flex justify-between items-center">
              <DialogTitle className="text-xl font-black">Detalhes do Pedido</DialogTitle>
              <Button variant="ghost" size="icon" className="text-white/50 hover:text-white" onClick={() => setIsDetailsDialogOpen(false)}><X /></Button>
          </div>
          <ScrollArea className="flex-1 p-6 bg-white">
            {selectedOrderDetails && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200 flex justify-center">
                    <OrderReceipt order={selectedOrderDetails} merchantName={merchantConfig.name} customerName={selectedOrderDetails.customer_full_name} printSettings={merchantConfig.printSettings} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-12 rounded-xl border-indigo-100 text-indigo-600 font-bold" onClick={() => navigate(`/chat/${selectedOrderDetails.customer_id}?orderId=${selectedOrderDetails.id}`)}>CHAT CLIENTE</Button>
                    <Button variant="outline" className="h-12 rounded-xl border-indigo-100 text-indigo-600 font-bold" onClick={() => handlePrint(selectedOrderDetails)}>IMPRIMIR</Button>
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