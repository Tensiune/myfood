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
    const tid = showLoading("Enviando seu pedido...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Salvar pedido real no Supabase
      const { error } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          merchant_id: restaurantId,
          items: items,
          total: total,
          payment_method: selectedPaymentType,
          delivery_address: selectedAddress,
          status: 'PENDING'
        });

      if (error) throw error;

      dismissToast(tid);
      setIsProcessing(false);
      setStep("success");
      clearCart();
    } catch (err: any) {
      dismissToast(tid);
      setIsProcessing(false);
      showError("Erro ao processar pedido: " + err.message);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 bg-white">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900">Sucesso!</h1>
          <p className="text-gray-500">Seu pedido foi recebido. O restaurante começará a preparar em breve.</p>
        </div>
        <Button className="w-full py-6 rounded-2xl bg-indigo-600 text-white font-bold" onClick={() => navigate("/orders")}>Acompanhar Pedido</Button>
      </div>
    );
  }

  if (step === "pix_payment") {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("review")}><ArrowLeft /></Button>
          <h1 className="text-xl font-bold">Pagamento PIX</h1>
        </div>
        <Card className="p-8 flex flex-col items-center space-y-6 text-center rounded-3xl">
          <QrCode className="w-48 h-48 text-indigo-900" />
          <p className="text-sm text-gray-500">Escaneie o código acima ou pague para finalizar o pedido.</p>
          <p className="text-2xl font-black">R$ {total.toFixed(2)}</p>
          <Button className="w-full rounded-xl bg-indigo-600" onClick={handleFinishOrder} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "Confirmei o Pagamento"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 p-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft /></Button>
        <h1 className="text-xl font-bold">Confirmar Pedido</h1>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold ml-1 text-indigo-900">Resumo da Entrega</h2>
        <Card className="rounded-2xl p-4 border-indigo-100 bg-white">
          <div className="flex items-start gap-3">
             <Truck className="h-5 w-5 text-indigo-600 mt-1" />
             <div>
                <p className="font-bold text-gray-800">{selectedAddress?.street}, {selectedAddress?.number}</p>
                <p className="text-xs text-gray-500">{selectedAddress?.neighborhood} - {selectedAddress?.city}</p>
             </div>
          </div>
        </Card>

        <h2 className="font-bold ml-1 text-indigo-900">Forma de Pagamento</h2>
        <Card className="rounded-2xl border-indigo-100 bg-indigo-50/30 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
            {selectedPaymentType === "pix" && <QrCode className="text-indigo-600" />}
            {selectedPaymentType === "stripe" && <CreditCard className="text-indigo-600" />}
            {(selectedPaymentType === "delivery_card" || selectedPaymentType === "delivery_cash") && <Truck className="text-indigo-600" />}
          </div>
          <div>
            <p className="font-bold text-gray-800">Pagar com {selectedPaymentType.toUpperCase()}</p>
            {selectedPaymentType === "stripe" && selectedCardId && (
              <p className="text-xs text-gray-500">Cartão final {savedCards.find(c => c.id === selectedCardId)?.lastFour}</p>
            )}
            {(selectedPaymentType === "delivery_card" || selectedPaymentType === "delivery_cash") && (
              <p className="text-xs text-green-600 font-bold">Pague ao receber o pedido</p>
            )}
          </div>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-20 safe-area-bottom">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Total do Pedido</span>
          <span className="text-2xl font-black text-gray-900">R$ {total.toFixed(2)}</span>
        </div>
        <Button 
          className="w-full py-7 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-xl shadow-indigo-100"
          onClick={handleFinishOrder}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : "Enviar Pedido"}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutPage;