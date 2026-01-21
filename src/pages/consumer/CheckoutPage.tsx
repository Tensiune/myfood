"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CreditCard as CardIcon, CheckCircle2, Copy, QrCode, Wallet } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { usePayment } from "@/context/PaymentContext";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { cn } from "@/lib/utils";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCart();
  const { savedCards, selectedPaymentId } = usePayment();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"review" | "pix_payment" | "success">("review");

  const total = getTotal() + 5.0; // Total + Taxa

  const handleFinishOrder = async () => {
    if (selectedPaymentId === "pix") {
      setStep("pix_payment");
      return;
    }

    setIsProcessing(true);
    const tid = showLoading("Processando pagamento...");
    
    // Simulação de delay de rede
    await new Promise(r => setTimeout(r, 2000));
    
    dismissToast(tid);
    setIsProcessing(false);
    setStep("success");
    clearCart();
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText("00020126360014BR.GOV.BCB.PIX0114+5511999999999");
    showSuccess("Chave PIX copiada!");
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 bg-white">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900">Pedido Confirmado!</h1>
          <p className="text-gray-500">Seu pedido foi enviado para o restaurante e chegará em breve.</p>
        </div>
        <Card className="w-full max-w-sm border-dashed border-2 bg-gray-50">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Número do Pedido</p>
            <p className="text-2xl font-black text-indigo-900">#ORD-{Math.floor(Math.random() * 9000) + 1000}</p>
          </CardContent>
        </Card>
        <Button 
          className="w-full max-w-sm py-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-xl"
          onClick={() => navigate("/orders")}
        >
          Acompanhar Pedido
        </Button>
      </div>
    );
  }

  if (step === "pix_payment") {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("review")} className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800">Pagamento PIX</h1>
        </div>

        <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-b from-indigo-50 to-white overflow-hidden">
          <CardContent className="p-8 flex flex-col items-center space-y-6 text-center">
            <div className="bg-white p-4 rounded-3xl shadow-inner border-2 border-indigo-100">
              <QrCode className="w-48 h-48 text-indigo-900" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500 font-medium">Valor a pagar</p>
              <p className="text-3xl font-black text-indigo-900">R$ {total.toFixed(2).replace('.', ',')}</p>
            </div>
            <div className="w-full p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div className="truncate text-left mr-4">
                <p className="text-[10px] font-bold text-indigo-400 uppercase">Copia e Cola</p>
                <p className="text-sm font-mono text-indigo-900 truncate">00020126360014BR.GOV.BCB.PIX...</p>
              </div>
              <Button size="icon" variant="ghost" onClick={copyPixKey} className="shrink-0 text-indigo-600">
                <Copy className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-gray-400">O QR Code expira em 15 minutos.</p>
          </CardContent>
        </Card>

        <Button 
          className="w-full py-6 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-lg shadow-lg"
          onClick={() => {
            clearCart();
            setStep("success");
          }}
        >
          Já paguei o PIX
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 p-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-gray-800">Revisar Pedido</h1>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-gray-800 ml-1">Resumo de Itens</h2>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">{item.quantity}x {item.name}</span>
              <span className="font-bold text-gray-900">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-gray-800 ml-1">Método Escolhido</h2>
        <Card className="rounded-2xl border-indigo-100 bg-indigo-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              {selectedPaymentId === "pix" ? <QrCode className="text-indigo-600" /> : <CardIcon className="text-indigo-600" />}
            </div>
            <div>
              <p className="font-bold text-gray-800">
                {selectedPaymentId === "pix" ? "PIX" : "Cartão Final " + savedCards.find(c => c.id === selectedPaymentId)?.lastFour}
              </p>
              <p className="text-xs text-gray-500">Pagamento processado na hora</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-bottom z-20">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Total com entrega</span>
          <span className="text-2xl font-black text-gray-900">R$ {total.toFixed(2).replace('.', ',')}</span>
        </div>
        <Button 
          className="w-full py-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-xl shadow-indigo-200"
          onClick={handleFinishOrder}
          disabled={isProcessing}
        >
          {isProcessing ? "Processando..." : "Confirmar e Pagar"}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutPage;