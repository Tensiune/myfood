"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ArrowLeft, MapPin, CreditCard, ChevronRight, ShoppingBag, Wallet, QrCode, Check, Tag, X, Truck, Store, Loader2, AlertCircle, Banknote } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAddresses } from "@/context/AddressContext";
import { usePayment, PaymentMethodType } from "@/context/PaymentContext";
import { showSuccess, showError } from "@/utils/toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AddressManager from "@/components/consumer/AddressManager";
import AddCardForm from "@/components/consumer/AddCardForm";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const DELIVERY_FEE = 5.0;

const CartPage = () => {
  const { items, updateQuantity, removeItem, getTotal, getDiscountAmount, appliedCoupon, applyCoupon, removeCoupon, deliveryType, setDeliveryType, restaurantId } = useCart();
  const { selectedAddress } = useAddresses();
  const { savedCards, selectedPaymentType, setSelectedPaymentType, selectedCardId, setSelectedCardId } = usePayment();
  const navigate = useNavigate();
  
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [isCardSheetOpen, setIsCardSheetOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [allowsPickup, setAllowsPickup] = useState(true);

  useEffect(() => {
    const fetchRestaurantSettings = async () => {
      if (!restaurantId) {
        setLoadingRestaurant(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('merchant_applications')
          .select('metadata')
          .eq('id', restaurantId)
          .single();

        if (data?.metadata?.delivery_area) {
          const canPickup = data.metadata.delivery_area.allows_pickup !== false;
          setAllowsPickup(canPickup);
          if (!canPickup && deliveryType === "pickup") {
            setDeliveryType("delivery");
          }
        }
      } catch (err) {
        console.error("Error fetching restaurant logistics:", err);
      } finally {
        setLoadingRestaurant(false);
      }
    };
    fetchRestaurantSettings();
  }, [restaurantId, deliveryType, setDeliveryType]);

  const handleGoToCheckout = () => {
    if (items.length === 0) {
      showError("Seu carrinho está vazio!");
      return;
    }
    if (deliveryType === "delivery" && !selectedAddress) {
      showError("Selecione um endereço de entrega.");
      setIsAddressSheetOpen(true);
      return;
    }
    navigate("/checkout");
  };

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    applyCoupon(couponInput);
    setCouponInput("");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4 text-gray-800">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <h1 className="text-xl font-black">Seu carrinho está vazio</h1>
        <Button className="rounded-[2rem] bg-indigo-600 text-white font-black px-10 h-14 shadow-xl" onClick={() => navigate("/")}>Ir para a loja</Button>
      </div>
    );
  }

  const deliveryFee = deliveryType === "delivery" ? DELIVERY_FEE : 0;
  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const discount = getDiscountAmount();
  const total = getTotal() + deliveryFee;

  const isDeliveryPayment = ["card_credit_delivery", "card_debit_delivery", "cash_delivery"].includes(selectedPaymentType);

  return (
    <div className="space-y-8 pb-32 text-gray-800">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-gray-100"><ArrowLeft /></Button>
        <h1 className="text-2xl font-black text-indigo-900 tracking-tight">Carrinho</h1>
      </div>

      {/* Tipo de Entrega */}
      <section className="space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Como você quer receber?</p>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setDeliveryType("delivery")}
            className={cn(
              "p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
              deliveryType === "delivery" ? "border-brand-accent bg-brand-accent/5 text-brand-accent" : "border-gray-100 text-gray-400"
            )}
          >
            <Truck className="h-7 w-7" />
            <span className="font-bold text-sm">Entrega</span>
          </button>
          {allowsPickup && (
            <button 
              onClick={() => setDeliveryType("pickup")}
              className={cn(
                "p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                deliveryType === "pickup" ? "border-brand-accent bg-brand-accent/5 text-brand-accent" : "border-gray-100 text-gray-400"
              )}
            >
              <Store className="h-7 w-7" />
              <span className="font-bold text-sm">Retirar no Local</span>
            </button>
          )}
        </div>
      </section>

      {/* Endereço */}
      {deliveryType === "delivery" ? (
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden animate-in fade-in">
          <Sheet open={isAddressSheetOpen} onOpenChange={setIsAddressSheetOpen}>
            <SheetTrigger asChild>
              <button className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl"><MapPin className="h-6 w-6 text-brand-accent" /></div>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Entregar em</p>
                    <p className="font-bold text-gray-800 leading-tight">{selectedAddress ? `${selectedAddress.street}, ${selectedAddress.number}` : "Selecionar endereço"}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-[2.5rem]"><AddressManager /></SheetContent>
          </Sheet>
        </Card>
      ) : (
        <div className="p-6 bg-indigo-50/50 rounded-[2rem] border-2 border-dashed border-indigo-100 flex items-center gap-4 animate-in fade-in">
            <div className="p-3 bg-white rounded-2xl shadow-sm"><Store className="h-6 w-6 text-indigo-600" /></div>
            <div>
                <p className="font-black text-indigo-900 text-sm">Retirada Direto no Estabelecimento</p>
                <p className="text-xs text-indigo-700/60 font-medium">Economize o valor da entrega!</p>
            </div>
        </div>
      )}

      {/* Itens */}
      <div className="space-y-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seus Itens</p>
        {items.map(item => (
          <div key={item.id} className="flex gap-4 p-4 bg-white rounded-3xl border-none shadow-sm group">
            <img src={item.imageUrl} className="w-20 h-20 object-cover rounded-2xl bg-gray-50" />
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <p className="font-bold text-gray-800 leading-tight">{item.name}</p>
                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="flex justify-between items-end">
                <p className="font-black text-indigo-600">R$ {item.price.toFixed(2)}</p>
                <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-indigo-400 hover:text-indigo-600"><Minus className="h-4 w-4" /></button>
                  <span className="text-sm font-black text-indigo-950 w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-indigo-400 hover:text-indigo-600"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cupom */}
      <section className="space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tem algum cupom?</p>
        {appliedCoupon ? (
          <div className="flex items-center justify-between p-5 bg-green-50 border border-green-200 rounded-[2rem] animate-in zoom-in-95">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-sm"><Tag className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-[10px] font-black text-green-700 uppercase">Cupom Ativo</p>
                <p className="font-black text-green-900 text-lg">{appliedCoupon.code} <span className="text-xs font-bold opacity-60">(-{(appliedCoupon.discount * 100).toFixed(0)}%)</span></p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={removeCoupon} className="text-green-800 hover:bg-green-100 rounded-full h-10 w-10">
              <X className="h-6 w-6" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Código do cupom"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="rounded-2xl border-none shadow-sm h-14 pl-12 bg-white focus:ring-2 focus:ring-indigo-100"
              />
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            </div>
            <Button 
              onClick={handleApplyCoupon}
              className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 h-14 shadow-lg shadow-indigo-100"
              disabled={!couponInput.trim()}
            >
              Aplicar
            </Button>
          </div>
        )}
      </section>

      {/* Pagamento */}
      <section className="space-y-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Como pagar?</p>
        
        {/* Pagar pelo App */}
        <div className="space-y-2">
            <p className="text-xs font-bold text-indigo-900 px-1">Pelo Aplicativo (Mais Rápido)</p>
            <button 
              onClick={() => { setSelectedPaymentType("pix"); setSelectedCardId(null); }}
              className={cn("flex items-center justify-between w-full p-5 rounded-2xl border-none bg-white shadow-sm transition-all", selectedPaymentType === "pix" && "ring-2 ring-brand-accent bg-brand-accent/5")}
            >
              <div className="flex items-center gap-4"><div className="p-2 bg-indigo-50 rounded-xl"><QrCode className="h-5 w-5 text-indigo-600" /></div><span className="font-bold">PIX</span></div>
              {selectedPaymentType === "pix" && <Check className="h-5 w-5 text-brand-accent" />}
            </button>

            {savedCards.map(card => (
              <button 
                key={card.id}
                onClick={() => { setSelectedPaymentType(card.type === 'credit' ? 'card_credit_online' : 'card_debit_online'); setSelectedCardId(card.id); }}
                className={cn("flex items-center justify-between w-full p-5 rounded-2xl border-none bg-white shadow-sm transition-all", ((selectedPaymentType === "card_credit_online" || selectedPaymentType === "card_debit_online") && selectedCardId === card.id) && "ring-2 ring-brand-accent bg-brand-accent/5")}
              >
                <div className="flex items-center gap-4"><div className="p-2 bg-indigo-50 rounded-xl"><CreditCard className="h-5 w-5 text-indigo-600" /></div><span className="font-bold">Cartão {card.type === 'credit' ? 'Crédito' : 'Débito'} (final {card.lastFour})</span></div>
                {((selectedPaymentType === "card_credit_online" || selectedPaymentType === "card_debit_online") && selectedCardId === card.id) && <Check className="h-5 w-5 text-brand-accent" />}
              </button>
            ))}

            <Sheet open={isCardSheetOpen} onOpenChange={setIsCardSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-indigo-600 font-black h-14 rounded-2xl border-dashed border-2 border-indigo-100 hover:bg-indigo-50 transition-all">
                  <Plus className="h-5 w-5 mr-3" /> Adicionar Cartão Online
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] rounded-t-[2.5rem] p-8">
                <SheetHeader className="mb-8"><SheetTitle className="text-2xl font-black text-indigo-900">Novo Cartão</SheetTitle></SheetHeader>
                <AddCardForm onSuccess={() => setIsCardSheetOpen(false)} />
              </SheetContent>
            </Sheet>
        </div>

        {/* Pagar na Entrega */}
        <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 px-1">Pagar na Entrega</p>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => { setSelectedPaymentType("card_credit_delivery"); setSelectedCardId(null); }}
                className={cn("flex items-center justify-between w-full p-5 rounded-2xl border-none bg-white shadow-sm transition-all", selectedPaymentType === "card_credit_delivery" && "ring-2 ring-brand-accent bg-brand-accent/5")}
              >
                <div className="flex items-center gap-4"><div className="p-2 bg-gray-100 rounded-xl"><CreditCard className="h-5 w-5 text-gray-400" /></div><span className="font-bold">Cartão de Crédito</span></div>
                {selectedPaymentType === "card_credit_delivery" && <Check className="h-5 w-5 text-brand-accent" />}
              </button>
              <button 
                onClick={() => { setSelectedPaymentType("card_debit_delivery"); setSelectedCardId(null); }}
                className={cn("flex items-center justify-between w-full p-5 rounded-2xl border-none bg-white shadow-sm transition-all", selectedPaymentType === "card_debit_delivery" && "ring-2 ring-brand-accent bg-brand-accent/5")}
              >
                <div className="flex items-center gap-4"><div className="p-2 bg-gray-100 rounded-xl"><CreditCard className="h-5 w-5 text-gray-400" /></div><span className="font-bold">Cartão de Débito</span></div>
                {selectedPaymentType === "card_debit_delivery" && <Check className="h-5 w-5 text-brand-accent" />}
              </button>
              <button 
                onClick={() => { setSelectedPaymentType("cash_delivery"); setSelectedCardId(null); }}
                className={cn("flex items-center justify-between w-full p-5 rounded-2xl border-none bg-white shadow-sm transition-all", selectedPaymentType === "cash_delivery" && "ring-2 ring-brand-accent bg-brand-accent/5")}
              >
                <div className="flex items-center gap-4"><div className="p-2 bg-gray-100 rounded-xl"><Banknote className="h-5 w-5 text-gray-400" /></div><span className="font-bold">Dinheiro</span></div>
                {selectedPaymentType === "cash_delivery" && <Check className="h-5 w-5 text-brand-accent" />}
              </button>
            </div>
        </div>

        {/* Aviso de Pagamento Offline */}
        {isDeliveryPayment && (
          <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800 font-medium leading-relaxed">
              <strong>Atenção:</strong> Ao escolher pagar na entrega, seu pedido pode demorar um pouco a mais, pois não são todos os entregadores que estão habilitados a receber no local.
            </p>
          </div>
        )}
      </section>

      {/* Sumário */}
      <div className="p-6 bg-white rounded-[2.5rem] shadow-sm space-y-3 border border-gray-50">
        <div className="flex justify-between text-sm font-bold text-gray-400"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600 font-black uppercase tracking-wider">
            <span>Desconto Aplicado</span>
            <span>- R$ {discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold text-gray-400">
            <span>Taxa de Entrega</span>
            <span className={cn(deliveryFee === 0 && "text-green-600")}>
                {deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : "GRÁTIS"}
            </span>
        </div>
        <div className="flex justify-between font-black text-2xl text-indigo-900 pt-4 border-t border-gray-50"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t safe-area-bottom z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <Button className="w-full py-8 rounded-[2rem] bg-brand-accent hover:bg-brand-accent/90 text-white font-black text-xl shadow-2xl shadow-brand-accent/30 transition-all active:scale-[0.98]" onClick={handleGoToCheckout}>
          Revisar Pedido
        </Button>
      </div>
    </div>
  );
};

export default CartPage;