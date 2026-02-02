"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Navigation, Key, Loader2, Store, User, CheckCircle2, Map, ExternalLink, List, AlertTriangle, MapPin } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { cn } from "@/lib/utils";

const NavigationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

        // Sintaxe de consulta mais segura usando múltiplos .neq
        const { data, error } = await supabase
            .from('orders')
            .select('*, merchant:merchant_applications(*)')
            .eq('driver_id', user.id)
            .neq('status', 'DELIVERED')
            .neq('status', 'CANCELLED');

        if (error) throw error;
        setOrders(data || []);
      } catch (err: any) {
        console.error("[NavigationPage] Error:", err);
        showError("Erro ao carregar sua rota ativa.");
      } finally {
        setLoading(false);
      }
    };
    fetchActiveOrders();

    const channel = supabase.channel('navigation_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchActiveOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  // Lógica de Paradas com Proteção Máxima contra nulos
  const stops = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    try {
        // Coleta (Pickups)
        const pickups = orders
            .filter(o => o && (o.status === 'PREPARING' || o.status === 'WAITING_FOR_DRIVER'))
            .map(o => {
                const meta = o.merchant?.metadata || {};
                const addr = meta.store_details?.address || meta.address || { street: "Endereço não informado", number: "" };
                return {
                    type: 'pickup',
                    orderId: o.id,
                    name: o.merchant?.store_name || "Loja Parceira",
                    address: addr,
                    isReady: o.status === 'WAITING_FOR_DRIVER'
                };
            });

        // Entregas (Deliveries)
        const deliveries = orders
            .filter(o => o && o.status === 'OUT_FOR_DELIVERY')
            .map(o => ({
                type: 'delivery',
                orderId: o.id,
                name: "Cliente",
                address: o.delivery_address || { street: "Endereço não informado", number: "" },
                code: o.confirmation_code
            }));

        return [...pickups, ...deliveries];
    } catch (e) {
        console.error("[NavigationPage] Erro ao calcular paradas:", e);
        return [];
    }
  }, [orders]);

  const handleFinishStep = async (stop: any) => {
    if (stop.type === 'delivery' && otpCode !== stop.code) {
        showError("Código incorreto. Peça ao cliente o código de 4 dígitos.");
        return;
    }

    const nextStatus = stop.type === 'pickup' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
    const tid = showLoading("Atualizando status...");
    
    try {
        const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', stop.orderId);
        if (error) throw error;

        showSuccess(stop.type === 'pickup' ? "Retirada confirmada!" : "Entrega finalizada!");
        setOtpCode("");
    } catch (err: any) {
        showError("Erro: " + err.message);
    } finally {
        dismissToast(tid);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
        <p className="text-gray-500 font-bold">Organizando sua rota...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/orders")} className="rounded-full"><ArrowLeft /></Button>
        <h1 className="text-xl font-black text-indigo-900">Minha Rota</h1>
        <div className="w-10" />
      </div>

      <div className="space-y-4">
        {stops.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Sem entregas ativas</h2>
                <p className="text-gray-500 mt-2">Você concluiu todas as paradas ou ainda não aceitou pedidos.</p>
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
                    </div>
                    <CardContent className="p-6 space-y-4 bg-white">
                        <div>
                            <h3 className="font-black text-lg text-gray-900">{stop.name}</h3>
                            <p className="text-sm text-gray-500 flex items-start gap-2 mt-2">
                                <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" /> 
                                {stop.address?.street}, {stop.address?.number}
                            </p>
                        </div>

                        {index === 0 && (
                            <div className="pt-2">
                                {stop.type === 'delivery' ? (
                                    <div className="space-y-4">
                                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                                            <p className="text-xs font-bold text-green-800 text-center uppercase tracking-widest mb-3">Código do Cliente</p>
                                            <div className="flex justify-center"><OtpInput length={4} value={otpCode} onChange={setOtpCode} /></div>
                                        </div>
                                        <Button className="w-full bg-green-600 hover:bg-green-700 h-16 rounded-2xl font-black text-lg shadow-xl shadow-green-100" onClick={() => handleFinishStep(stop)} disabled={otpCode.length < 4}>Confirmar Entrega</Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {!stop.isReady && (
                                            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                                <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                                                <p className="text-sm text-orange-800 font-medium">Aguardando a loja liberar...</p>
                                            </div>
                                        )}
                                        <Button 
                                            className={cn("w-full h-16 rounded-2xl font-black text-lg shadow-xl", stop.isReady ? "bg-indigo-600 text-white shadow-indigo-100" : "bg-gray-100 text-gray-400 shadow-none")} 
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