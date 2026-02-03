"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Volume2, 
  VolumeX, 
  Bike, 
  MapPin, 
  CheckCircle2, 
  Key, 
  Phone, 
  User, 
  RotateCcw, 
  X, 
  Send, 
  AlertTriangle, 
  Search, 
  Check, 
  List, 
  Settings, 
  Printer,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageCircle,
  PhoneCall,
  Trash2
} from "lucide-center";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import OrderCardDetails from "@/components/merchant/OrderCardDetails";
import { printReceipt } from "@/utils/print";
import { useNavigate } from "react-router-dom";

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
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showItemDetails, setShowItemDetails] = useState(() => localStorage.getItem('merchant_show_items') === 'true');
  const [autoAccept, setAutoAccept] = useState(() => localStorage.getItem('merchant_auto_accept') === 'true');
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('merchant_auto_print') === 'true');
  
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const [merchantName, setMerchantName] = useState("Minha Loja");
  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);

  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'PREPARING',
          merchant_acceptance_deadline: null,
        })
        .eq('id', order.id);
      
      if (updateError) throw updateError;

      await supabase.functions.invoke('dispatch-order', {
        body: { orderId: order.id }
      });

      if (!isSilent) {
        dismissToast(tid);
        showSuccess("Pedido aceito!");
        handlePrint(order);
      }
    } catch (err: any) {
      if (!isSilent) {
        dismissToast(tid);
        showError("Erro ao aceitar pedido.");
      }
    }
  }, [handlePrint]);

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Buscar dados da loja
      const { data: merchantData } = await supabase
        .from('merchant_applications')
        .select('is_open, store_name, metadata')
        .eq('id', user.id)
        .single();

      if (merchantData) {
        setIsStoreOpen(merchantData.is_open);
        setMerchantName(merchantData.store_name || "Minha Loja");
        if (merchantData.metadata?.print_settings) {
          setPrintSettings(merchantData.metadata.print_settings);
        }
      }

      // 2. Buscar pedidos (Consulta simplificada para evitar erros de join)
      const { data: fetchedOrders, error } = await supabase
        .from('orders')
        .select(`*, driver:driver_applications!driver_id (id, full_name, phone, metadata)`)
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const ordersToSet = fetchedOrders || [];
      
      // 3. Enriquecer pedidos com nome do cliente via RPC
      const ordersWithDetails = await Promise.all(ordersToSet.map(async (order) => {
        let customerName = 'Cliente';
        let customerPhone = '';

        if (order.customer_id) {
          // Buscamos o nome
          const { data: name } = await supabase.rpc('get_user_full_name', { user_id: order.customer_id });
          customerName = name || 'Cliente';
          
          // Buscamos o telefone na tabela profiles (id é o mesmo que customer_id)
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', order.customer_id)
            .single();
          
          customerPhone = profile?.phone || '';
        }

        return { 
          ...order, 
          customer_full_name: customerName,
          customer_phone_number: customerPhone
        };
      }));

      // 4. Lógica de auto-aceite
      if (autoAccept) {
          for (const o of ordersWithDetails.filter(ord => ord.status === 'PENDING')) {
              await handleAcceptOrder(o, true);
              if (autoPrint) handlePrint(o);
          }
      }

      setOrders(ordersWithDetails);
    } catch (err) {
      console.error("[MerchantOrders] Fetch error:", err);
      showError("Erro ao carregar pedidos.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [autoAccept, autoPrint, handleAcceptOrder, handlePrint]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase.channel(`merchant_realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          playAlert();
        }
        fetchOrders(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, playAlert]);

  const handleToggleStore = async (val: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('merchant_applications').update({ is_open: val }).eq('id', user.id);
    if (!error) {
      setIsStoreOpen(val);
      showSuccess(val ? "Loja Aberta" : "Loja Fechada");
    }
  };

  const handleCancelOrder = async (id: string) => {
    if (!window.confirm("Cancelar este pedido? Esta ação é irreversível.")) return;
    try {
      const { error } = await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', id);
      if (error) throw error;
      showSuccess("Pedido cancelado.");
      setIsDetailsDialogOpen(false);
      fetchOrders(true);
    } catch (err) {
      showError("Erro ao cancelar pedido.");
    }
  };

  const handleConfirmPickup = async (order: any) => {
    const driverPhoneCode = (order.driver?.phone || "").replace(/\D/g, "").slice(-4);
    if (verificationCode !== driverPhoneCode) {
      showError("Código inválido.");
      return;
    }
    setIsVerifying(true);
    const { error } = await supabase.from('orders').update({ status: 'OUT_FOR_DELIVERY' }).eq('id', order.id);
    if (!error) {
      showSuccess("Pedido liberado!");
      setVerificationCode("");
      fetchOrders(true);
    }
    setIsVerifying(false);
  };

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const s = searchTerm.toLowerCase();
    return orders.filter(o => 
      o.id.includes(s) || 
      o.customer_full_name?.toLowerCase().includes(s) ||
      o.items.some((i: any) => i.name.toLowerCase().includes(s))
    );
  }, [orders, searchTerm]);

  const toggleShowItems = () => {
    const newVal = !showItemDetails;
    setShowItemDetails(newVal);
    localStorage.setItem('merchant_show_items', newVal.toString());
  };

  const renderSection = (title: string, color: string, filter: (o: any) => boolean, action: (o: any) => React.ReactNode) => {
    const data = filteredOrders.filter(filter);
    return (
      <div className="space-y-4">
        <h2 className={cn("font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-2", color)}>
          <span className={cn("h-2 w-2 rounded-full", color.replace('text-', 'bg-'))} />
          {title} ({data.length})
        </h2>
        {data.map(o => (
          <Card key={o.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden animate-in fade-in group hover:shadow-md transition-all">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-300">#{o.id.slice(0, 6)}</span>
                  {o.status === 'PENDING' && o.merchant_acceptance_deadline && (
                    <AcceptanceTimer deadline={o.merchant_acceptance_deadline} onExpire={() => fetchOrders(true)} />
                  )}
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-gray-400 hover:text-indigo-600 rounded-full"
                    onClick={() => { setSelectedOrderDetails(o); setIsDetailsDialogOpen(true); }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                    <User className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 leading-none">{o.customer_full_name}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase">{new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-2xl">
                  <MapPin className="h-3 w-3 mt-0.5 text-brand-accent shrink-0" />
                  <p className="leading-tight">
                    {o.delivery_address?.street}, {o.delivery_address?.number} <br/>
                    <span className="font-bold text-[10px] uppercase text-gray-400">{o.delivery_address?.neighborhood}</span>
                  </p>
                </div>

                {showItemDetails && (
                  <div className="space-y-1.5 pt-2 border-t border-gray-100">
                    {o.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs">
                        <p className="text-gray-700 font-medium">
                          <span className="text-indigo-600 font-black">{item.quantity}x</span> {item.name}
                        </p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 font-black text-indigo-900 text-sm">
                        <span>Total</span>
                        <span>R$ {o.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">{action(o)}</div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && (
          <div className="p-8 border-2 border-dashed border-gray-100 rounded-[2rem] text-center text-gray-300 text-xs font-bold uppercase">Vazio</div>
        )}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 text-indigo-600 animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-black text-indigo-900">Pedidos</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAudioEnabled(!audioEnabled)} variant={audioEnabled ? "outline" : "default"} className={cn("rounded-xl h-11", !audioEnabled && "bg-red-500 animate-pulse")}>
            {audioEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
            Som {audioEnabled ? 'Ativo' : 'Mudo'}
          </Button>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black uppercase">{isStoreOpen ? 'Online' : 'Offline'}</span>
            <Switch checked={isStoreOpen} onCheckedChange={handleToggleStore} />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <Input placeholder="Filtrar pedidos..." className="rounded-xl pl-10 h-12" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={showItemDetails ? "default" : "outline"} 
            className="rounded-xl h-12 gap-2" 
            onClick={toggleShowItems}
          >
            <List className="h-4 w-4" /> Detalhes
          </Button>
          <Button variant={autoAccept ? "default" : "outline"} className="rounded-xl h-12" onClick={() => { setAutoAccept(!autoAccept); localStorage.setItem('merchant_auto_accept', (!autoAccept).toString()); }}>Auto Aceite</Button>
          <Button variant={autoPrint ? "default" : "outline"} className="rounded-xl h-12" onClick={() => { setAutoPrint(!autoPrint); localStorage.setItem('merchant_auto_print', (!autoPrint).toString()); }}>Auto Print</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {renderSection("Novos", "text-blue-600", o => o.status === 'PENDING', o => (
          <Button className="w-full bg-blue-600 rounded-xl h-11 font-bold" onClick={() => handleAcceptOrder(o)}>Aceitar</Button>
        ))}
        {renderSection("Preparando", "text-orange-500", o => o.status === 'PREPARING', o => (
          <Button className="w-full bg-orange-500 rounded-xl h-11 font-bold" onClick={() => { supabase.from('orders').update({ status: 'WAITING_FOR_DRIVER' }).eq('id', o.id); fetchOrders(true); }}>Pronto</Button>
        ))}
        {renderSection("Coleta", "text-indigo-600", o => o.status === 'WAITING_FOR_DRIVER', o => (
          o.driver ? (
            <Dialog>
              <DialogTrigger asChild><Button className="w-full bg-indigo-600 rounded-xl h-11 font-bold">Validar Coleta</Button></DialogTrigger>
              <DialogContent className="rounded-3xl"><div className="p-4 space-y-4 text-center">
                <h3 className="font-bold">Código do Entregador</h3>
                <OtpInput length={4} value={verificationCode} onChange={setVerificationCode} />
                <Button className="w-full h-14 rounded-xl" onClick={() => handleConfirmPickup(o)} disabled={verificationCode.length < 4 || isVerifying}>Liberar Pedido</Button>
              </div></DialogContent>
            </Dialog>
          ) : <div className="text-[10px] text-center text-gray-400 font-bold uppercase animate-pulse">Buscando Entregador...</div>
        ))}
        {renderSection("Em Rota", "text-yellow-600", o => o.status === 'OUT_FOR_DELIVERY', o => (
          <Badge className="w-full py-2.5 justify-center bg-yellow-50 text-yellow-700 border-none rounded-xl font-bold">Em Entrega</Badge>
        ))}
        {renderSection("Finalizados", "text-green-600", o => ['DELIVERED', 'CANCELLED'].includes(o.status), o => (
          <Badge className={cn("w-full py-2.5 justify-center border-none rounded-xl font-bold", o.status === 'DELIVERED' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>{o.status === 'DELIVERED' ? 'Concluído' : 'Cancelado'}</Badge>
        ))}
      </div>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-6 bg-indigo-900 text-white flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
               <Printer className="h-5 w-5 text-indigo-300" />
               <h3 className="font-bold uppercase tracking-widest text-sm">Painel do Pedido</h3>
             </div>
             <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => setIsDetailsDialogOpen(false)}><X className="h-5 w-5" /></Button>
          </div>
          
          <ScrollArea className="flex-1 p-6 bg-white">
            {selectedOrderDetails && (
              <div className="space-y-8">
                <div className="flex justify-center bg-gray-50 p-4 rounded-3xl border border-dashed border-gray-200">
                  <OrderReceipt 
                    order={selectedOrderDetails} 
                    merchantName={merchantName} 
                    customerName={selectedOrderDetails.customer_full_name} 
                    printSettings={printSettings} 
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">Central de Comunicação</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-indigo-600" />
                        <span className="font-bold text-indigo-900 text-sm">Cliente: {selectedOrderDetails.customer_full_name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 rounded-xl bg-white border-indigo-200 text-indigo-600 h-10 gap-2"
                          onClick={() => navigate(`/chat/${selectedOrderDetails.customer_id}?orderId=${selectedOrderDetails.id}`)}
                        >
                          <MessageSquare className="h-4 w-4" /> Chat
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 rounded-xl bg-white border-indigo-200 text-indigo-600 h-10 gap-2"
                          asChild
                        >
                          <a href={`tel:${selectedOrderDetails.customer_phone_number || ""}`}>
                            <PhoneCall className="h-4 w-4" /> Ligar
                          </a>
                        </Button>
                      </div>
                    </div>

                    {selectedOrderDetails.driver && (
                      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-blue-600" />
                          <span className="font-bold text-blue-900 text-sm">Entregador: {selectedOrderDetails.driver.full_name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 rounded-xl bg-white border-blue-200 text-blue-600 h-10 gap-2"
                            onClick={() => navigate(`/chat/${selectedOrderDetails.driver.id}?orderId=${selectedOrderDetails.id}`)}
                          >
                            <MessageSquare className="h-4 w-4" /> Chat
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 rounded-xl bg-white border-blue-200 text-blue-600 h-10 gap-2"
                            asChild
                          >
                            <a href={`tel:${selectedOrderDetails.driver.phone}`}>
                              <PhoneCall className="h-4 w-4" /> Ligar
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest px-2">Gestão Crítica</h4>
                   <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 rounded-2xl h-12 gap-3 px-4" onClick={() => handleCancelOrder(selectedOrderDetails.id)}>
                     <Trash2 className="h-5 w-5" /> Cancelar este Pedido
                   </Button>
                </div>
              </div>
            )}
          </ScrollArea>
          
          <div className="p-6 border-t bg-gray-50 flex gap-3 shrink-0">
            <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setIsDetailsDialogOpen(false)}>Fechar</Button>
            <Button className="flex-1 rounded-xl bg-indigo-600 h-12 font-bold gap-2" onClick={() => handlePrint(selectedOrderDetails)}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantOrdersPage;