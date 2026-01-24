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
    const tid = showLoading("Processando pedido...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Gerar código: 4 últimos dígitos do telefone
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
      showError("Erro ao finalizar: " + err.message);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 bg-white">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900">Pedido Feito!</h1>
          <p className="text-gray-500">Acompanhe agora o status do seu pedido.</p>
        </div>
        <Button className="w-full py-6 rounded-2xl bg-indigo-600 text-white font-bold" onClick={() => navigate("/orders")}>Ir para Meus Pedidos</Button>
      </div>
    );
  }

  // Render do Pix e Review permanecem os mesmos...
  if (step === "pix_payment") {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("review")}><ArrowLeft /></Button>
          <h1 className="text-xl font-bold">Pagamento PIX</h1>
        </div>
        <Card className="p-8 flex flex-col items-center space-y-6 text-center rounded-3xl">
          <QrCode className="w-48 h-48 text-indigo-900" />
          <p className="text-2xl font-black">R$ {total.toFixed(2)}</p>
          <Button className="w-full rounded-xl bg-indigo-600" onClick={handleFinishOrder} disabled={isProcessing}>
            Confirmei o Pagamento
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 p-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft /></Button>
        <h1 className="text-xl font-bold">Resumo</h1>
      </div>
      <div className="space-y-4">
        <Card className="rounded-2xl p-4 border-indigo-100 bg-white">
          <p className="font-bold text-gray-800">{selectedAddress?.street}, {selectedAddress?.number}</p>
          <p className="text-xs text-gray-500">{selectedAddress?.neighborhood}</p>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-indigo-50/30 p-4 flex items-center gap-4">
          <QrCode className="text-indigo-600" />
          <div>
            <p className="font-bold text-gray-800">Pagamento via {selectedPaymentType.toUpperCase()}</p>
          </div>
        </Card>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-20 safe-area-bottom">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-400 font-bold">Total</span>
          <span className="text-2xl font-black">R$ {total.toFixed(2)}</span>
        </div>
        <Button className="w-full py-7 rounded-2xl bg-indigo-600 text-white font-bold" onClick={handleFinishOrder} disabled={isProcessing}>
          Confirmar e Pedir
        </Button>
      </div>
    </div>
  );
};

export default CheckoutPage;