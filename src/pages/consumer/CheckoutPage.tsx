"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CreditCard, CheckCircle2, QrCode, Wallet, Truck, Loader2, Calendar, Clock, Store } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { usePayment } from "@/context/PaymentContext";
import { useAddresses } from "@/context/AddressContext";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const DELIVERY_FEE = 5.0;

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart, restaurantId } = useCart();
  const { selectedPaymentType } = usePayment();
  const { selectedAddress } = useAddresses();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"review" | "pix_payment" | "success">("review");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [scheduledTime, setScheduledTime] = useState<string>("");

  const subtotal = getTotal();
  const deliveryFee = deliveryType === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  const handleFinishOrder = async () => {
    if (deliveryType === "delivery" && !selectedAddress) {
      showError("Selecione um endereço de entrega.");
      return;
    }

    if (selectedPaymentType === "pix" && step !== "pix_payment") {
      setStep("pix_payment");
      return;
    }

    setIsProcessing(true);
    const tid = showLoading("Finalizando seu pedido...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Gera um código simples baseado no telefone ou fixo
      const phone = user.user_metadata?.phone || "0000";
      const code = phone.replace(/\D/g, "").slice(-4) || "1234";
      
      const acceptanceDeadline = (deliveryType === "delivery" && !scheduledTime)
        ? new Date(Date.now() + 8 * 60000).toISOString() 
        : null;

      const { error } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          merchant_id: restaurantId,
          items: items,
          total: Number(total.toFixed(2)),
          payment_method: selectedPaymentType,
          delivery_address: deliveryType === "delivery" ? selectedAddress : { street: "Retirada no Local", number: "S/N" },
          status: 'PENDING',
          confirmation_code: code,
          scheduled_at: scheduledTime || null,
          merchant_acceptance_deadline: acceptanceDeadline,
          delivery_type: deliveryType
        });

      if (error) throw error;

      dismissToast(tid);
      setStep("success");
      clearCart();
    } catch (err: any) {
      console.error("Checkout Error:", err);
      dismissToast(tid);
      setIsProcessing(false);
      showError("Erro ao processar pedido: " + (err.message || "Tente novamente"));
    }
  };

  const getScheduleOptions = () => {
    const options = [];
    const now = new Date();
    now.setMinutes(now.getMinutes() + 60);
    
    for (let i = 0; i < 20; i++) {
      const time = new Date(now.getTime() + i * 30 * 60000);
      options.push({
        label: time.toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
        value: time.toISOString()
      });
    }
    return options;
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 bg-white">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900">Pedido Realizado!</h1>
          <p className="text-gray-500">
            {deliveryType === "pickup" 
              ? "Seu pedido será preparado para retirada no local."
              : scheduledTime
              ? "Seu pedido foi agendado para entrega."
              : "O restaurante tem 8 minutos para aceitar seu pedido."}
          </p>
        </div>
        <Button className="w-full py-6 rounded-2xl bg-indigo-600 text-white font-bold" onClick={() => navigate("/orders")}>Acompanhar agora</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-gray-100"><ArrowLeft /></Button>
        <h1 className="text-2xl font-black text-indigo-900">Finalizar Pedido</h1>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Como você quer receber?</p>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setDeliveryType("delivery")}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
              deliveryType === "delivery" ? "border-brand-accent bg-brand-accent/5 text-brand-accent" : "border-gray-100 text-gray-400"
            )}
          >
            <Truck className="h-6 w-6" />
            <span className="font-bold text-sm">Entrega</span>
          </button>
          <button 
            onClick={() => setDeliveryType("pickup")}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
              deliveryType === "pickup" ? "border-brand-accent bg-brand-accent/5 text-brand-accent" : "border-gray-100 text-gray-400"
            )}
          >
            <Store className="h-6 w-6" />
            <span className="font-bold text-sm">Retirar no Local</span>
          </button>
        </div>
      </div>

      {deliveryType === "delivery" && (
        <div className="space-y-3 animate-in fade-in">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quando entregar?</p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setScheduledTime("")}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                !scheduledTime ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-gray-100 text-gray-400"
              )}
            >
              <Clock className="h-6 w-6" />
              <span className="font-bold text-sm">Pra já</span>
            </button>
            <button 
              onClick={() => setScheduledTime(getScheduleOptions()[0]?.value || "")}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                scheduledTime ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-gray-100 text-gray-400"
              )}
            >
              <Calendar className="h-6 w-6" />
              <span className="font-bold text-sm">Agendar</span>
            </button>
          </div>

          {scheduledTime && (
            <div className="animate-in slide-in-from-top-2">
              <Select value={scheduledTime} onValueChange={setScheduledTime}>
                <SelectTrigger className="h-14 rounded-2xl border-gray-200">
                  <SelectValue placeholder="Escolha um horário" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {getScheduleOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="space-y-5">
        <div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Resumo</p>
           <Card className="rounded-3xl p-5 border-none shadow-sm bg-white space-y-4">
             {deliveryType === "delivery" && selectedAddress ? (
               <div className="flex items-center gap-4 animate-in fade-in">
                 <div className="p-3 bg-indigo-50 rounded-2xl"><Truck className="text-indigo-600 h-5 w-5" /></div>
                 <div>
                    <p className="font-bold text-gray-800">{selectedAddress.street}, {selectedAddress.number}</p>
                    <p className="text-xs text-gray-500">Entrega padrão</p>
                 </div>
               </div>
             ) : (
               <div className="flex items-center gap-4 animate-in fade-in">
                 <div className="p-3 bg-indigo-50 rounded-2xl"><Store className="text-indigo-600 h-5 w-5" /></div>
                 <div>
                    <p className="font-bold text-gray-800">Retirada no Local</p>
                    <p className="text-xs text-gray-500">Sem taxa de entrega</p>
                 </div>
               </div>
             )}
             <div className="flex items-center gap-4">
               <div className="p-3 bg-green-50 rounded-2xl"><CreditCard className="text-green-600 h-5 w-5" /></div>
               <div>
                  <p className="font-bold text-gray-800 uppercase">{selectedPaymentType}</p>
                  <p className="text-xs text-gray-500">Pagamento pelo app</p>
               </div>
             </div>
           </Card>
        </div>
      </div>

      {step === "pix_payment" && (
        <Dialog open={true} onOpenChange={() => setStep("review")}>
          <DialogContent className="rounded-3xl p-8 space-y-6 text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-indigo-900">Pague com PIX</DialogTitle>
              <DialogDescription>Escaneie o código ou copie a chave para finalizar seu pedido.</DialogDescription>
            </DialogHeader>
            <div className="bg-gray-50 p-6 rounded-3xl flex flex-col items-center gap-4 border border-indigo-50">
              <QrCode className="h-40 w-40 text-indigo-600" />
              <div className="bg-white p-3 rounded-xl border border-gray-100 w-full flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 truncate max-w-[200px]">00020126360014BR.GOV.BCB.PIX0114+5511999999999</span>
                <Button variant="ghost" size="sm" className="text-indigo-600 font-bold" onClick={() => { navigator.clipboard.writeText("PIX_KEY"); showSuccess("Copiado!"); }}>Copiar</Button>
              </div>
            </div>
            <Button className="w-full h-14 rounded-xl bg-indigo-600 font-bold" onClick={handleFinishOrder}>Já paguei</Button>
          </DialogContent>
        </Dialog>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t z-20 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-6 px-1">
          <span className="text-gray-400 font-bold text-sm uppercase">Total</span>
          <span className="text-3xl font-black text-indigo-900">R$ {total.toFixed(2)}</span>
        </div>
        <Button 
          className="w-full py-8 rounded-[2rem] bg-brand-accent hover:bg-brand-accent/90 text-white font-black text-xl shadow-2xl"
          onClick={handleFinishOrder}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : "Confirmar Pedido"}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutPage;