"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Navigation, Key, Loader2, Store, User, CheckCircle2, Map, ExternalLink, List } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";

const NavigationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentOrderId = searchParams.get("orderId");
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpCode, setOtpCode] = useState("");
  const { currentLocation } = useDriverLocationTracker(true);

  useEffect(() => {
    const fetchActiveOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('orders').select('*, merchant:merchant_applications(*)').eq('driver_id', user.id).not('status', 'in', '(DELIVERED,CANCELLED)');
      setOrders(data || []);
      setLoading(false);
    };
    fetchActiveOrders();
  }, []);

  // Lógica de Priorização de Paradas (Simplificada: Primeiro Coletas, depois Entregas)
  const stops = useMemo(() => {
    const pickps = orders.filter(o => o.status === 'PREPARING' || o.status === 'WAITING_FOR_DRIVER').map(o => ({
        type: 'pickup',
        orderId: o.id,
        name: o.merchant?.store_name,
        address: o.merchant?.metadata?.store_details?.address || o.merchant?.metadata?.address,
        isReady: o.status === 'WAITING_FOR_DRIVER'
    }));

    const deliveries = orders.filter(o => o.status === 'OUT_FOR_DELIVERY').map(o => ({
        type: 'delivery',
        orderId: o.id,
        name: "Cliente",
        address: o.delivery_address,
        code: o.confirmation_code
    }));

    return [...pickps, ...deliveries];
  }, [orders]);

  const openInExternalMaps = () => {
    if (stops.length === 0) return;
    
    const origin = `${currentLocation[0]},${currentLocation[1]}`;
    const destination = `${stops[stops.length - 1].address.lat},${stops[stops.length - 1].address.lng}`;
    
    // Paradas intermediárias
    const waypoints = stops.slice(0, -1).map(s => `${s.address.lat},${s.address.lng}`).join('|');
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleFinishStep = async (stop: any) => {
    if (stop.type === 'delivery' && otpCode !== stop.code) {
        showError("Código incorreto.");
        return;
    }

    const nextStatus = stop.type === 'pickup' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
    const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', stop.orderId);
    
    if (!error) {
        showSuccess(stop.type === 'pickup' ? "Retirada confirmada!" : "Entrega finalizada!");
        setOtpCode("");
        // Refresh local
        const { data } = await supabase.from('orders').select('*, merchant:merchant_applications(*)').eq('id', stop.orderId).single();
        setOrders(prev => prev.map(o => o.id === stop.orderId ? {...o, ...data} : o).filter(o => o.status !== 'DELIVERED'));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/orders")}><ArrowLeft /></Button>
        <h1 className="text-xl font-bold text-indigo-900">Minha Rota</h1>
        <Button variant="outline" className="rounded-xl border-indigo-200 text-indigo-600 gap-2" onClick={openInExternalMaps}>
            <ExternalLink className="h-4 w-4" /> Google Maps
        </Button>
      </div>

      <div className="space-y-4">
        {stops.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="font-bold text-gray-500">Rota concluída!</p>
                <Button className="mt-4 rounded-xl" onClick={() => navigate("/driver/orders")}>Voltar para o Radar</Button>
            </div>
        ) : (
            stops.map((stop, index) => (
                <Card key={`${stop.orderId}-${index}`} className={cn("rounded-3xl border-none shadow-sm overflow-hidden", index === 0 ? "ring-2 ring-indigo-600" : "opacity-60")}>
                    <div className={cn("p-3 text-white flex items-center gap-2", stop.type === 'pickup' ? "bg-indigo-600" : "bg-green-600")}>
                        {stop.type === 'pickup' ? <Store className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{index === 0 ? "Próxima Parada" : `Parada ${index + 1}`}</span>
                    </div>
                    <CardContent className="p-5 space-y-4">
                        <div>
                            <h3 className="font-black text-gray-900">{stop.name}</h3>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {stop.address.street}, {stop.address.number}</p>
                        </div>

                        {index === 0 && (
                            <div className="pt-2">
                                {stop.type === 'delivery' ? (
                                    <div className="space-y-4">
                                        <p className="text-xs font-bold text-gray-400 uppercase text-center">Código de Confirmação</p>
                                        <div className="flex justify-center"><OtpInput length={4} value={otpCode} onChange={setOtpCode} /></div>
                                        <Button className="w-full bg-green-600 h-14 rounded-2xl font-bold" onClick={() => handleFinishStep(stop)} disabled={otpCode.length < 4}>Confirmar Entrega</Button>
                                    </div>
                                ) : (
                                    <Button 
                                        className={cn("w-full h-14 rounded-2xl font-bold", stop.isReady ? "bg-indigo-600" : "bg-gray-100 text-gray-400")} 
                                        onClick={() => handleFinishStep(stop)}
                                        disabled={!stop.isReady}
                                    >
                                        {stop.isReady ? "Confirmar Retirada" : "Aguardando Preparo..."}
                                    </Button>
                                )
                                }
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))
        )}
      </div>
    </div>
  );
};

export default NavigationPage;