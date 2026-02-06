"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CreditCard, CheckCircle2, QrCode, Wallet, Truck, Loader2, Calendar, Clock, Store, Banknote, Copy } from "lucide-react";
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
  const { items, getTotal, clearCart, restaurantId, deliveryType } = useCart();
  const { selectedPaymentType, selectedFlagId } = usePayment();
  const { selectedAddress } = useAddresses();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"review" | "pix_payment" | "mercadopago_payment" | "success">("review");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [flagName, setFlagName] = useState<string | null>(null);
  const [mpInitPoint, setMpInitPoint] = useState<string | null>(null); // Link de pagamento do MP

  useEffect(() => {
    const fetchFlagName = async () => {
        if (!selectedFlagId || !restaurantId) return;
        //maybeSingle()
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'global_payment_methods').maybeSingle();
        if (data) {
            const method = data.value.methods.find((m: any) => m.id === selectedPaymentType);
            const flag = method?.flags?.find((f: any) => f.id === selectedFlagId);
            if (flag) setFlagName(flag.name);
        }
    };
    fetchFlagName();
  }, [selectedFlagId, selectedPaymentType, restaurantId]);

  const subtotal = getTotal();
  const deliveryFee = deliveryType === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  const createOrder = async (finalPaymentMethod: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const phone = user.user_metadata?.phone || "0000";
    const code = phone.replace(/\D/g, "").slice(-4) || "1234";
    
    const acceptanceDeadline = (deliveryType === "delivery" && !scheduledTime)
      ? new Date(Date.now() + 8 * 60000).toISOString() 
      : null;

    const { data: orderData, error } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        merchant_id: restaurantId,
        items: items,
        total: Number(total.toFixed(2)),
        payment_method: finalPaymentMethod,
        delivery_address: deliveryType === "delivery" ? selectedAddress : { street: "Retirada no Local", number: "S/N" },
        status: 'PENDING',
        confirmation_code: code,
        scheduled_at: scheduledTime || null,
        merchant_acceptance_deadline: acceptanceDeadline,
        delivery_type: deliveryType
      }).select().single();

    if (error) throw error;
    return orderData;
  };

  const handleMercadoPagoCheckout = async () => {
    setIsProcessing(true);
    const tid = showLoading("Criando link de pagamento...");
    
    try {
      const order = await createOrder(selectedPaymentType);
      
      const { data, error } = await supabase.functions.invoke('create-mercadopago-preference', {
        body: {
          orderId: order.id,
          totalAmount: total,
          description: `Pedido FoodApp #${order.id.slice(0, 6)}`,
          items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity }))
        }
      });

      if (error) throw error;
      
      dismissToast(tid);
      setMpInitPoint(data.initPoint);
      setStep("mercadopago_payment");
      clearCart(); // Limpa o carrinho após a criação do pedido
      
    } catch (err: any) {
      console.error("Mercado Pago Checkout Error:", err);
      dismissToast(tid);
      setIsProcessing(false);
      showError("Erro ao iniciar pagamento: " + (err.message || "Tente novamente"));
    }
  };

  const handleFinishOrder = async () => {
    if (deliveryType === "delivery" && !selectedAddress) {
      showError("Selecione um endereço de entrega.");
      return;
    }

    if (selectedPaymentType === "mercadopago") {
      await handleMercadoPagoCheckout();
      return;
    }

    if (selectedPaymentType === "pix" && step !== "pix_payment") {
      setStep("pix_payment");
      return;
    }

    setIsProcessing(true);
    const tid = showLoading("Finalizando seu pedido...");
    
    try {
      // Se houver bandeira, anexa ao nome do método para o lojista ver
      const finalPaymentMethod = flagName ? `${selectedPaymentType} (${flagName})` : selectedPaymentType;
      
      await createOrder(finalPaymentMethod);

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

  const getPaymentLabel = (type: string) => {
    const label = type.split(' (')[0];
    switch(label) {
      case "pix": return "PIX (Online)";
      case "mercadopago": return "Mercado Pago (Online)"; // Adicionado
      case "card_credit_online": return "Cartão de Crédito (App)";
      case "card_debit_online": return "Cartão de Débito (App)";
      case "card_credit_delivery": return `Cartão de Crédito (Entrega)${flagName ? ` - ${flagName}` : ''}`;
      case "card_debit_delivery": return `Cartão de Débito (Entrega)${flagName ? ` - ${flagName}` : ''}`;
      case "meal_voucher_delivery": return `Vale Refeição (Entrega)${flagName ? ` - ${flagName}` : ''}`;
      case "pix_delivery": return "PIX (Na Entrega)";
      case "cash_delivery": return "Dinheiro (Na Entrega)";
      default: return type;
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
    <div className="space-y-8 pb-32 p-4 max-w-lg mx-auto text-gray-800">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-gray-100"><ArrowLeft /></Button>
        <h1 className="text-2xl font-black text-indigo-900 tracking-tight">Finalizar Pedido</h1>
      </div>

      <div className="bg-indigo-50/50 p-6 rounded-[2.5rem] flex items-center justify-center gap-3 border border-indigo-100">
          {deliveryType === "delivery" ? <Truck className="h-6 w-6 text-indigo-600" /> : <Store className="h-6 w-6 text-indigo-600" />}
          <span className="font-black text-indigo-900 uppercase tracking-widest text-sm">
            Modo: {deliveryType === "delivery" ? "Entrega em Domicílio" : "Retirada no Local"}
          </span>
      </div>

      {deliveryType === "delivery" && (
        <div className="space-y-3 animate-in fade-in">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quando você quer receber?</p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setScheduledTime("")}
              className={cn(
                "p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                !scheduledTime ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-100 text-gray-400"
              )}
            >
              <Clock className="h-6 w-6" />
              <span className="font-bold text-sm">Pra já</span>
            </button>
            <button 
              onClick={() => setScheduledTime(getScheduleOptions()[0]?.value || "")}
              className={cn(
                "p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                scheduledTime ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-100 text-gray-400"
              )}
            >
              <Calendar className="h-6 w-6" />
              <span className="font-bold text-sm">Agendar</span>
            </button>
          </div>

          {scheduledTime && (
            <div className="animate-in slide-in-from-top-2 pt-2">
              <Select value={scheduledTime} onValueChange={setScheduledTime}>
                <SelectTrigger className="h-14 rounded-2xl border-gray-100 shadow-sm bg-white font-bold">
                  <SelectValue placeholder="Escolha um horário" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {getScheduleOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="font-medium">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Revisão do Destino e Pagamento</p>
           <Card className="rounded-[2rem] p-6 border-none shadow-sm bg-white space-y-6">
             {deliveryType === "delivery" && selectedAddress ? (
               <div className="flex items-center gap-4 animate-in fade-in">
                 <div className="p-3 bg-indigo-50 rounded-2xl"><Truck className="text-indigo-600 h-6 w-6" /></div>
                 <div>
                    <p className="font-black text-gray-800 text-sm">{selectedAddress.street}, {selectedAddress.number}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Endereço de Entrega</p>
                 </div>
               </div>
             ) : (
               <div className="flex items-center gap-4 animate-in fade-in">
                 <div className="p-3 bg-indigo-50 rounded-2xl"><Store className="text-indigo-600 h-6 w-6" /></div>
                 <div>
                    <p className="font-black text-gray-800 text-sm">Retirada no Local</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Consulte o endereço da loja</p>
                 </div>
               </div>
             )}
             <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
               <div className="p-3 bg-green-50 rounded-2xl">
                  {selectedPaymentType === 'cash_delivery' ? <Banknote className="text-green-600 h-6 w-6" /> : <CreditCard className="text-green-600 h-6 w-6" />}
               </div>
               <div>
                  <p className="font-black text-gray-800 text-sm uppercase">{getPaymentLabel(selectedPaymentType)}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Método de Pagamento</p>
               </div>
             </div>
           </Card>
        </div>
      </div>

      {step === "pix_payment" && (
        <Dialog open={true} onOpenChange={() => setStep("review")}>
          <DialogContent className="rounded-[2.5rem] p-8 space-y-6 text-center border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-indigo-900">Pague com PIX</DialogTitle>
              <DialogDescription className="font-medium text-gray-500">Escaneie o código ou copie a chave para finalizar seu pedido com segurança.</DialogDescription>
            </DialogHeader>
            <div className="bg-gray-50 p-8 rounded-[2rem] flex flex-col items-center gap-6 border border-indigo-50">
              <div className="bg-white p-4 rounded-3xl shadow-inner">
                <QrCode className="h-40 w-40 text-indigo-600" />
              </div>
              <div className="space-y-2 w-full">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chave Copia e Cola</p>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 w-full flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black text-indigo-900 truncate flex-1 text-left">00020126360014BR.GOV.BCB.PIX0114+5511999999999</span>
                  <Button variant="ghost" size="icon" className="text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0" onClick={() => { navigator.clipboard.writeText("00020126360014BR.GOV.BCB.PIX0114+5511999999999"); showSuccess("Chave copiada!"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Button className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl" onClick={handleFinishOrder}>Já realizei o pagamento</Button>
              <Button variant="ghost" className="w-full text-gray-400 font-bold" onClick={() => setStep("review")}>Voltar e alterar pagamento</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {step === "mercadopago_payment" && mpInitPoint && (
        <Dialog open={true} onOpenChange={() => setStep("review")}>
          <DialogContent className="rounded-[2.5rem] p-8 space-y-6 text-center border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-indigo-900">Pagar com Mercado Pago</DialogTitle>
              <DialogDescription className="font-medium text-gray-500">Você será redirecionado para o ambiente seguro do Mercado Pago.</DialogDescription>
            </DialogHeader>
            <div className="bg-gray-50 p-8 rounded-[2rem] flex flex-col items-center gap-6 border border-indigo-50">
              <Wallet className="h-20 w-20 text-indigo-600" />
              <p className="text-lg font-bold text-gray-800">Total: R$ {total.toFixed(2)}</p>
            </div>
            <div className="space-y-3">
              <Button 
                className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl" 
                onClick={() => window.open(mpInitPoint, '_blank')}
              >
                Ir para o Pagamento
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-gray-400 font-bold" 
                onClick={() => navigate("/orders")}
              >
                Acompanhar Pedido (Aguardando Pagamento)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t z-20 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-6 px-1">
          <span className="text-gray-400 font-black text-xs uppercase tracking-widest">Total do Pedido</span>
          <span className="text-3xl font-black text-indigo-900">R$ {total.toFixed(2)}</span>
        </div>
        <Button 
          className="w-full py-8 rounded-[2rem] bg-brand-accent hover:bg-brand-accent/90 text-white font-black text-xl shadow-2xl shadow-brand-accent/30 transition-all active:scale-[0.98]"
          onClick={handleFinishOrder}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : "Concluir Pedido"}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutPage;