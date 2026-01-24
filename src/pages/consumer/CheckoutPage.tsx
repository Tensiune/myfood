"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CreditCard, CheckCircle2, QrCode, Wallet, Truck, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { usePayment } from "@/context/PaymentContext";
import { useAddresses } from "@/context/AddressContext";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart, restaurantId } = useCart();
  const { selectedPaymentType, selectedCardId, savedCards } = usePayment();
  const { selectedAddress } = useAddresses();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"review" | "pix_payment" | "success">("review");

  const total = getTotal() + 5.0;

  const paymentMethodLabels: Record<string, string> = {
    pix: "PIX",
    stripe: "Cartão de Crédito (via App)",
    delivery_card: "Cartão (Débito/Crédito na Entrega)",
    delivery_cash: "Dinheiro (na Entrega)"
  };

  const handleFinishOrder = async () => {
    if (!selectedAddress) {
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

      const userPhone = user.user_metadata?.phone || "0000";
      const code = userPhone.replace(/\D/g, "").slice(-4);

      const { error } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          merchant_id: restaurantId,
          items: items,
          total: total,
          payment_method: selectedPaymentType,
          delivery_address: selectedAddress,
          status: 'PENDING',
          confirmation_code: code
        });

      if (error) throw error;

      dismissToast(tid);
      setStep("success");
      clearCart();
    } catch (err: any) {
      dismissToast(tid);
      setIsProcessing(false);
      showError("Erro: " + err.message);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 bg-white">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900">Pedido Realizado!</h1>
          <p className="text-gray-500">O restaurante já foi notificado e começará a preparar seu pedido.</p>
        </div>
        <Button className="w-full py-6 rounded-2xl bg-indigo-600 text-white font-bold" onClick={() => navigate("/orders")}>Acompanhar agora</Button>
      </div>
    );
  }

  if (step === "pix_payment") {
    return (
      <div className="space-y-6 p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("review")}><ArrowLeft /></Button>
          <h1 className="text-xl font-bold">Pagar com PIX</h1>
        </div>
        <Card className="p-8 flex flex-col items-center space-y-6 text-center rounded-[2.5rem] shadow-xl border-none">
          <QrCode className="w-56 h-56 text-indigo-900" />
          <div className="space-y-2">
             <p className="text-2xl font-black text-indigo-900">R$ {total.toFixed(2)}</p>
             <p className="text-xs text-gray-400 font-bold uppercase">Escaneie o código para pagar</p>
          </div>
          <Button className="w-full h-14 rounded-2xl bg-indigo-600 font-bold" onClick={handleFinishOrder} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="animate-spin" /> : "Já realizei o pagamento"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-gray-100"><ArrowLeft /></Button>
        <h1 className="text-2xl font-black text-indigo-900">Revisar Pedido</h1>
      </div>

      <div className="space-y-5">
        <div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Entrega</p>
           <Card className="rounded-3xl p-5 border-none shadow-sm bg-white flex items-center gap-4">
             <div className="p-3 bg-indigo-50 rounded-2xl"><Truck className="text-indigo-600 h-5 w-5" /></div>
             <div>
                <p className="font-bold text-gray-800">{selectedAddress?.street}, {selectedAddress?.number}</p>
                <p className="text-xs text-gray-500">{selectedAddress?.neighborhood}</p>
             </div>
           </Card>
        </div>

        <div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Pagamento</p>
           <Card className="rounded-3xl p-5 border-none shadow-sm bg-white flex items-center gap-4">
             <div className="p-3 bg-green-50 rounded-2xl">
                {selectedPaymentType === 'pix' ? <QrCode className="text-green-600 h-5 w-5" /> : <Wallet className="text-green-600 h-5 w-5" />}
             </div>
             <div>
                <p className="font-bold text-gray-800">{paymentMethodLabels[selectedPaymentType]}</p>
                <p className="text-xs text-gray-500">Pagamento seguro via App</p>
             </div>
           </Card>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t z-20 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-6 px-1">
          <span className="text-gray-400 font-bold text-sm uppercase">Valor Total</span>
          <span className="text-3xl font-black text-indigo-900">R$ {total.toFixed(2)}</span>
        </div>
        <Button 
          className="w-full py-8 rounded-[2rem] bg-brand-accent hover:bg-brand-accent/90 text-white font-black text-xl shadow-2xl shadow-brand-accent/30 transition-transform active:scale-95"
          onClick={handleFinishOrder}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : "Confirmar e Pedir"}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutPage;