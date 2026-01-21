"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ArrowLeft, MapPin, CreditCard, ChevronRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAddresses } from "@/context/AddressContext";
import { usePayment } from "@/context/PaymentContext";
import { showSuccess, showError } from "@/utils/toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AddressManager from "@/components/consumer/AddressManager";
import { cn } from "@/lib/utils";

const CartPage = () => {
  const { items, updateQuantity, removeItem, getTotal } = useCart();
  const { selectedAddress } = useAddresses();
  const { savedCards, selectedPaymentId, setSelectedPaymentId } = usePayment();
  const navigate = useNavigate();
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);

  const handleGoToCheckout = () => {
    if (items.length === 0) {
      showError("Seu carrinho está vazio!");
      return;
    }

    if (!selectedAddress) {
      showError("Por favor, selecione um endereço de entrega.");
      setIsAddressSheetOpen(true);
      return;
    }

    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="w-12 h-12 text-gray-300" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">Seu carrinho está vazio</h1>
        <p className="text-gray-500 max-w-xs">Adicione itens para começar o seu pedido.</p>
        <Button
          className="rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold px-8"
          onClick={() => navigate("/")}
        >
          Ir para a tela inicial
        </Button>
      </div>
    );
  }

  const deliveryFee = 5.0;
  const total = getTotal() + deliveryFee;

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-gray-800">Carrinho</h1>
      </div>

      {/* Endereço de Entrega */}
      <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
        <Sheet open={isAddressSheetOpen} onOpenChange={setIsAddressSheetOpen}>
          <SheetTrigger asChild>
            <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-brand-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Entregar em</p>
                  <p className="font-bold text-gray-800">
                    {selectedAddress 
                      ? `${selectedAddress.street}, ${selectedAddress.number}` 
                      : "Selecionar endereço"}
                  </p>
                  {selectedAddress && (
                    <p className="text-sm text-gray-500">{selectedAddress.neighborhood}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-[2.5rem] overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl font-bold text-center text-indigo-900">Onde você quer receber?</SheetTitle>
            </SheetHeader>
            <AddressManager />
          </SheetContent>
        </Sheet>
      </Card>

      {/* Itens */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 p-2 bg-white rounded-xl border border-gray-100">
            <img src={item.imageUrl} className="w-16 h-16 object-cover rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="font-bold text-gray-800 truncate">{item.name}</p>
                <button onClick={() => removeItem(item.id)} className="text-red-400 p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500">R$ {item.price.toFixed(2).replace('.', ',')}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-2 py-1">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-brand-accent disabled:opacity-30" disabled={item.quantity <= 1}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-brand-accent">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagamento */}
      <section className="space-y-3">
        <h2 className="font-bold text-gray-800 ml-1">Pagamento</h2>
        <div className="grid grid-cols-1 gap-2">
          {/* Opção PIX */}
          <button
            onClick={() => setSelectedPaymentId("pix")}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border transition-all text-sm font-bold",
              selectedPaymentId === "pix" ? "border-brand-accent bg-brand-accent/5 text-brand-accent" : "border-gray-100 bg-white text-gray-600"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📱</span>
              PIX
            </div>
            {selectedPaymentId === "pix" && <div className="h-4 w-4 rounded-full bg-brand-accent" />}
          </button>

          {/* Cartões Salvos */}
          {savedCards.map(card => (
            <button
              key={card.id}
              onClick={() => setSelectedPaymentId(card.id)}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all text-sm font-bold",
                selectedPaymentId === card.id ? "border-brand-accent bg-brand-accent/5 text-brand-accent" : "border-gray-100 bg-white text-gray-600"
              )}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5" />
                {card.brand.toUpperCase()} •••• {card.lastFour}
              </div>
              {selectedPaymentId === card.id && <div className="h-4 w-4 rounded-full bg-brand-accent" />}
            </button>
          ))}

          {/* Adicionar Novo Cartão (Placeholder por enquanto) */}
          <Button variant="ghost" className="text-indigo-600 font-bold border-dashed border-2 border-indigo-100 rounded-xl py-8">
            <Plus className="h-5 w-5 mr-2" /> Adicionar Cartão
          </Button>
        </div>
      </section>

      {/* Resumo */}
      <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>R$ {getTotal().toFixed(2).replace('.', ',')}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Taxa de entrega</span>
          <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-gray-800 pt-2 border-t border-gray-200">
          <span>Total</span>
          <span>R$ {total.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-bottom z-20">
        <Button 
          className="w-full py-6 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-lg shadow-xl shadow-brand-accent/20"
          onClick={handleGoToCheckout}
        >
          Continuar para Checkout
        </Button>
      </div>
    </div>
  );
};

export default CartPage;