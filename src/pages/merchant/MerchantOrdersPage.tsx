"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Volume2, 
  VolumeX, 
  Bike, 
  MapPin, 
  User, 
  X, 
  Search, 
  Printer,
  Eye,
  EyeOff,
  MessageCircle,
  Trash2,
  Clock,
  CreditCard,
  Truck,
  CheckCircle2,
  History,
  Store,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AcceptanceTimer from "@/components/merchant/AcceptanceTimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OtpInput } from "@/components/shared/OtpInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import OrderReceipt from "@/components/merchant/OrderReceipt";
import { Input } from "@/components/ui/input";
import { printReceipt } from "@/utils/print";
import { useNavigate } from "react-router-dom";
import { subHours } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showFullDetails, setShowFullDetails] = useState(() => localStorage.getItem('merchant_show_details') === 'true');
  const [autoAccept, setAutoAccept] = useState(() => localStorage.getItem('merchant_auto_accept') === 'true');
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('merchant_auto_print') === 'true');
  
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const [merchantName, setMerchantName] = useState("Minha Loja");
  const [merchantDeliveryMode, setMerchantDeliveryMode] = useState<'APP' | 'OWN'>('APP');
  const [authorizedEmails, setAuthorizedEmails] = useState<string[]>([]);
  const [availableFleetDrivers, setAvailableFleetDrivers] = useState<any[]>([]);
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

  const handleCleanupExpired = useCallback(async () => {
    try {
      await supabase.rpc('cancel_expired_pending_orders');
    } catch (e) {
      console.error("Erro ao limpar expirados:", e);
    }
  }, []);

  const fetchOnlineFleetDrivers = useCallback(async () => {
      if (authorizedEmails.length === 0) {
          setAvailableFleetDrivers([]);
          return;
      }

      try {
          // Busca os dados da tabela driver_applications para os e-mails autorizados
          const { data: drivers } = await supabase
              .from('driver_applications')
              .select('id, email, full_name, metadata')
              .in('email', authorizedEmails)
              .eq('status', 'APPROVED');

          if (!drivers) return;

          // Cruza com as localizações para saber quem está online/ativo
          // Para ser mais simples, vamos considerar quem teve update na localização nos últimos 10 min
          const { data: locations } = await supabase
              .from('driver_locations')
              .select('driver_id')
              .gte('updated_at', new Date(Date.now() - 10 * 60000).toISOString());

          const activeIds = (locations || []).map(l => l.driver_id);

          const filtered = drivers.filter(d => 
              activeIds.includes(d.id) && 
              d.metadata?.is_exclusive === true // Só mostra quem está no Modo Exclusivo
          );

          setAvailableFleetDrivers(filtered);
      } catch (err) {
          console.error("Error fetching fleet drivers:", err);
      }
  }, [authorizedEmails]);

  const handleAcceptOrder = useCallback(async (order: any, isSilent = false) => {
    const tid = isSilent ? null : showLoading("Aceitando pedido...");
    try {
      // Marcamos o logistics_mode inicial com base na config da loja
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

      // Se for modo APP, dispara a busca automática
      if (order.delivery_type === 'delivery' && mode === 'APP') {
        await supabase.functions.invoke('dispatch-order', {
          body: { orderId: order.id }
        });
      }

      if (localStorage.getItem('merchant_auto_print') === 'true') {
        handlePrint(order);
      }

      if (!isSilent) {
        dismissToast(tid);
        showSuccess("Pedido aceito!");
      }
    } catch (err: any) {
      if (!isSilent) {
        dismissToast(tid);
        showError("Erro ao aceitar pedido.");
      }
    }
  }, [handlePrint, merchantDeliveryMode]);

  const handleAssignFleetDriver = async (orderId: string, driverId: string) => {
      const tid = showLoading("Vinculando entregador...");
      try {
          const { error } = await supabase
              .from('orders')
              .update({ 
                  driver_id: driverId,
                  status: 'WAITING_FOR_DRIVER',
                  logistics_mode: 'OWN' // Garante que é modo Frota Própria
              })
              .eq('id', orderId);

          if (error) throw error;
          showSuccess("Entregador vinculado!");
          fetchOrders(true);
      } catch (err) {
          showError("Erro ao vincular entregador.");
      } finally {
          dismissToast(tid);
      }
  };

  const handleFallbackToApp = async (order: any) => {
      const tid = showLoading("Buscando entregador na rede...");
      try {
          const { error } = await supabase
              .from('orders')
              .update({ 
                  logistics_mode: 'APP',
                  driver_id: null // Remove qualquer entregador próprio anterior
              })
              .eq('id', order.id);

          if (error) throw error;

          await supabase.functions.invoke('dispatch-order', {
              body: { orderId: order.id }
          });

          showSuccess("Pedido direcionado para a rede do App!");
          setIsDetailsDialogOpen(false);
          fetchOrders(true);
      } catch (err) {
          showError("Erro ao processar fallback.");
      } finally {
          dismissToast(tid);
      }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const tid = showLoading("Atualizando status...");
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      showSuccess("Status atualizado!");
    } catch (err: any) {
      showError("Erro ao atualizar.");
    } finally {
      dismissToast(tid);
      fetchOrders(true);
    }
  };

  const handleConfirmAction = async (order: any) => {
    setIsVerifying(true);
    const tid = showLoading("Validando...");
    try {
      if (verificationCode !== order.confirmation_code) {
        showError("Código incorreto.");
        return;
      }
      
      const newStatus = order.status === 'READY_FOR_PICKUP' ? 'DELIVERED' : 'OUT_FOR_DELIVERY';
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;
      showSuccess(newStatus === 'DELIVERED' ? "Pedido entregue!" : "Pedido coletado!");
      setVerificationCode("");
    } catch (err: any) {
      showError("Erro na validação.");
    } finally {
      dismissToast(tid);
      setIsVerifying(false);
      fetchOrders(true);
    }
  };

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) {
        setLoading(true);
        setFetchError(null);
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isInitialMount.current) {
        const { data: merchantData } = await supabase
          .from('merchant_applications')
          .select('is_open, store_name, metadata')
          .eq('id', user.id)
          .single();

        if (merchantData) {
          setIsStoreOpen(merchantData.is_open);
          setMerchantName(merchantData.store_name || "Minha Loja");
          setMerchantDeliveryMode(merchantData.metadata?.delivery_area?.delivery_mode || 'APP');
          setAuthorizedEmails(merchantData.metadata?.delivery_area?.authorized_drivers || []);
          if (merchantData.metadata?.print_settings) {
            setPrintSettings(merchantData.metadata.print_settings);
          }
        }
        isInitialMount.current = false;
      }
      
      const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();

      const { data: rawOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user.id)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      if (!rawOrders) { setOrders([]); return; }

      const customerIds = Array.from(new Set(rawOrders.map(o => o.customer_id).filter(Boolean)));
      const driverIds = Array.from(new Set(rawOrders.map(o => o.driver_id).filter(Boolean)));

      let profilesData: any[] = [];
      let driversData: any[] = [];

      if (customerIds.length > 0) {
          const res = await supabase.from('profiles').select('id, first_name, last_name').in('id', customerIds);
          if (!res.error) profilesData = res.data || [];
      }
      if (driverIds.length > 0) {
          const res = await supabase.from('driver_applications').select('*').in('id', driverIds);
          if (!res.error) driversData = res.data || [];
      }

      const enrichedOrders = rawOrders.map(order => {
        const profile = profilesData.find(p => p.id === order.customer_id);
        const driver = driversData.find(d => d.id === order.driver_id);
        return {
          ...order,
          customer_full_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Cliente',
          driver: driver || null,
          items: Array.isArray(order.items) ? order.items : [],
          delivery_address: order.delivery_address || {},
          delivery_type: order.delivery_type || 'delivery',
          logistics_mode: order.logistics_mode || 'APP'
        };
      });

      setOrders(enrichedOrders);

    } catch (err: any) {
      console.error("[MerchantOrders] Fetch Error:", err);
      setFetchError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    handleCleanupExpired();

    const channel = supabase.channel(`merchant_realtime_fixed`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            playAlert();
            if (localStorage.getItem('merchant_auto_accept') === 'true') {
                handleAcceptOrder(payload.new, true);
            }
        }
        fetchOrders(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders, playAlert, handleAcceptOrder, handleCleanupExpired]);

  // Sync fleet drivers periodically when open
  useEffect(() => {
      if (merchantDeliveryMode === 'OWN' && authorizedEmails.length > 0) {
          fetchOnlineFleetDrivers();
          const interval = setInterval(fetchOnlineFleetDrivers, 15000);
          return () => clearInterval(interval);
      }
  }, [merchantDeliveryMode, authorizedEmails, fetchOnlineFleetDrivers]);

  const handleToggleStore = async (val: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('merchant_applications').update({ is_open: val }).eq('id', user.id);
    if (!error) {
      setIsStoreOpen(val);
      showSuccess(val ? "Loja Aberta" : "Loja Fechada");
    }
  };

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    return orders.filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.customer_full_name && o.customer_full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [orders, searchTerm]);

  const renderColumn = (title: string, color: string, statusList: string[]) => {
    const data = filteredOrders.filter(o => statusList.includes(o.status));

    return (
      <div className="space-y-4 flex flex-col min-h-[500px]">
        <h2 className={cn("font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-2 shrink-0", color)}>
          <span className={cn("h-2 w-2 rounded-full", color.replace('text-', 'bg-'))} />
          {title} ({data.length})
        </h2>
        
        <div className="space-y-4 flex-1">
          {data.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-gray-100 rounded-[2rem] text-center text-gray-300 text-[10px] font-black uppercase">Vazio</div>
          ) : (
            data.map(o => (
              <Card key={o.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden hover:shadow-md transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-300">#{o.id.slice(0, 6)}</span>
                      {o.delivery_type === 'delivery' && (
                        <Badge variant="outline" className={cn("text-[8px] font-black border-none px-1.5 py-0", o.logistics_mode === 'OWN' ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400")}>
                          {o.logistics_mode === 'OWN' ? "FROTA PRÓPRIA" : "APP REDE"}
                        </Badge>
                      )}
                    </div>
                    {o.status === 'PENDING' && o.merchant_acceptance_deadline && (
                      <AcceptanceTimer 
                        deadline={o.merchant_acceptance_deadline} 
                        onExpire={() => fetchOrders(true)} 
                      />
                    )}
                    <Button 
                      variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-indigo-600 rounded-full"
                      onClick={() => { setSelectedOrderDetails(o); setIsDetailsDialogOpen(true); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-800">{o.customer_full_name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        <span className={cn("font-black ml-2 px-2 py-0.5 rounded-full", o.delivery_type === 'pickup' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700')}>
                            {o.delivery_type === 'pickup' ? 'RETIRADA' : 'ENTREGA'}
                        </span>
                    </div>
                  </div>

                  {/* Fleet Selection UI in Dashboard */}
                  {o.status === 'PREPARING' && o.delivery_type === 'delivery' && o.logistics_mode === 'OWN' && !o.driver_id && (
                      <div className="space-y-2 pt-2 animate-in fade-in">
                        <Label className="text-[10px] font-black text-indigo-900 uppercase">Selecionar Entregador Próprio</Label>
                        <Select onValueChange={(val) => handleAssignFleetDriver(o.id, val)}>
                          <SelectTrigger className="rounded-xl border-indigo-100 h-10 text-xs font-bold bg-indigo-50/30">
                            <SelectValue placeholder={availableFleetDrivers.length > 0 ? "Escolha na lista..." : "Nenhum frotista online"} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {availableFleetDrivers.map(d => (
                              <SelectItem key={d.id} value={d.id} className="text-xs font-bold">
                                {d.full_name} ({d.email.split('@')[0]})
                              </SelectItem>
                            ))}
                            {availableFleetDrivers.length === 0 && (
                                <p className="p-2 text-[10px] text-gray-400 font-bold uppercase text-center">Ninguém disponível agora</p>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                  )}

                  {showFullDetails ? (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-2xl animate-in fade-in">
                      <div className="flex items-start gap-2 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-brand-accent mt-0.5 shrink-0" />
                        <p className="text-gray-700 leading-tight">
                          {o.delivery_type === 'pickup' ? 'Retirada no Local' : `${o.delivery_address?.street}, ${o.delivery_address?.number}`}<br/>
                          <span className="font-bold text-[10px] text-gray-400 uppercase">Bairro: {o.delivery_address?.neighborhood || 'N/A'}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <CreditCard className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="font-bold text-indigo-900 uppercase">{o.payment_method}</span>
                        <span className="text-gray-300 mx-1">|</span>
                        <span className="font-black text-indigo-600">R$ {o.total.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Produtos:</p>
                        {o.items.map((item: any, i: number) => (
                          <p key={i} className="text-[11px] text-gray-600 truncate">
                            <span className="font-bold text-indigo-600">{item.quantity}x</span> {item.name}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-2xl">
                      <MapPin className="h-3 w-3 mt-0.5 text-brand-accent shrink-0" />
                      <p className="line-clamp-1">{o.delivery_type === 'pickup' ? 'Retirada no Local' : o.delivery_address?.street || 'Endereço não informado'}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    {o.status === 'PENDING' && (
                        <Button className="w-full bg-blue-600 rounded-xl h-11 font-bold" onClick={() => handleAcceptOrder(o)}>Aceitar Pedido</Button>
                    )}
                    {o.status === 'PREPARING' && (
                        <Button 
                            className="w-full bg-orange-500 rounded-xl h-11 font-bold" 
                            onClick={() => handleStatusUpdate(o.id, o.delivery_type === 'pickup' ? 'READY_FOR_PICKUP' : 'WAITING_FOR_DRIVER')}
                            disabled={o.delivery_type === 'delivery' && o.logistics_mode === 'OWN' && !o.driver_id}
                        >
                            Pronto para {o.delivery_type === 'pickup' ? 'Retirada' : 'Coleta'}
                        </Button>
                    )}
                    {(o.status === 'READY_FOR_PICKUP' || o.status === 'WAITING_FOR_DRIVER') && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button 
                                    className={cn("w-full rounded-xl h-11 font-bold", o.status === 'READY_FOR_PICKUP' ? "bg-green-600" : "bg-indigo-600")}
                                    disabled={o.status === 'WAITING_FOR_DRIVER' && !o.driver_id}
                                >
                                    {o.status === 'WAITING_FOR_DRIVER' && !o.driver_id ? 'Buscando...' : 'Validar Código'}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl p-6 space-y-4 text-center">
                                <h3 className="font-bold">Código de {o.status === 'READY_FOR_PICKUP' ? 'Retirada' : 'Coleta'}</h3>
                                <p className="text-xs text-gray-500">{o.status === 'READY_FOR_PICKUP' ? 'Código do Cliente' : 'Código do Entregador'}</p>
                                <OtpInput length={4} value={verificationCode} onChange={setVerificationCode} />
                                <Button className="w-full h-14 rounded-xl" onClick={() => handleConfirmAction(o)} disabled={verificationCode.length < 4 || isVerifying}>
                                    Confirmar
                                </Button>
                            </DialogContent>
                        </Dialog>
                    )}
                    {o.status === 'OUT_FOR_DELIVERY' && (
                        <Badge className="w-full py-2.5 justify-center bg-yellow-50 text-yellow-700 border-none rounded-xl font-bold uppercase text-[10px]">A caminho</Badge>
                    )}
                    {['DELIVERED', 'CANCELLED'].includes(o.status) && (
                        <Badge className={cn("w-full py-2.5 justify-center border-none rounded-xl font-bold text-[10px] uppercase", o.status === 'DELIVERED' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                            {o.status === 'DELIVERED' ? 'Concluído' : 'Cancelado'}
                        </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="min-h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" /><p className="text-gray-500 font-bold">Carregando painel...</p></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-black text-indigo-900">Painel de Pedidos</h1>
        <div className="flex flex-wrap justify-center gap-2">
          <Button 
            variant="outline" 
            className="rounded-xl h-11 text-indigo-600 font-bold border-indigo-100 hover:bg-indigo-50"
            onClick={() => navigate("/merchant/history")}
          >
            <History className="h-4 w-4 mr-2" /> Histórico Completo
          </Button>
          <Button onClick={() => setAudioEnabled(!audioEnabled)} variant={audioEnabled ? "outline" : "default"} className={cn("rounded-xl h-11", !audioEnabled && "bg-red-500 animate-pulse")}>
            {audioEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
            {audioEnabled ? 'Som Ativo' : 'Ativar Som'}
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
          <Input placeholder="Buscar cliente ou ID..." className="rounded-xl pl-10 h-12 border-none shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={showFullDetails ? "default" : "outline"} 
            className="rounded-xl h-12 gap-2" 
            onClick={() => { 
                const newState = !showFullDetails;
                setShowFullDetails(newState); 
                localStorage.setItem('merchant_show_details', newState.toString()); 
            }}
          >
            {showFullDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Detalhes
          </Button>
          <Button variant={autoAccept ? "default" : "outline"} className="rounded-xl h-12" onClick={() => { setAutoAccept(!autoAccept); localStorage.setItem('merchant_auto_accept', (!autoAccept).toString()); }}>
            Auto Aceite
          </Button>
          <Button variant={autoPrint ? "default" : "outline"} className="rounded-xl h-12 gap-2" onClick={() => { setAutoPrint(!autoPrint); localStorage.setItem('merchant_auto_print', (!autoPrint).toString()); }}>
            <Printer className="h-4 w-4" /> Auto Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-start">
        {renderColumn("Novos", "text-blue-600", ["PENDING"])}
        {renderColumn("Preparo", "text-orange-500", ["PREPARING"])}
        {renderColumn("Coleta / Retirada", "text-indigo-600", ["READY_FOR_PICKUP", "WAITING_FOR_DRIVER"])}
        {renderColumn("Em Rota", "text-yellow-600", ["OUT_FOR_DELIVERY"])}
        {renderColumn("Histórico", "text-gray-400", ["DELIVERED", "CANCELLED"])}
      </div>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-6 bg-indigo-900 text-white flex justify-between items-center shrink-0">
             <h3 className="font-bold uppercase tracking-widest text-xs">Detalhes do Pedido</h3>
             <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => setIsDetailsDialogOpen(false)}><X className="h-5 w-5" /></Button>
          </div>
          
          <ScrollArea className="flex-1 p-6 bg-white">
            {selectedOrderDetails && (
              <div className="space-y-8 pb-8">
                <div className="flex justify-center bg-gray-50 p-4 rounded-3xl border border-dashed border-gray-200">
                  <OrderReceipt 
                    order={selectedOrderDetails} 
                    merchantName={merchantName} 
                    customerName={selectedOrderDetails.customer_full_name} 
                    printSettings={printSettings} 
                  />
                </div>

                {/* Fallback Option for Own Fleet Orders */}
                {selectedOrderDetails.logistics_mode === 'OWN' && !['DELIVERED', 'CANCELLED', 'OUT_FOR_DELIVERY'].includes(selectedOrderDetails.status) && (
                    <div className="p-5 bg-orange-50 border border-orange-100 rounded-[2rem] space-y-3">
                        <div className="flex items-center gap-3">
                            <Truck className="h-5 w-5 text-orange-600" />
                            <h4 className="font-black text-orange-900 text-sm">Problemas com sua frota?</h4>
                        </div>
                        <p className="text-[10px] text-orange-800 font-bold uppercase leading-relaxed">
                            Se você não tiver entregadores próprios disponíveis agora, você pode direcionar este pedido para a rede do App.
                        </p>
                        <Button 
                            className="w-full bg-white text-orange-600 border border-orange-200 hover:bg-orange-100 rounded-xl h-12 font-black text-[10px] uppercase tracking-wider"
                            onClick={() => handleFallbackToApp(selectedOrderDetails)}
                        >
                            Direcionar para Entregador do App
                        </Button>
                    </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">Contato</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-indigo-600" />
                        <span className="font-bold text-indigo-900 text-sm">{selectedOrderDetails.customer_full_name}</span>
                      </div>
                      <Button variant="outline" className="w-full rounded-xl bg-white border-indigo-200 text-indigo-600 h-10 gap-2" onClick={() => navigate(`/chat/${selectedOrderDetails.customer_id}?orderId=${selectedOrderDetails.id}`)}>
                        <MessageCircle className="h-4 w-4" /> Chat com Cliente
                      </Button>
                    </div>

                    {selectedOrderDetails.driver && (
                      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-blue-600" />
                          <span className="font-bold text-blue-900 text-sm">Entregador: {selectedOrderDetails.driver.full_name}</span>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl bg-white border-blue-200 text-blue-600 h-10 gap-2" onClick={() => navigate(`/chat/${selectedOrderDetails.driver.id}?orderId=${selectedOrderDetails.id}`)}>
                          <MessageCircle className="h-4 w-4" /> Chat com Entregador
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest px-2">Ações</h4>
                   <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 rounded-2xl h-12 gap-3 px-4" onClick={() => {
                     if(window.confirm("Cancelar este pedido?")) {
                       supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', selectedOrderDetails.id).then(() => {
                          setIsDetailsDialogOpen(false);
                          fetchOrders(true);
                       });
                     }
                   }}>
                     <Trash2 className="h-5 w-5" /> Cancelar Pedido
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