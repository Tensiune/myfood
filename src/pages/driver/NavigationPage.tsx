"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Store, User, CheckCircle2, MapPin, AlertTriangle } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";
import { cn } from "@/lib/utils";

const NavigationPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpCode, setOtpCode] = useState("");
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        console.log("[NavigationPage] DEBUG: Iniciando busca de pedidos...");
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.warn("[NavigationPage] DEBUG: Usuário não autenticado");
            navigate("/login");
            return;
        }

        // Simplificando a consulta para ser o mais estável possível
        const { data, error } = await supabase
            .from('orders')
            .select('*, merchant:merchant_applications(*)')
            .eq('driver_id', user.id);

        if (error) {
            console.error("[NavigationPage] DEBUG: Erro na consulta Supabase", error);
            throw error;
        }

        // Filtra no cliente para garantir que a sintaxe SQL não seja o problema
        const active = (data || []).filter(o => 
            o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
        );

        console.log("[NavigationPage] DEBUG: Pedidos ativos encontrados:", active.length, active);
        setOrders(active);
      } catch (err: any) {
        console.error("[NavigationPage] FATAL ERROR:", err);
        setRenderError(err.message || "Erro desconhecido ao carregar rota.");
        showError("Falha crítica ao carregar rota.");
      } finally {
        setLoading(false);
      }
    };

    fetchActiveOrders();

    const channel = supabase.channel('nav_monitor')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        console.log("[NavigationPage] DEBUG: Atualização recebida via Realtime", payload);
        fetchActiveOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  // Processamento das paradas com Try/Catch para evitar tela em branco
  const stops = useMemo(() => {
    try {
        if (!orders || orders.length === 0) return [];

        const result: any[] = [];

        // Adiciona Coletas
        orders.forEach(o => {
            if (['PREPARING', 'WAITING_FOR_DRIVER', 'PENDING'].includes(o.status)) {
                const meta = o.merchant?.metadata || {};
                const addr = meta.store_details?.address || meta.address || {};
                
                result.push({
                    type: 'pickup',
                    orderId: o.id,
                    name: o.merchant?.store_name || "Loja Parceira",
                    address: {
                        street: addr.street || "Endereço da Loja",
                        number: addr.number || ""
                    },
                    isReady: o.status === 'WAITING_FOR_DRIVER'
                });
            }
        });

        // Adiciona Entregas
        orders.forEach(o => {
            if (o.status === 'OUT_FOR_DELIVERY') {
                result.push({
                    type: 'delivery',
                    orderId: o.id,
                    name: "Cliente",
                    address: o.delivery_address || { street: "Endereço do Cliente", number: "" },
                    code: o.confirmation_code
                });
            }
        });

        return result;
    } catch (e) {
        console.error("[NavigationPage] DEBUG: Erro ao processar paradas (stops)", e);
        return [];
    }
  }, [orders]);

  const handleFinishStep = async (stop: any) => {
    if (stop.type === 'delivery' && otpCode !== stop.code) {
        showError("Código de confirmação inválido.");
        return;
    }

    const nextStatus = stop.type === 'pickup' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
    const tid = showLoading("Atualizando...");
    
    try {
        const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', stop.orderId);
        if (error) throw error;
        showSuccess("Status atualizado!");
        setOtpCode("");
    } catch (err: any) {
        showError("Erro ao atualizar: " + err.message);
    } finally {
        dismissToast(tid);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10 mb-4" />
        <p className="text-gray-500 font-bold">Carregando sua rota...</p>
      </div>
    );
  }

  if (renderError) {
      return (
          <div className="p-8 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="font-bold text-lg">Ops! Ocorreu um erro</h2>
              <p className="text-sm text-gray-500">{renderError}</p>
              <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver/orders")} className="rounded-full">
            <ArrowLeft />
        </Button>
        <h1 className="text-xl font-black text-indigo-900">Minha Rota</h1>
        <div className="w-10" />
      </div>

      <div className="space-y-4">
        {stops.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800">Tudo limpo por aqui!</h2>
                <p className="text-gray-500 mt-2 text-sm">Você não tem paradas pendentes no momento.</p>
                <Button className="mt-8 rounded-2xl bg-indigo-600 w-full h-14 font-bold" onClick={() => navigate("/driver/orders")}>
                    Ver Novos Pedidos
                </Button>
            </div>
        ) : (
            stops.map((stop, index) => (
                <Card 
                    key={`${stop.orderId}-${index}`} 
                    className={cn(
                        "rounded-[2.5rem] border-none shadow-sm overflow-hidden transition-all duration-300", 
                        index === 0 ? "ring-2 ring-indigo-600 scale-[1.01]" : "opacity-60 grayscale-[0.3]"
                    )}
                >
                    <div className={cn(
                        "p-4 text-white flex items-center justify-between px-8", 
                        stop.type === 'pickup' ? "bg-indigo-600" : "bg-green-600"
                    )}>
                        <div className="flex items-center gap-3">
                            {stop.type === 'pickup' ? <Store className="h-5 w-5" /> : <User className="h-5 w-5" />}
                            <span className="text-xs font-black uppercase tracking-widest">
                                {index === 0 ? "Próxima Parada" : `Parada ${index + 1}`}
                            </span>
                        </div>
                    </div>
                    <CardContent className="p-8 space-y-6 bg-white">
                        <div>
                            <h3 className="font-black text-xl text-gray-900">{stop.name}</h3>
                            <div className="flex items-start gap-2 mt-3 text-gray-500">
                                <MapPin className="h-5 w-5 text-brand-accent shrink-0 mt-0.5" />
                                <p className="text-sm font-medium">
                                    {stop.address?.street}, {stop.address?.number}
                                </p>
                            </div>
                        </div>

                        {index === 0 && (
                            <div className="pt-4 animate-in slide-in-from-bottom-4">
                                {stop.type === 'delivery' ? (
                                    <div className="space-y-6">
                                        <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                                            <p className="text-xs font-bold text-green-800 text-center uppercase tracking-widest mb-4">Código de 4 dígitos do Cliente</p>
                                            <div className="flex justify-center"><OtpInput length={4} value={otpCode} onChange={setOtpCode} /></div>
                                        </div>
                                        <Button className="w-full bg-green-600 hover:bg-green-700 h-16 rounded-2xl font-black text-lg shadow-xl" onClick={() => handleFinishStep(stop)} disabled={otpCode.length < 4}>
                                            Finalizar Entrega
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {!stop.isReady && (
                                            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                                <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                                                <p className="text-sm text-orange-800 font-bold">Aguardando a loja preparar...</p>
                                            </div>
                                        )}
                                        <Button 
                                            className={cn("w-full h-16 rounded-2xl font-black text-lg shadow-xl transition-all", stop.isReady ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400")} 
                                            onClick={() => handleFinishStep(stop)}
                                            disabled={!stop.isReady}
                                        >
                                            {stop.isReady ? "Confirmar Retirada" : "Aguardando Loja"}
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