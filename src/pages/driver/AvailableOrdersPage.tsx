"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  MapPin, 
  Store, 
  ShoppingBag, 
  Clock, 
  Phone, 
  MessageCircle, 
  XCircle, 
  AlertTriangle, 
  Power, 
  User,
  ChevronRight
} from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useNativeNotifications } from "@/hooks/useNativeNotifications";
import { cn } from "@/lib/utils";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const { sendNotification } = useNativeNotifications();
  
  const lastOfferIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => { 
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL); 
    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const playAlert = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const sync = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Sincronizar Ofertas (Nova Entrega)
    const { data: offers } = await supabase
        .from('orders')
        .select('*, merchant:merchant_applications(*)')
        .eq('current_driver_offered_id', user.id)
        .is('driver_id', null)
        .neq('status', 'CANCELLED');
    
    if (offers && offers.length > 0) {
      const activeOffer = offers[0];
      if (activeOffer.id !== lastOfferIdRef.current) {
          const expiresAt = new Date(activeOffer.offer_expires_at).getTime();
          const initialTime = Math.floor((expiresAt - Date.now()) / 1000);
          
          if (initialTime > 0) {
              setTimeLeft(initialTime);
              lastOfferIdRef.current = activeOffer.id;
              playAlert();
              sendNotification("Nova Oportunidade!", `Ganhos estimados: R$ ${activeOffer.total.toFixed(2)}`);
          } else {
              setOffer(null);
          }
      }
      setOffer(activeOffer);
    } else {
      setOffer(null);
      lastOfferIdRef.current = null;
    }

    // 2. Sincronizar Pedidos em Andamento com Detalhes do Cliente
    const { data: accepted } = await supabase
        .from('orders')
        .select('*, merchant:merchant_applications(*)')
        .eq('driver_id', user.id)
        .not('status', 'in', '(DELIVERED,CANCELLED)');
    
    if (accepted) {
        const ordersWithCustomer = await Promise.all(accepted.map(async (order) => {
            const { data: customerName } = await supabase.rpc('get_user_full_name', { user_id: order.customer_id });
            return { ...order, customer_name: customerName || "Cliente" };
        }));
        setActiveOrders(ordersWithCustomer);
    }
    
    setLoading(false);
  }, [playAlert, sendNotification]);

  useEffect(() => {
    if (offer && timeLeft > 0) {
        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setOffer(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [offer, timeLeft]);

  useEffect(() => {
    const checkStatus = () => setIsOnline(localStorage.getItem('driver_online_status') === 'online');
    checkStatus();
    
    const interval = setInterval(() => {
        if (localStorage.getItem('driver_online_status') === 'online') sync();
    }, 5000);
    
    sync();
    return () => clearInterval(interval);
  }, [sync]);

  const handleAccept = async () => {
    if (!offer) return;
    const tid = showLoading("Confirmando...");
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { data, error } = await supabase
            .from('orders')
            .update({ driver_id: user.id, current_driver_offered_id: null, offer_expires_at: null })
            .eq('id', offer.id)
            .is('driver_id', null)
            .select();

        if (error) throw error;
        if (data && data.length > 0) {
            showSuccess("Pedido aceito!");
            navigate(`/driver/map?orderId=${offer.id}`);
        } else {
            showError("Oferta expirada.");
            setOffer(null);
        }
    } catch (err: any) {
        showError("Erro ao aceitar.");
    } finally {
        dismissToast(tid);
    }
  };

  const handleAbandon = async (orderId: string) => {
    if (!window.confirm("Tem certeza que deseja abandonar esta rota? Você poderá ser penalizado por cancelamentos frequentes.")) return;
    
    const tid = showLoading("Cancelando sua participação...");
    try {
        const { error } = await supabase.rpc('abandon_order', { p_order_id: orderId });
        if (error) throw error;
        showSuccess("Rota abandonada com sucesso.");
        sync();
    } catch (err: any) {
        showError("Erro ao abandonar: " + err.message);
    } finally {
        dismissToast(tid);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-indigo-900">Radar de Entregas</h1>
        {activeOrders.length > 0 && <Badge className="bg-indigo-600 rounded-full">{activeOrders.length} Ativo(s)</Badge>}
      </div>

      {activeOrders.length > 0 && (
        <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sua Rota Ativa</p>
            {activeOrders.map(order => (
                <Card key={order.id} className="rounded-3xl border-none shadow-md bg-white overflow-hidden animate-in slide-in-from-bottom-2">
                    <CardContent className="p-0">
                        <div className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-indigo-50 rounded-xl"><Store className="h-4 w-4 text-indigo-600" /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Loja</p>
                                        <p className="font-bold text-gray-800">{order.merchant?.store_name}</p>
                                    </div>
                                </div>
                                <Badge className={cn("rounded-full uppercase text-[9px]", order.status === 'OUT_FOR_DELIVERY' ? "bg-yellow-500" : "bg-indigo-600")}>
                                    {order.status === 'OUT_FOR_DELIVERY' ? "Em Rota" : "Coleta"}
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-green-50 rounded-xl"><User className="h-4 w-4 text-green-600" /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Cliente</p>
                                    <p className="font-bold text-gray-800">{order.customer_name}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-2xl flex gap-3 items-start">
                                <MapPin className="h-4 w-4 text-brand-accent mt-0.5 shrink-0" />
                                <p className="text-xs text-gray-600 font-medium leading-tight">
                                    {order.delivery_address?.street}, {order.delivery_address?.number}<br/>
                                    <span className="text-[10px] text-gray-400">{order.delivery_address?.neighborhood} - {order.delivery_address?.city}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" className="rounded-xl border-gray-100 h-11 text-indigo-600 font-bold gap-2" onClick={() => navigate(`/chat/${order.merchant_id}`)}>
                                    <MessageCircle className="h-4 w-4" /> Chat Loja
                                </Button>
                                <Button variant="outline" className="rounded-xl border-gray-100 h-11 text-indigo-600 font-bold gap-2" onClick={() => window.open(`tel:${order.merchant?.phone}`)}>
                                    <Phone className="h-4 w-4" /> Ligar Loja
                                </Button>
                            </div>
                        </div>

                        <div className="px-4 pb-4 flex gap-2">
                            <Button 
                                variant="ghost" 
                                className="w-1/3 rounded-2xl text-red-400 hover:text-red-500 hover:bg-red-50 font-bold text-xs"
                                onClick={() => handleAbandon(order.id)}
                            >
                                <XCircle className="h-4 w-4 mr-1" /> Abandonar
                            </Button>
                            <Button 
                                className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest h-14 shadow-lg shadow-indigo-100"
                                onClick={() => navigate(`/driver/map?orderId=${order.id}`)}
                            >
                                Iniciar Navegação <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      {offer && timeLeft > 0 && (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center">
            <span className="font-black text-sm uppercase">Nova Oferta!</span>
            <div className="bg-white text-brand-accent px-4 py-1 rounded-full font-black text-xl tabular-nums">
                {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="p-2 bg-indigo-50 rounded-full h-fit"><Store className="h-4 w-4 text-indigo-600" /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Coleta Próxima</p>
                    <p className="font-bold text-gray-800">{offer.merchant?.store_name || "Loja Parceira"}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-2 bg-green-50 rounded-full h-fit"><MapPin className="h-4 w-4 text-green-600" /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Destino Final</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{offer.delivery_address?.neighborhood}, {offer.delivery_address?.city}</p>
                  </div>
                </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-red-500 font-bold" onClick={() => { setOffer(null); lastOfferIdRef.current = null; }}>Ignorar</Button>
              <Button className="flex-2 h-16 rounded-2xl bg-green-600 text-white font-black text-xl shadow-lg active:scale-95 transition-all" onClick={handleAccept}>ACEITAR</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isOnline && !offer && activeOrders.length < 3 && (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-200 mb-3" />
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Buscando as melhores rotas para você...</p>
        </div>
      )}

      {!isOnline && (
        <Card className="rounded-[2rem] border-none bg-indigo-900 text-white p-8 text-center">
            <Power className="h-12 w-12 mx-auto mb-4 text-indigo-300" />
            <h3 className="text-xl font-bold mb-2">Você está Offline</h3>
            <p className="text-indigo-200 text-sm mb-6">Fique online para começar a receber ofertas de entrega na sua região.</p>
        </Card>
      )}
    </div>
  );
};

export default AvailableOrdersPage;