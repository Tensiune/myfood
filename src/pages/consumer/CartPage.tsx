"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ArrowLeft, MapPin, CreditCard, ChevronRight, ShoppingBag, Wallet, QrCode, Check, Tag, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAddresses } from "@/context/AddressContext";
import { usePayment, PaymentMethodType } from "@/context/PaymentContext";
import { showSuccess, showError } from "@/utils/toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AddressManager from "@/components/consumer/AddressManager";
import AddCardForm from "@/components/consumer/AddCardForm";
import { cn } from "@/lib/utils";

const CartPage = () => {
  const { items, updateQuantity, removeItem, getTotal, getDiscountAmount, appliedCoupon, applyCoupon, removeCoupon } = useCart();
  const { selectedAddress } = useAddresses();
  const { savedCards, selectedPaymentType, setSelectedPaymentType, selectedCardId, setSelectedCardId } = usePayment();
  const navigate = useNavigate();
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [isCardSheetOpen, setIsCardSheetOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");

  const handleGoToCheckout = () => {
    if (items.length === 0) {
      showError("Seu carrinho está vazio!");
      return;
    }
    if (!selectedAddress) {
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="w-12 h-12 text-gray-300" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">Seu carrinho está vazio</h1>
        <Button className="rounded-xl bg-brand-accent text-white" onClick={() => navigate("/")}>Ir para a loja</Button>
      </div>
    );
  }

  const deliveryFee = 5.0;
  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const discount = getDiscountAmount();
  const total = getTotal() + deliveryFee;

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full"><ArrowLeft /></Button>
        <h1 className="text-xl font-bold text-gray-800">Carrinho</h1>
      </div>

      {/* Endereço */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <Sheet open={isAddressSheetOpen} onOpenChange={setIsAddressSheetOpen}>
          <SheetTrigger asChild>
            <button className="w-full p-4 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-brand-accent mt-0.5" />
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Entregar em</p>
                  <p className="font-bold text-gray-800">{selectedAddress ? `${selectedAddress.street}, ${selectedAddress.number}` : "Selecionar endereço"}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-[2.5rem]"><AddressManager /></SheetContent>
        </Sheet>
      </Card>

      {/* Itens */}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex gap-4 p-3 bg-white rounded-2xl border border-gray-100">
            <img src={item.imageUrl} className="w-16 h-16 object-cover rounded-xl" />
            <div className="flex-1">
              <div className="flex justify-between">
                <p className="font-bold text-gray-800">{item.name}</p>
                <button onClick={() => removeItem(item.id)} className="text-gray-300"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="font-bold text-indigo-600 text-sm">R$ {item.price.toFixed(2)}</p>
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-2 py-1">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3" /></button>
                  <span className="text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cupom de Desconto */}
      <section className="space-y-3">
        <h2 className="font-bold text-gray-800 ml-1">Cupom de Desconto</h2>
        {appliedCoupon ? (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs font-bold text-green-800 uppercase">Cupom Aplicado</p>
                <p className="font-bold text-green-900">{appliedCoupon.code} (-{(appliedCoupon.discount * 100).toFixed(0)}%)</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={removeCoupon} className="text-green-800 hover:bg-green-100 rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Código do cupom"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="rounded-xl border-gray-200 focus:border-indigo-400 pl-10"
              />
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <Button 
              onClick={handleApplyCoupon}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              disabled={!couponInput.trim()}
            >
              Aplicar
            </Button>
          </div>
        )}
      </section>

      {/* Pagamento */}
      <section className="space-y-3">
        <h2 className="font-bold text-gray-800 ml-1">Forma de Pagamento</h2>
        
        <div className="grid grid-cols-1 gap-2">
          {/* Online Options */}
          <div className="bg-gray-50 p-3 rounded-2xl space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase ml-1">Pagar pelo App</p>
            
            <button 
              onClick={() => setSelectedPaymentType("pix")}
              className={cn("flex items-center justify-between w-full p-4 rounded-xl border bg-white", selectedPaymentType === "pix" && "border-brand-accent bg-brand-accent/5")}
            >
              <div className="flex items-center gap-3"><QrCode className="h-5 w-5 text-indigo-600" /><span className="text-sm font-bold">PIX</span></div>
              {selectedPaymentType === "pix" && <Check className="h-4 w-4 text-brand-accent" />}
            </button>

            {savedCards.map(card => (
              <button 
                key={card.id}
                onClick={() => { setSelectedPaymentType("stripe"); setSelectedCardId(card.id); }}
                className={cn("flex items-center justify-between w-full p-4 rounded-xl border bg-white", (selectedPaymentType === "stripe" && selectedCardId === card.id) && "border-brand-accent bg-brand-accent/5")}
              >
                <div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-indigo-600" /><span className="text-sm font-bold">Cartão final {card.lastFour}</span></div>
                {selectedPaymentType === "stripe" && selectedCardId === card.id && <Check className="h-4 w-4 text-brand-accent" />}
              </button>
            ))}

            <Sheet open={isCardSheetOpen} onOpenChange={setIsCardSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-indigo-600 font-bold h-12 rounded-xl border-dashed border-2 border-indigo-100">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Novo Cartão
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] rounded-t-[2rem]">
                <SheetHeader className="mb-6"><SheetTitle>Novo Cartão</SheetTitle></SheetHeader>
                <AddCardForm onSuccess={() => setIsCardSheetOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Delivery Options */}
          <div className="bg-gray-50 p-3 rounded-2xl space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase ml-1">Pagar na Entrega</p>
            
            <button 
              onClick={() => setSelectedPaymentType("delivery_card")}
              className={cn("flex items-center justify-between w-full p-4 rounded-xl border bg-white", selectedPaymentType === "delivery_card" && "border-brand-accent bg-brand-accent/5")}
            >
              <div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-gray-400" /><span className="text-sm font-bold">Cartão (Débito/Crédito)</span></div>
              {selectedPaymentType === "delivery_card" && <Check className="h-4 w-4 text-brand-accent" />}
            </button>

            <button 
              onClick={() => setSelectedPaymentType("delivery_cash")}
              className={cn("flex items-center justify-between w-full p-4 rounded-xl border bg-white", selectedPaymentType === "delivery_cash" && "border-brand-accent bg-brand-accent/5")}
            >
              <div className="flex items-center gap-3"><Wallet className="h-5 w-5 text-gray-400" /><span className="text-sm font-bold">Dinheiro</span></div>
              {selectedPaymentType === "delivery_cash" && <Check className="h-4 w-4 text-brand-accent" />}
            </button>
          </div>
        </div>
      </section>

      {/* Summary */}
      <div className="p-4 bg-indigo-50/50 rounded-2xl space-y-2 border border-indigo-100/50">
        <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600 font-medium">
            <span>Desconto</span>
            <span>- R$ {discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-500"><span>Entrega</span><span>R$ {deliveryFee.toFixed(2)}</span></div>
        <div className="flex justify-between font-black text-lg text-indigo-900 pt-2 border-t border-indigo-100"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-area-bottom z-20">
        <Button className="w-full py-7 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-lg shadow-xl shadow-brand-accent/20" onClick={handleGoToCheckout}>
          Revisar Pedido
        </Button>
      </div>
    </div>
  );
};

export default CartPage;