"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Loader2, Bike, AlertTriangle, TrendingUp, RefreshCcw, MapPin, CheckCircle2, ShieldAlert } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { cn } from "@/lib/utils";

const AvailableOrdersPage = () => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState<any>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  
  const channelRef = useRef<any>(null);
  const pollingRef = useRef<any>(null);

  const { isTracking, currentLocation } = useDriverLocationTracker(true);

  const checkNewOffers = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, merchant:merchant_id(*)')
        .eq('current_driver_offered_id', uid)
        .is('driver_id', null)
        .select(); // Usando select comum para evitar erros de maybeSingle

      if (error) throw error;

      if (data && data.length > 0) {
        const activeOffer = data[0];
        const expiresAt = new Date(activeOffer.offer_expires_at).getTime();
        const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        
        if (diff > 0) {
          setOffer(activeOffer);
          setTimeLeft(diff);
        } else {
          setOffer(null);
        }
      } else {
        setOffer(null);
      }
    } catch (err) {
      console.error("[Radar] Erro:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setDriverId(user.id);

      const { data: stats } = await supabase.from('driver_applications').select('*').eq('id', user.id).single();
      setDriverStats(stats);

      await checkNewOffers(user.id);

      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => checkNewOffers(user.id), 8000);

      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = supabase.channel(`driver_radar_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => checkNewOffers(user.id))
        .subscribe();
    };

    initialize();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [navigate, checkNewOffers]);

  useEffect(() => {
    if (offer && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (offer && timeLeft === 0) { setOffer(null); }
  }, [offer, timeLeft]);

  const handleAccept = async () => {
    if (!driverId || !offer) return;
    try {
      const { data, error } = await supabase.from('orders').update({
        driver_id: driverId,
        current_driver_offered_id: null,
        offer_expires_at: null,
        status: 'WAITING_FOR_DRIVER'
      }).eq('id', offer.id).is('driver_id', null).select();

      if (error || !data || data.length === 0) {
        showError("Oferta não disponível.");
        setOffer(null);
        return;
      }
      showSuccess("Aceito!");
      navigate(`/driver/map?orderId=${offer.id}`);
    } catch (err) { showError("Erro!"); }
  };

  const handleReject = async () => {
    if (!driverId || !offer) return;
    const newRefused = [...(offer.refused_drivers_ids || []), driverId];
    setOffer(null);
    await supabase.from('orders').update({ current_driver_offered_id: null, refused_drivers_ids: newRefused }).eq('id', offer.id);
    supabase.functions.invoke('dispatch-order', { body: { orderId: offer.id } });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black text-indigo-900">Radar</h1>
        <div className="flex items-center gap-2">
           <Badge className={cn(driverStats?.status === 'APPROVED' ? "bg-green-500" : "bg-orange-500")}>
             {driverStats?.status === 'APPROVED' ? 'Aprovado' : 'Em Análise'}
           </Badge>
        </div>
      </div>

      {/* Diagnóstico de GPS e Sistema */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", isTracking ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase">GPS</p>
            <p className="text-xs font-bold">{isTracking ? "Ativo" : "Erro"}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", driverStats?.status === 'APPROVED' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600")}>
            {driverStats?.status === 'APPROVED' ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase">Conta</p>
            <p className="text-xs font-bold">{driverStats?.status === 'APPROVED' ? "Liberada" : "Bloqueada"}</p>
          </div>
        </div>
      </div>
      
      {offer ? (
        <Card className="rounded-[2.5rem] border-4 border-brand-accent shadow-2xl bg-white overflow-hidden animate-in zoom-in-95">
          <div className="bg-brand-accent p-4 text-white flex justify-between items-center">
            <span className="font-black text-sm uppercase">Oferta Exclusiva</span>
            <div className="bg-white text-brand-accent px-4 py-1 rounded-full font-black text-xl">0:{timeLeft < 10 ? '0' : ''}{timeLeft}</div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <span className="font-black text-xl text-gray-900">{offer.merchant?.store_name}</span>
              <span className="text-2xl font-black text-green-600">R$ {(offer.total * 0.15 + 5).toFixed(2)}</span>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-16 rounded-2xl text-red-500 font-bold" onClick={handleReject}>Recusar</Button>
              <Button className="flex-2 h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xl" onClick={handleAccept}>ACEITAR</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-indigo-50">
          <Loader2 className="h-10 w-10 text-indigo-200 animate-spin mb-4" />
          <p className="text-gray-400 font-black uppercase text-[10px] text-center">
            {driverStats?.status !== 'APPROVED' 
              ? "Aguarde a aprovação do Admin para receber pedidos." 
              : "Buscando entregas num raio de 100km..."}
          </p>
        </div>
      )}
    </div>
  );
};

export default AvailableOrdersPage;