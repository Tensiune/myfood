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
  ChevronRight,
  PhoneCall,
  UserCheck
} from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useNativeNotifications } from "@/hooks/useNativeNotifications";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, []);

  const playAlert = useCallback(() => {
    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
  }, []);

  const sync = useCallback(async () => {
    if (!user) return;
    const { data: offers } = await supabase.from('orders').select('*, merchant:merchant_applications(*)').eq('current_driver_offered_id', user.id).is('driver_id', null).neq('status', 'CANCELLED');
    
    if (offers && offers.length > 0) {
      const activeOffer = offers[0];
      const expiresAt = new Date(activeOffer.offer_expires_at).getTime();
      const initialTime = Math.floor((expiresAt - Date.now()) / 1000);
      if (initialTime > 0) {
          if (activeOffer.id !== lastOfferIdRef.current) {
              lastOfferIdRef.current = activeOffer.id;
              playAlert();
              sendNotification("Nova Entrega!", `R$ ${activeOffer.total.toFixed(2)}`);
          }
          setTimeLeft(initialTime); setOffer(activeOffer);
      } else { setOffer(null); lastOfferIdRef.current = null; }
    } else { setOffer(null); lastOfferIdRef.current = null; }

    const { data: accepted } = await supabase.from('orders').select('*, merchant:merchant_applications(*)').eq('driver_id', user.id).not('status', 'in', '(DELIVERED,CANCELLED)');
    if (accepted) {
        const ordersWithCustomer = await Promise.all(accepted.map(async (order) => {
            const { data: customerName } = await supabase.rpc('get_user_full_name', { user_id: order.customer_id });
            return { ...order, customer_name: customerName || "Cliente" };
        }));
        setActiveOrders(ordersWithCustomer);
    }
    setLoading(false);
  }, [user, playAlert, sendNotification]);

  useEffect(() => {
    const checkStatus = () => setIsOnline(localStorage.getItem('driver_online_status') === 'online');
    checkStatus();
    const interval = setInterval(() => { if (localStorage.getItem('driver_online_status') === 'online') sync(); }, 8000);
    sync(); return () => clearInterval(interval);
  }, [sync]);

  useEffect(() => {
    if (offer && timeLeft > 0) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => { setTimeLeft(prev => prev <= 1 ? 0 : prev - 1); }, 1000);
    }
  }, [offer, timeLeft]);

  const handleAccept = async () => {
    if (!offer || !user) return;
    const tid = showLoading("Confirmando...");
    try {
        const updateData: any = { 
            driver_id: user.id, 
            current_driver_offered_id: null, 
            offer_expires_at: null 
        };
        
        // Se for frota própria, pula a coleta e vai direto para Em Rota
        if (offer.logistics_mode === 'OWN') {
            updateData.status = 'OUT_FOR_DELIVERY';
        }

        const { data, error } = await supabase.from('orders').update(updateData).eq('id', offer.id).is('driver_id', null).select();
        if (error) throw error;
        if (data && data.length > 0) {
            showSuccess("Pedido aceito!"); navigate(`/driver/map?orderId=${offer.id}`);
        } else { showError("Oferta expirada."); setOffer(null); }
    } catch (err: any) { showError("Erro ao aceitar."); } finally { dismissToast(tid); }
  };

  const handleAbandon = async (orderId: string) => {
    if (!window.confirm("Abandonar rota?")) return;
    const tid = showLoading("Processando...");
    try {
        const { error } = await supabase.rpc('abandon_order', { p_order_id: orderId });
        if (error) throw error;
        showSuccess("Rota abandonada."); sync();
    } catch (err: any) { showError("Erro ao abandonar."); } finally { dismissToast(tid); }
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
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-xl"><Store className="h-5 w-5 text-indigo-600" /></div>
                                    <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Loja</p><p className="font-bold text-gray-800">{order.merchant?.store_name}</p></div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" className="rounded-full bg-indigo-50 text-indigo-600 h-8 w-8" onClick={() => navigate(`/chat/${order.merchant_id}?orderId=${order.id}`)}><MessageCircle className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="rounded-full bg-indigo-50 text-indigo-600 h-8 w-8" asChild><a href={`tel:${order.merchant?.phone || ""}`}><PhoneCall className="h-4 w-4" /></a></Button>
                                </div>
                            </div>
                            <div className="flex justify-between items-start pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 rounded-xl"><User className="h-5 w-5 text-green-600" /></div>
                                    <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Cliente</p><p className="font-bold text-gray-800">{order.customer_name}</p></div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" className="rounded-full bg-green-50 text-green-600 h-8 w-8" onClick={() => navigate(`/chat/${order.customer_id}?orderId=${order.id}`)}><MessageCircle className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="rounded-full bg-green-50 text-green-600 h-8 w-8" asChild><a href={`tel:${order.delivery_address?.phone || ""}`}><PhoneCall className="h-4 w-4" /></a></Button>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-2xl flex gap-3 items-start"><MapPin className="h-4 w-4 text-brand-accent mt-0.5 shrink-0" /><p className="text-xs text-gray-600 font-medium leading-tight">{order.delivery_address?.street}, {order.delivery_address?.number}</p></div>
                        </div>
                        <div className="px-4 pb-4 flex gap-2">
                            <Button variant="ghost" className="w-1/3 text-red-400 font-bold text-xs" onClick={() => handleAbandon(order.id)}>Abandonar</Button>
                            <Button className="flex-1 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase h-14" onClick={() => navigate(`/driver/map?orderId=${order.id}`)}>Navegação <ChevronRight className="ml-1 h-4 w-4" /></Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      {offer && timeLeft > 0 && (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center"><span className="font-black text-sm uppercase">Nova Oferta!</span><div className="bg-white text-brand-accent px-4 py-1 rounded-full font-black text-xl tabular-nums">{timeLeft}s</div></div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="p-2 bg-indigo-50 rounded-full h-fit"><Store className="h-4 w-4 text-indigo-600" /></div>
                  <div className="flex-1"><p className="text-[10px] font-black text-gray-400 uppercase">Coleta Próxima</p><p className="font-bold text-gray-800">{offer.merchant?.store_name}</p></div>
                </div>
                {offer.logistics_mode === 'OWN' && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
                        <UserCheck className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase">Entrega Exclusiva do Lojista</span>
                    </div>
                )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-red-500 font-bold" onClick={() => { setOffer(null); lastOfferIdRef.current = null; }}>Ignorar</Button>
              <Button className="flex-2 h-16 rounded-2xl bg-green-600 text-white font-black text-xl" onClick={handleAccept}>ACEITAR</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isOnline && !offer && activeOrders.length < 3 && (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-200 mb-3" /><p className="text-gray-400 font-bold uppercase text-[10px]">Buscando rotas...</p>
        </div>
      )}

      {!isOnline && <Card className="rounded-[2rem] border-none bg-indigo-900 text-white p-8 text-center"><Power className="h-12 w-12 mx-auto mb-4 text-indigo-300" /><h3 className="text-xl font-bold mb-2">Você está Offline</h3><p className="text-indigo-200 text-sm">Fique online para começar a trabalhar.</p></Card>}
    </div>
  );
};

export default AvailableOrdersPage;