"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Bike, 
  MapPin, 
  X, 
  Search, 
  Printer,
  Eye,
  MessageCircle,
  Clock,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  XCircle,
  UserCheck,
  Zap
} from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AcceptanceTimer from "@/components/merchant/AcceptanceTimer";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger 
} from "@/components/ui/dialog";
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
  
  const [showFullDetails, setShowFullDetails] = useState(() => localStorage.getItem('merchant_show_details') === 'true');
  const [autoAccept, setAutoAccept] = useState(() => localStorage.getItem('merchant_auto_accept') === 'true');
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('merchant_auto_print') === 'true');
  
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<any>(null);
  const [authorizedDrivers, setAuthorizedDrivers] = useState<any[]>([]);

  const [merchantConfig, setMerchantConfig] = useState({
    name: "Minha Loja",
    deliveryMode: 'APP' as 'APP' | 'OWN',
    printSettings: defaultPrintSettings,
    authorizedEmails: [] as string[]
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Refs para usar os valores atuais dentro do listener de realtime (que é uma closure)
  const autoAcceptRef = useRef(autoAccept);
  const merchantConfigRef = useRef(merchantConfig);

  useEffect(() => {
    autoAcceptRef.current = autoAccept;
    merchantConfigRef.current = merchantConfig;
  }, [autoAccept, merchantConfig]);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    const loadConfig = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('merchant_applications').select('is_open, store_name, metadata').eq('id', user.id).single();
        if (data) {
            setIsStoreOpen(data.is_open);
            const deliveryArea = data.metadata?.delivery_area || {};
            setMerchantConfig({
                name: data.store_name || "Minha Loja",
                deliveryMode: deliveryArea.delivery_mode || 'APP',
                printSettings: data.metadata?.print_settings || defaultPrintSettings,
                authorizedEmails: deliveryArea.authorized_drivers || []
            });
            
            if (deliveryArea.authorized_drivers?.length > 0) {
                const { data: driverProfiles } = await supabase
                    .from('driver_applications')
                    .select('id, full_name, email')
                    .in('email', deliveryArea.authorized_drivers);
                if (driverProfiles) setAuthorizedDrivers(driverProfiles);
            }
        }
    };
    loadConfig();
  }, []);

  const handlePrint = useCallback((order: any) => {
    printReceipt(order, merchantConfig.name, order.customer_full_name || 'Cliente', merchantConfig.printSettings);
  }, [merchantConfig]);

  const handleAcceptOrder = useCallback(async (order: any) => {
    const tid = showLoading("Aceitando...");
    try {
      const mode = merchantConfigRef.current.deliveryMode;
      const { error } = await supabase.from('orders').update({ 
          status: 'PREPARING', 
          merchant_acceptance_deadline: null, 
          logistics_mode: mode 
      }).eq('id', order.id);

      if (error) throw error;
      
      if (order.delivery_type === 'delivery' && mode === 'APP') {
        supabase.functions.invoke('dispatch-order', { body: { orderId: order.id } }).catch(() => {});
      }
      
      if (autoPrint) handlePrint(order);
      
      dismissToast(tid); 
      showSuccess("Pedido aceito!");
      fetchOrders(true);
    } catch (err) { 
      dismissToast(tid); 
      showError("Erro ao aceitar pedido."); 
    }
  }, [autoPrint, handlePrint]);

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
        return {
          ...o,
          customer_full_name: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Cliente',
          driver_full_name: d?.full_name || null,
          delivery_address: o.delivery_address || {}
        };
      });
      setOrders(enriched);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('merchant_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            if (audioRef.current) audioRef.current.play().catch(() => {});
            // Lógica de Auto Aceite
            if (autoAcceptRef.current) {
                handleAcceptOrder(payload.new);
            }
        }
        fetchOrders(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders, handleAcceptOrder]);

  const handleSwitchToAppLogistics = async (orderId: string) => {
    if (!window.confirm("Deseja enviar este pedido para a rede de entregadores do App?")) return;
    const tid = showLoading("Atualizando logística...");
    try {
        const { error } = await supabase.from('orders').update({ logistics_mode: 'APP', current_driver_offered_id: null, driver_id: null }).eq('id', orderId);
        if (error) throw error;
        supabase.functions.invoke('dispatch-order', { body: { orderId } }).catch(() => {});
        showSuccess("Mudado para Rede App!");
        setIsDetailsDialogOpen(false);
        fetchOrders(true);
    } catch (err) { showError("Erro ao mudar logística."); }
    finally { dismissToast(tid); }
  };

  const handleAssignOwnDriver = async (driverId: string) => {
    if (!orderToAssign) return;
    const tid = showLoading("Enviando para entregador...");
    try {
        const expiresAt = new Date(Date.now() + 300 * 1000).toISOString(); 
        const { error } = await supabase.from('orders').update({ 
            current_driver_offered_id: driverId, 
            offer_expires_at: expiresAt,
            logistics_mode: 'OWN' 
        }).eq('id', orderToAssign.id);
        
        if (error) throw error;
        showSuccess("Oferta enviada ao entregador!");
        setIsAssignDriverOpen(false);
        fetchOrders(true);
    } catch (err) { showError("Erro ao atribuir."); }
    finally { dismissToast(tid); }
  };

  const handleReadyForShipping = async (order: any) => {
    const tid = showLoading("Processando...");
    try {
        const newStatus = order.delivery_type === 'pickup' ? 'READY_FOR_PICKUP' : 'WAITING_FOR_DRIVER';
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
        if (error) throw error;
        showSuccess("Pedido pronto!");
        fetchOrders(true);
    } catch (err) { showError("Erro ao atualizar."); }
    finally { dismissToast(tid); }
  };

  const renderColumn = (title: string, color: string, statusList: string[]) => {
    const data = orders.filter(o => statusList.includes(o.status) && (o.id.includes(searchTerm) || o.customer_full_name.toLowerCase().includes(searchTerm.toLowerCase())));
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
                        (o.driver_full_name || o.logistics_mode === 'OWN' || merchantConfig.deliveryMode === 'OWN') ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-gray-50 border-gray-100 text-gray-400"
                    )}>
                      <Bike className="h-3 w-3" />
                      <span className="text-[9px] font-black uppercase truncate">
                          {o.driver_full_name ? `Entregador: ${o.driver_full_name}` : 
                           (o.logistics_mode === 'OWN' || (o.status === 'PENDING' && merchantConfig.deliveryMode === 'OWN')) ? "Entrega Própria" :
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
                  o.logistics_mode === 'OWN' && o.status === 'WAITING_FOR_DRIVER' ? (
                      <Button className="w-full bg-indigo-600 h-10 rounded-xl font-black text-xs uppercase" onClick={() => { setOrderToAssign(o); setIsAssignDriverOpen(true); }}>Definir Entregador</Button>
                  ) : (
                    <Dialog>
                        <DialogTrigger asChild><Button className="w-full bg-green-600 h-10 rounded-xl font-black text-xs uppercase">Validar Código</Button></DialogTrigger>
                        <DialogContent className="rounded-[2rem] p-8 text-center border-none shadow-2xl">
                            <DialogHeader><DialogTitle className="text-xl font-black text-indigo-900">Validar Entrega</DialogTitle></DialogHeader>
                            <div className="flex justify-center my-4"><OtpInput length={4} value={verificationCode} onChange={setVerificationCode} /></div>
                            <Button className="w-full h-14 rounded-xl bg-indigo-600 font-bold text-white shadow-lg" onClick={async () => {
                                if (verificationCode === o.confirmation_code) {
                                    await supabase.from('orders').update({ status: o.status === 'READY_FOR_PICKUP' ? 'DELIVERED' : 'OUT_FOR_DELIVERY' }).eq('id', o.id);
                                    setVerificationCode(""); showSuccess("Validado!"); fetchOrders(true);
                                } else { showError("Código incorreto."); }
                            }}>Confirmar</Button>
                        </DialogContent>
                    </Dialog>
                  )
                )}

                {o.status === 'OUT_FOR_DELIVERY' && (
                   <div className="space-y-2">
                       <Badge className="w-full py-2 justify-center bg-yellow-50 text-yellow-700 border-none rounded-lg font-bold uppercase text-[9px]">Em Entrega</Badge>
                       <Button variant="outline" className="w-full rounded-lg border-indigo-100 text-indigo-600 text-xs h-9" onClick={() => navigate(`/chat/${o.driver_id}?orderId=${o.id}`)}><Bike className="h-3 w-3 mr-2" /> Chat</Button>
                   </div>
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
                    LOJA {isStoreOpen ? "ABERTA" : "FECHADA"}
                </Badge>
                <Switch checked={isStoreOpen} onCheckedChange={async (v) => { 
                    const { data } = await supabase.auth.getUser(); 
                    await supabase.from('merchant_applications').update({ is_open: v }).eq('id', data.user?.id); 
                    setIsStoreOpen(v); 
                }} />
            </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl">
            <div className="flex items-center gap-2 px-3 border-r border-gray-200">
                <span className="text-[9px] font-black text-gray-400 uppercase">Auto Aceite</span>
                <Switch checked={autoAccept} onCheckedChange={(v) => { setAutoAccept(v); localStorage.setItem('merchant_auto_accept', v.toString()); }} className="scale-75" />
            </div>
            <div className="flex items-center gap-2 px-3 border-r border-gray-200">
                <span className="text-[9px] font-black text-gray-400 uppercase">Auto Imprimir</span>
                <Switch checked={autoPrint} onCheckedChange={(v) => { setAutoPrint(v); localStorage.setItem('merchant_auto_print', v.toString()); }} className="scale-75" />
            </div>
            <div className="flex items-center gap-2 px-3">
                <span className="text-[9px] font-black text-gray-400 uppercase">Detalhes</span>
                <Switch checked={showFullDetails} onCheckedChange={(v) => { setShowFullDetails(v); localStorage.setItem('merchant_show_details', v.toString()); }} className="scale-75" />
            </div>
        </div>
      </div>

      <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
          <Input 
            placeholder="Filtrar pedidos por nome ou ID..." 
            className="rounded-2xl pl-12 h-14 bg-white border-none shadow-sm focus:ring-2 focus:ring-indigo-100 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      {loading ? (
        <div className="py-40 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {renderColumn("Aceitar", "text-blue-600", ["PENDING"])}
          {renderColumn("Preparando", "text-orange-600", ["PREPARING"])}
          {renderColumn("Coleta", "text-indigo-600", ["WAITING_FOR_DRIVER", "READY_FOR_PICKUP"])}
          {renderColumn("Em Rota", "text-yellow-600", ["OUT_FOR_DELIVERY"])}
          {renderColumn("Concluídos", "text-green-600", ["DELIVERED"])}
        </div>
      )}

      {/* DIALOG DE DETALHES */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-xl h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button variant="outline" className="h-12 rounded-xl border-indigo-100 text-indigo-600 font-bold gap-2" onClick={() => navigate(`/chat/${selectedOrderDetails.customer_id}?orderId=${selectedOrderDetails.id}`)}>
                        <MessageCircle className="h-4 w-4" /> CHAT CLIENTE
                    </Button>
                    
                    {selectedOrderDetails.driver_id && (
                        <Button variant="outline" className="h-12 rounded-xl border-blue-100 text-blue-600 font-bold gap-2" onClick={() => navigate(`/chat/${selectedOrderDetails.driver_id}?orderId=${selectedOrderDetails.id}`)}>
                            <Bike className="h-4 w-4" /> CHAT ENTREGADOR
                        </Button>
                    )}

                    <Button variant="outline" className="h-12 rounded-xl border-indigo-100 text-indigo-600 font-bold gap-2" onClick={() => handlePrint(selectedOrderDetails)}>
                        <Printer className="h-4 w-4" /> IMPRIMIR
                    </Button>

                    {(selectedOrderDetails.logistics_mode === 'OWN' || merchantConfig.deliveryMode === 'OWN') && ['PENDING', 'PREPARING', 'WAITING_FOR_DRIVER'].includes(selectedOrderDetails.status) && (
                        <Button className="h-12 rounded-xl bg-brand-accent text-white font-black gap-2 shadow-lg" onClick={() => handleSwitchToAppLogistics(selectedOrderDetails.id)}>
                            <Zap className="h-4 w-4" /> ENTREGA PELO APP
                        </Button>
                    )}

                    {!['DELIVERED', 'CANCELLED'].includes(selectedOrderDetails.status) && (
                        <Button variant="outline" className="h-12 rounded-xl border-red-100 text-red-600 font-bold gap-2 hover:bg-red-50" onClick={() => { if(window.confirm("Cancelar pedido?")) supabase.from('orders').update({status:'CANCELLED'}).eq('id', selectedOrderDetails.id).then(()=>fetchOrders(true)); setIsDetailsDialogOpen(false); }}>
                            <XCircle className="h-4 w-4" /> CANCELAR PEDIDO
                        </Button>
                    )}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE ATRIBUIR ENTREGADOR PRÓPRIO */}
      <Dialog open={isAssignDriverOpen} onOpenChange={setIsAssignDriverOpen}>
        <DialogContent className="rounded-[2rem] p-8 border-none shadow-2xl sm:max-w-md">
            <DialogHeader className="text-center">
                <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><UserCheck className="h-8 w-8 text-indigo-600" /></div>
                <DialogTitle className="text-2xl font-black text-indigo-900">Definir Entregador</DialogTitle>
                <DialogDescription>Selecione um dos seus entregadores autorizados para esta entrega.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 py-4">
                {authorizedDrivers.length > 0 ? (
                    authorizedDrivers.map(driver => (
                        <button 
                            key={driver.id}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
                            onClick={() => handleAssignOwnDriver(driver.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center font-black text-indigo-600 shadow-sm">{driver.full_name.charAt(0)}</div>
                                <span className="font-bold text-gray-800">{driver.full_name}</span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-300 group-hover:text-indigo-600 -rotate-90" />
                        </button>
                    ))
                ) : (
                    <div className="text-center py-6">
                        <p className="text-sm text-gray-500 mb-4">Você ainda não tem entregadores autorizados cadastrados.</p>
                        <Button variant="outline" className="rounded-xl border-indigo-200 text-indigo-600 font-bold" onClick={() => navigate("/merchant/settings")}>Cadastrar agora</Button>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantOrdersPage;