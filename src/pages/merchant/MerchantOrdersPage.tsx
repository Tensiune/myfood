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
  ChevronDown
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

  const fetchOnlineFleetDrivers = useCallback(async () => {
      if (authorizedEmails.length === 0) {
          setAvailableFleetDrivers([]);
          return;
      }
      try {
          const { data: drivers } = await supabase
              .from('driver_applications')
              .select('id, email, full_name, metadata')
              .in('email', authorizedEmails)
              .eq('status', 'APPROVED');

          if (!drivers) return;
          const { data: locations } = await supabase
              .from('driver_locations')
              .select('driver_id')
              .gte('updated_at', new Date(Date.now() - 10 * 60000).toISOString());

          const activeIds = (locations || []).map(l => l.driver_id);
          const filtered = drivers.filter(d => activeIds.includes(d.id) && d.metadata?.is_exclusive === true);
          setAvailableFleetDrivers(filtered);
      } catch (err) {
          console.error("Error fetching fleet drivers:", err);
      }
  }, [authorizedEmails]);

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
        await supabase.functions.invoke('dispatch-order', { body: { orderId: order.id } });
      }
      if (localStorage.getItem('merchant_auto_print') === 'true') handlePrint(order);
      if (!isSilent) { dismissToast(tid); showSuccess("Pedido aceito!"); }
    } catch (err) { if (!isSilent) { dismissToast(tid); showError("Erro ao aceitar."); } }
  }, [handlePrint, merchantDeliveryMode]);

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
      const { data: raw, error } = await supabase.from('orders').select('*').eq('merchant_id', user.id).gte('created_at', dayAgo).order('created_at', { ascending: false });
      if (error) throw error;
      const cIds = Array.from(new Set((raw || []).map(o => o.customer_id).filter(Boolean)));
      const { data: profiles } = cIds.length > 0 ? await supabase.from('profiles').select('id, first_name, last_name').in('id', cIds) : { data: [] };
      setOrders((raw || []).map(o => ({
          ...o,
          customer_full_name: profiles?.find(p => p.id === o.customer_id) ? `${profiles.find(p => p.id === o.customer_id).first_name} ${profiles.find(p => p.id === o.customer_id).last_name}` : 'Cliente',
          delivery_address: o.delivery_address || {}
      })));
    } catch (err: any) { setFetchError(err.message); } finally { if (!isSilent) setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const chan = supabase.channel(`merchant_orders`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') playAlert();
        fetchOrders(true);
    }).subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [fetchOrders, playAlert]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(o => 
      o.id.toLowerCase().includes(term) || 
      o.customer_full_name.toLowerCase().includes(term) ||
      (o.delivery_address?.street || "").toLowerCase().includes(term) ||
      (o.delivery_address?.number || "").toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  const renderColumn = (title: string, color: string, statusList: string[]) => {
    const data = filteredOrders.filter(o => statusList.includes(o.status));
    return (
      <div className="space-y-4 flex flex-col min-h-[500px]">
        <h2 className={cn("font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-2", color)}>
          <span className={cn("h-2 w-2 rounded-full", color.replace('text-', 'bg-'))} />
          {title} ({data.length})
        </h2>
        <div className="space-y-4">
          {data.map(o => (
            <Card key={o.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between">
                    <span className="text-[10px] font-black text-gray-300">#{o.id.slice(0, 6)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedOrderDetails(o); setIsDetailsDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-800">{o.customer_full_name}</p>
                    <p className="text-[10px] text-gray-400 uppercase mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl flex items-start gap-2 text-xs text-gray-500">
                    <MapPin className="h-3.5 w-3.5 text-brand-accent mt-0.5 shrink-0" />
                    <p className="line-clamp-1">{o.delivery_type === 'pickup' ? 'Retirada' : `${o.delivery_address?.street}, ${o.delivery_address?.number}`}</p>
                </div>
                {o.status === 'PENDING' && <Button className="w-full bg-blue-600 rounded-xl" onClick={() => handleAcceptOrder(o)}>Aceitar</Button>}
                {o.status === 'PREPARING' && <Button className="w-full bg-orange-500 rounded-xl" onClick={() => supabase.from('orders').update({ status: o.delivery_type === 'pickup' ? 'READY_FOR_PICKUP' : 'WAITING_FOR_DRIVER' }).eq('id', o.id)}>Pronto</Button>}
                {o.status === 'DELIVERED' && <Button variant="outline" className="w-full rounded-xl text-indigo-600" onClick={() => navigate(`/chat/${o.customer_id}?orderId=${o.id}`)}><MessageCircle className="h-4 w-4 mr-2" /> Chat</Button>}
                {['READY_FOR_PICKUP', 'WAITING_FOR_DRIVER'].includes(o.status) && (
                   <Dialog>
                       <DialogTrigger asChild><Button className="w-full bg-green-600 rounded-xl">Validar Código</Button></DialogTrigger>
                       <DialogContent className="rounded-3xl p-6 space-y-4 text-center">
                           <DialogHeader><DialogTitle>Validar Código</DialogTitle></DialogHeader>
                           <OtpInput length={4} value={verificationCode} onChange={setVerificationCode} />
                           <Button className="w-full h-14" onClick={() => { if(verificationCode === o.confirmation_code) { supabase.from('orders').update({ status: o.status === 'READY_FOR_PICKUP' ? 'DELIVERED' : 'OUT_FOR_DELIVERY' }).eq('id', o.id).then(() => { setVerificationCode(""); fetchOrders(true); }); } else { showError("Incorreto"); } }}>Confirmar</Button>
                       </DialogContent>
                   </Dialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-indigo-900">Painel de Pedidos</h1>
            <p className="text-gray-500 text-sm">Busque por nome ou endereço para identificar pedidos.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full animate-pulse", isStoreOpen ? "bg-green-500" : "bg-red-500")} />
            <Switch checked={isStoreOpen} onCheckedChange={async (v) => { const { data } = await supabase.auth.getUser(); await supabase.from('merchant_applications').update({ is_open: v }).eq('id', data.user?.id); setIsStoreOpen(v); }} />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
        <Input placeholder="Buscar por cliente ou endereço..." className="rounded-2xl pl-12 h-14 bg-white border-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {loading ? <div className="py-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-indigo-600" /></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {renderColumn("Aceitar", "text-blue-600", ["PENDING"])}
          {renderColumn("Preparando", "text-orange-600", ["PREPARING"])}
          {renderColumn("Coleta/Retirada", "text-indigo-600", ["WAITING_FOR_DRIVER", "READY_FOR_PICKUP"])}
          {renderColumn("Em Rota", "text-yellow-600", ["OUT_FOR_DELIVERY"])}
          {renderColumn("Concluídos", "text-green-600", ["DELIVERED"])}
        </div>
      )}

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md h-[80vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 bg-indigo-900 text-white shrink-0"><h3 className="font-bold">Detalhes</h3></div>
          <ScrollArea className="flex-1 p-6 bg-white">
            {selectedOrderDetails && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-3xl border border-dashed border-gray-200 flex justify-center">
                    <OrderReceipt order={selectedOrderDetails} merchantName={merchantName} customerName={selectedOrderDetails.customer_full_name} printSettings={printSettings} />
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Ações Rápidas</p>
                    <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate(`/chat/${selectedOrderDetails.customer_id}?orderId=${selectedOrderDetails.id}`)}><MessageCircle className="h-4 w-4 mr-2" /> Falar com Cliente</Button>
                    <Button variant="outline" className="w-full rounded-xl" onClick={() => handlePrint(selectedOrderDetails)}><Printer className="h-4 w-4 mr-2" /> Reimprimir Comanda</Button>
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