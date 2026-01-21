"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CreditCard, CheckCircle2, QrCode, Wallet, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { usePayment } from "@/context/PaymentContext";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCart();
  const { selectedPaymentType, selectedCardId, savedCards } = usePayment();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"review" | "pix_payment" | "success">("review");

  const total = getTotal() + 5.0;

  const handleFinishOrder = async () => {
    if (selectedPaymentType === "pix") {
      setStep("pix_payment");
      return;
    }

    setIsProcessing(true);
    const tid = showLoading(selectedPaymentType === "stripe" ? "Processando pagamento seguro..." : "Enviando pedido...");
    
    // Simulação de gateway de pagamento (Stripe/Backend)
    await new Promise(r => setTimeout(r, 2000));
    
    dismissToast(tid);
    setIsProcessing(false);
    setStep("success");
    clearCart();
  };

  const getPaymentLabel = () => {
    switch(selectedPaymentType) {
      case "pix": return "PIX";
      case "stripe": return "Cartão via App (Stripe)";
      case "delivery_card": return "Máquina na Entrega";
      case "delivery_cash": return "Dinheiro na Entrega";
      default: return "Não selecionado";
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
          <p className="text-2xl font-black">R$ {total.toFixed(2)}</p>
          <Button className="w-full rounded-xl bg-indigo-600" onClick={() => { clearCart(); setStep("success"); }}>Confirmei o Pagamento</Button>
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
        <h2 className="font-bold ml-1">Forma de Pagamento</h2>
        <Card className="rounded-2xl border-indigo-100 bg-indigo-50/30 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
            {selectedPaymentType === "pix" && <QrCode className="text-indigo-600" />}
            {selectedPaymentType === "stripe" && <CreditCard className="text-indigo-600" />}
            {(selectedPaymentType === "delivery_card" || selectedPaymentType === "delivery_cash") && <Truck className="text-indigo-600" />}
          </div>
          <div>
            <p className="font-bold text-gray-800">{getPaymentLabel()}</p>
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
          <span className="text-gray-400 font-bold text-xs">TOTAL DO PEDIDO</span>
          <span className="text-2xl font-black text-gray-900">R$ {total.toFixed(2)}</span>
        </div>
        <Button 
          className="w-full py-7 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg"
          onClick={handleFinishOrder}
          disabled={isProcessing}
        >
          {isProcessing ? "Confirmando..." : "Finalizar Pedido"}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutPage;