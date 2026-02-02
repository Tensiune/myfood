"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Navigation, Key, Loader2, Store, User, CheckCircle2, Map, ExternalLink, List, AlertTriangle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { cn } from "@/lib/utils";

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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate("/login");
            return;
        }

        // Sintaxe corrigida para o filtro 'in' no Supabase JS
        const { data, error } = await supabase
            .from('orders')
            .select('*, merchant:merchant_applications(*)')
            .eq('driver_id', user.id)
            .not('status', 'in', '("DELIVERED","CANCELLED")');

        if (error) throw error;
        setOrders(data || []);
      } catch (err: any) {
        console.error("[NavigationPage] Fetch error:", err);
        showError("Erro ao carregar sua rota ativa.");
      } finally {
        setLoading(false);
      }
    };
    fetchActiveOrders();
  }, [navigate]);

  // Lógica de Priorização de Paradas com segurança contra nulos
  const stops = useMemo(() => {
    if (!orders.length) return [];

    const pickups = orders
        .filter(o => ['PREPARING', 'WAITING_FOR_DRIVER'].includes(o.status))
        .map(o => {
            const addr = o.merchant?.metadata?.store_details?.address || o.merchant?.metadata?.address;
            return {
                type: 'pickup',
                orderId: o.id,
                name: o.merchant?.store_name || "Loja",
                address: addr || { street: "Endereço não informado", number: "" },
                isReady: o.status === 'WAITING_FOR_DRIVER'
            };
        });

    const deliveries = orders
        .filter(o => o.status === 'OUT_FOR_DELIVERY')
        .map(o => ({
            type: 'delivery',
            orderId: o.id,
            name: "Cliente",
            address: o.delivery_address || { street: "Endereço não informado", number: "" },
            code: o.confirmation_code
        }));

    return [...pickups, ...deliveries];
  }, [orders]);

  const openInExternalMaps = () => {
    if (stops.length === 0) return;
    
    // Filtra apenas paradas com coordenadas válidas
    const validStops = stops.filter(s => s.address?.lat && s.address?.lng);
    if (validStops.length === 0) {
        showError("Coordenadas de destino não encontradas.");
        return;
    }

    const origin = currentLocation[0] !== 0 ? `${currentLocation[0]},${currentLocation[1]}` : "";
    const destination = `${validStops[validStops.length - 1].address.lat},${validStops[validStops.length - 1].address.lng}`;
    
    // Paradas intermediárias (waypoints)
    const waypoints = validStops.slice(0, -1).map(s => `${s.address.lat},${s.address.lng}`).join('|');
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleFinishStep = async (stop: any) => {
    if (stop.type === 'delivery' && otpCode !== stop.code) {
        showError("Código incorreto. Peça ao cliente o código de 4 dígitos.");
        return;
    }

    const nextStatus = stop.type === 'pickup' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
    
    try {
        const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', stop.orderId);
        if (error) throw error;

        showSuccess(stop.type === 'pickup' ? "Retirada confirmada!" : "Entrega finalizada com sucesso!");
        setOtpCode("");
        
        // Atualiza o estado local removendo ou atualizando o pedido
        if (nextStatus === 'DELIVERED') {
            setOrders(prev => prev.filter(o => o.id !== stop.orderId));
        } else {
            setOrders(prev => prev.map(o => o.id === stop.orderId ? { ...o, status: nextStatus } : o));
        }
    } catch (err: any) {
        showError("Erro ao atualizar status: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
        <p className="text-gray-500 font-bold">Calculando sua rota...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/orders")} className="rounded-full"><ArrowLeft /></Button>
        <h1 className="text-xl font-black text-indigo-900">Minha Rota</h1>
        <Button 
            variant="outline" 
            className="rounded-xl border-indigo-200 text-indigo-600 font-bold gap-2 hover:bg-indigo-50" 
            onClick={openInExternalMaps}
            disabled={stops.length === 0}
        >
            <ExternalLink className="h-4 w-4" /> GPS
        </Button>
      </div>

      <div className="space-y-4">
        {stops.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Tudo concluído!</h2>
                <p className="text-gray-500 mt-2">Você não possui entregas ativas no momento.</p>
                <Button className="mt-8 rounded-2xl bg-indigo-600 w-full h-14 font-bold" onClick={() => navigate("/driver/orders")}>Voltar para o Radar</Button>
            </div>
        ) : (
            stops.map((stop, index) => (
                <Card 
                    key={`${stop.orderId}-${index}`} 
                    className={cn(
                        "rounded-[2rem] border-none shadow-sm overflow-hidden transition-all duration-300", 
                        index === 0 ? "ring-2 ring-indigo-600 scale-[1.02]" : "opacity-50 grayscale-[0.5]"
                    )}
                >
                    <div className={cn(
                        "p-3 text-white flex items-center justify-between px-6", 
                        stop.type === 'pickup' ? "bg-indigo-600" : "bg-green-600"
                    )}>
                        <div className="flex items-center gap-2">
                            {stop.type === 'pickup' ? <Store className="h-4 w-4" /> : <User className="h-4 w-4" />}
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {index === 0 ? "Próxima Parada" : `Parada ${index + 1}`}
                            </span>
                        </div>
                        {index === 0 && <Badge className="bg-white/20 text-white border-none text-[9px] font-bold">EM ANDAMENTO</Badge>}
                    </div>
                    <CardContent className="p-6 space-y-4 bg-white">
                        <div>
                            <h3 className="font-black text-lg text-gray-900">{stop.name}</h3>
                            <p className="text-sm text-gray-500 flex items-start gap-2 mt-2">
                                <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" /> 
                                {stop.address.street}, {stop.address.number}
                                {stop.address.neighborhood && ` - ${stop.address.neighborhood}`}
                            </p>
                        </div>

                        {index === 0 && (
                            <div className="pt-2 animate-in slide-in-from-top-2">
                                {stop.type === 'delivery' ? (
                                    <div className="space-y-4">
                                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                                            <p className="text-xs font-bold text-green-800 text-center uppercase tracking-widest mb-3">Solicite o código ao cliente</p>
                                            <div className="flex justify-center"><OtpInput length={4} value={otpCode} onChange={setOtpCode} /></div>
                                        </div>
                                        <Button 
                                            className="w-full bg-green-600 hover:bg-green-700 h-16 rounded-2xl font-black text-lg shadow-xl shadow-green-100" 
                                            onClick={() => handleFinishStep(stop)} 
                                            disabled={otpCode.length < 4}
                                        >
                                            Confirmar Entrega
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {!stop.isReady && (
                                            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                                <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                                                <p className="text-sm text-orange-800 font-medium">Aguardando o lojista marcar como pronto...</p>
                                            </div>
                                        )}
                                        <Button 
                                            className={cn(
                                                "w-full h-16 rounded-2xl font-black text-lg shadow-xl transition-all", 
                                                stop.isReady 
                                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100" 
                                                    : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                                            )} 
                                            onClick={() => handleFinishStep(stop)}
                                            disabled={!stop.isReady}
                                        >
                                            {stop.isReady ? "Confirmar Retirada" : "Aguardando Preparo"}
                                        </Button>
                                    </div>
                                )}
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