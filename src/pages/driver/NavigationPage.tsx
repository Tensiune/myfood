"use client";

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Navigation, Phone, CheckCircle2, CornerUpRight, Key, Loader2, AlertTriangle } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/shared/OtpInput";

const NavigationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  
  const [step, setStep] = useState<"to_store" | "to_client" | "confirm">("to_store");
  const [order, setOrder] = useState<any>(null);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      const { data, error } = await supabase
        .from('orders')
        .select('*, merchant:merchant_id(*)')
        .eq('id', orderId)
        .single();
        
      if (error) {
        showError("Não foi possível carregar os dados da rota.");
        navigate("/driver/orders");
        return;
      }
      if (data) setOrder(data);
    };
    fetchOrder();
  }, [orderId, navigate]);

  const handleArrivedAtStore = () => {
    showSuccess("Você chegou na loja!");
    setStep("to_client");
  };

  const handleArrivedAtClient = () => {
    setStep("confirm");
  };

  const handleAbandonDelivery = async () => {
    const confirmMessage = "⚠️ AVISO IMPORTANTE:\n\nTem certeza que deseja desistir desta entrega? \n\nAbandonar rotas em andamento pode fazer com que você deixe de ser priorizado em ofertas de próximas entregas pelo sistema.";
    
    if (!window.confirm(confirmMessage)) return;
    
    setCancelling(true);
    const tid = showLoading("Cancelando sua rota...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !order) throw new Error("Dados insuficientes para cancelar.");

      // 1. Atualizar o pedido: Remove o driver, limpa ofertas e adiciona na lista de recusados
      // Importante: fazemos o update completo em um único passo
      const currentRefused = order.refused_drivers_ids || [];
      const updatedRefused = Array.from(new Set([...currentRefused, user.id]));
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          driver_id: null,
          current_driver_offered_id: null,
          offer_expires_at: null,
          refused_drivers_ids: updatedRefused,
          status: 'PREPARING' // Volta para preparando para que o lojista veja que está sem entregador
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // 2. Chamar a Edge Function para tentar despachar para outro entregador imediatamente
      // Usamos invoke de forma assíncrona (não precisamos esperar o resultado aqui para liberar o app)
      supabase.functions.invoke('dispatch-order', { body: { orderId: order.id } });

      dismissToast(tid);
      showSuccess("Você abandonou a entrega.");
      navigate("/driver/orders");
    } catch (err: any) {
      console.error("Erro ao cancelar:", err);
      dismissToast(tid);
      showError("Erro ao desistir da entrega. Tente novamente.");
    } finally {
      setCancelling(false);
    }
  };

  const handleVerifyCode = async () => {
    if (otpCode !== order?.confirmation_code) {
      showError("Código incorreto. Peça ao cliente os 4 últimos dígitos do celular.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('orders').update({ status: 'DELIVERED' }).eq('id', order.id);
      if (error) throw error;
      
      showSuccess("Entrega concluída com sucesso! Parabéns.");
      navigate("/driver/orders");
    } catch (err: any) {
      showError("Erro ao finalizar entrega.");
    } finally {
      setLoading(false);
    }
  };

  if (!order) return <div className="p-20 text-center text-indigo-600 font-bold">Carregando rota segura...</div>;

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-50 overflow-hidden max-w-2xl mx-auto">
      {/* HUD Superior */}
      <div className="p-6 bg-indigo-600 text-white z-20 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
              {step === "confirm" ? <Key className="h-10 w-10" /> : <CornerUpRight className="h-10 w-10" />}
            </div>
            <div>
              <h2 className="text-2xl font-black">
                {step === "to_store" ? "Ir para Loja" : step === "to_client" ? "Ir para Cliente" : "Validar Código"}
              </h2>
              <p className="text-indigo-100 font-bold uppercase text-[10px]">
                {step === "to_store" ? order.merchant?.store_name : "Finalizar Entrega"}
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10 rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-slate-800 flex flex-col items-center justify-center p-6">
        {step === "confirm" ? (
          <div className="bg-white w-full rounded-[2.5rem] p-8 space-y-6 text-center animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-indigo-900">Código de Entrega</h3>
            <p className="text-gray-500 text-sm">Peça ao cliente os 4 últimos dígitos do celular dele.</p>
            <div className="flex justify-center">
               <OtpInput length={4} value={otpCode} onChange={setOtpCode} />
            </div>
            <Button 
              className="w-full h-16 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-lg"
              onClick={handleVerifyCode}
              disabled={otpCode.length < 4 || loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Confirmar Entrega"}
            </Button>
            <Button variant="ghost" className="text-gray-400" onClick={() => setStep("to_client")}>Voltar ao Mapa</Button>
          </div>
        ) : (
          <div className="w-full h-full relative">
             <Navigation className="h-12 w-12 text-white fill-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
        )}
      </div>

      {step !== "confirm" && (
        <div className="p-6 bg-white rounded-t-[2.5rem] z-20 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between items-start">
            <div>
              <Badge className={step === "to_store" ? "bg-orange-500" : "bg-indigo-600"}>
                {step === "to_store" ? "Retirada" : "Entrega"}
              </Badge>
              <h3 className="text-xl font-black text-gray-900 mt-2">
                {step === "to_store" ? order.merchant?.store_name : "Endereço do Cliente"}
              </h3>
              <p className="text-gray-500 text-sm">
                {step === "to_store" ? `${order.merchant?.metadata?.address?.street || ''}, ${order.merchant?.metadata?.address?.number || ''}` : `${order.delivery_address?.street || ''}, ${order.delivery_address?.number || ''}`}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              className="w-full h-16 rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-100"
              onClick={step === "to_store" ? handleArrivedAtStore : handleArrivedAtClient}
            >
              {step === "to_store" ? "Cheguei na Loja" : "Cheguei no Cliente"}
            </Button>

            {step === "to_store" && (
              <Button 
                variant="destructive"
                className="w-full h-12 rounded-xl font-bold bg-red-500 hover:bg-red-600 border-none flex items-center justify-center gap-2"
                onClick={handleAbandonDelivery}
                disabled={cancelling}
              >
                <AlertTriangle className="h-4 w-4" /> Desistir da Entrega
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationPage;