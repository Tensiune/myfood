"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Trash2, 
  Plus, 
  Minus, 
  ArrowLeft, 
  MapPin, 
  CreditCard, 
  ChevronRight, 
  ShoppingBag, 
  Wallet, 
  Check, 
  Tag, 
  X, 
  Truck, 
  Store, 
  Loader2, 
  AlertCircle, 
  Banknote,
  QrCode
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAddresses } from "@/context/AddressContext";
import { usePayment } from "@/context/PaymentContext";
import { showError } from "@/utils/toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AddressManager from "@/components/consumer/AddressManager";
import AddCardForm from "@/components/consumer/AddCardForm";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { GlobalPaymentSettings, MerchantPaymentSettings } from "@/types/payment";

const DELIVERY_FEE = 5.0;

const CartPage = () => {
  const { items, updateQuantity, removeItem, getTotal, getDiscountAmount, appliedCoupon, applyCoupon, removeCoupon, deliveryType, setDeliveryType, restaurantId } = useCart();
  const { selectedAddress } = useAddresses();
  const { savedCards, selectedPaymentType, setSelectedPaymentType, selectedCardId, setSelectedCardId, selectedFlagId, setSelectedFlagId } = usePayment();
  const navigate = useNavigate();
  
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [isCardSheetOpen, setIsCardSheetOpen] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [availableMethods, setAvailableMethods] = useState<any[]>([]);
  const [allowsPickup, setAllowsPickup] = useState(true);

  useEffect(() => {
    const fetchConfigs = async () => {
      if (!restaurantId) {
        setLoadingConfig(false);
        return;
      }
      try {
        // Mudança crítica: maybeSingle() em vez de single()
        const { data: globalData } = await supabase.from('app_settings').select('value').eq('key', 'global_payment_methods').maybeSingle();
        const global: GlobalPaymentSettings = globalData?.value || { methods: [] };

        const { data: merchantData } = await supabase.from('merchant_applications').select('metadata').eq('id', restaurantId).maybeSingle();
        const merchantMeta = merchantData?.metadata || {};
        const merchantPay: MerchantPaymentSettings = merchantMeta.payment_settings || { enabledMethods: [], enabledFlags: {} };
        
        setAllowsPickup(merchantMeta.delivery_area?.allows_pickup !== false);

        const finalMethods = global.methods
            .filter(m => m.enabled && merchantPay.enabledMethods.includes(m.id))
            .map(m => {
                if (m.requiresFlag) {
                    const storeFlagIds = merchantPay.enabledFlags[m.id] || [];
                    return { ...m, flags: m.flags?.filter(f => storeFlagIds.includes(f.id)) };
                }
                return m;
            })
            .filter(m => !m.requiresFlag || (m.flags && m.flags.length > 0));

        setAvailableMethods(finalMethods);
        
        if (finalMethods.length > 0 && !finalMethods.find(m => m.id === selectedPaymentType)) {
            setSelectedPaymentType(finalMethods[0].id);
            setSelectedFlagId(null);
        }

      } catch (err) {
        console.error("Config fetch error:", err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfigs();
  }, [restaurantId, selectedPaymentType, setSelectedPaymentType, setSelectedFlagId]);

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <h1 className="text-xl font-black">Seu carrinho está vazio</h1>
        <Button className="rounded-[2rem] bg-indigo-600 text-white font-black px-10 h-14" onClick={() => navigate("/")}>Ir para a loja</Button>
      </div>
    );
  }

  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const discount = getDiscountAmount();
  const deliveryFee = deliveryType === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal - discount + deliveryFee;

  const selectedMethodObj = availableMethods.find(m => m.id === selectedPaymentType);
  const isOfflinePayment = selectedMethodObj?.category === 'delivery';

  const handleCheckout = () => {
    if (selectedMethodObj?.requiresFlag && !selectedFlagId) {
        showError("Por favor, selecione a bandeira do seu cartão.");
        return;
    }
    navigate("/checkout");
  };

  return (
    <div className="space-y-8 pb-32 text-gray-800">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full"><ArrowLeft /></Button>
        <h1 className="text-2xl font-black text-indigo-900 tracking-tight">Carrinho</h1>
      </div>

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

      {deliveryType === "delivery" && (
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
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
      )}

      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex gap-4 p-4 bg-white rounded-3xl border-none shadow-sm">
            <img src={item.imageUrl} className="w-20 h-20 object-cover rounded-2xl bg-gray-50" />
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <p className="font-bold text-gray-800 leading-tight">{item.name}</p>
                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="flex justify-between items-end">
                <p className="font-black text-indigo-600">R$ {item.price.toFixed(2)}</p>
                <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-indigo-400"><Minus className="h-4 w-4" /></button>
                  <span className="text-sm font-black">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-indigo-400"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Como pagar?</p>
        
        {loadingConfig ? (
            <div className="flex justify-center p-6"><Loader2 className="animate-spin text-indigo-600" /></div>
        ) : (
            <div className="space-y-6">
                {availableMethods.some(m => m.category === 'app') && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-indigo-900 px-1">Pelo Aplicativo (Online)</p>
                        {availableMethods.filter(m => m.category === 'app').map(method => {
                            if (method.id === 'card_credit_online' || method.id === 'card_debit_online') {
                                return savedCards.filter(c => (method.id === 'card_credit_online' ? c.type === 'credit' : c.type === 'debit')).map(card => (
                                    <button 
                                      key={card.id}
                                      onClick={() => { setSelectedPaymentType(method.id as any); setSelectedCardId(card.id); setSelectedFlagId(null); }}
                                      className={cn("flex items-center justify-between w-full p-5 rounded-2xl bg-white shadow-sm transition-all", (selectedPaymentType === method.id && selectedCardId === card.id) && "ring-2 ring-brand-accent bg-brand-accent/5")}
                                    >
                                      <div className="flex items-center gap-4">
                                          <div className="p-2 bg-indigo-50 rounded-xl"><CreditCard className="h-5 w-5 text-indigo-600" /></div>
                                          <span className="font-bold">{method.label} {card.brand} (final {card.lastFour})</span>
                                      </div>
                                      {selectedPaymentType === method.id && selectedCardId === card.id && <Check className="h-5 w-5 text-brand-accent" />}
                                    </button>
                                ));
                            }
                            return (
                                <button 
                                  key={method.id}
                                  onClick={() => { setSelectedPaymentType(method.id as any); setSelectedCardId(null); setSelectedFlagId(null); }}
                                  className={cn("flex items-center justify-between w-full p-5 rounded-2xl bg-white shadow-sm transition-all", (selectedPaymentType === method.id && !selectedCardId) && "ring-2 ring-brand-accent bg-brand-accent/5")}
                                >
                                  <div className="flex items-center gap-4">
                                      <div className="p-2 bg-indigo-50 rounded-xl">{method.id === 'pix' ? <QrCode className="h-5 w-5 text-indigo-600" /> : <Smartphone className="h-5 w-5 text-indigo-600" />}</div>
                                      <span className="font-bold">{method.label}</span>
                                  </div>
                                  {selectedPaymentType === method.id && !selectedCardId && <Check className="h-5 w-5 text-brand-accent" />}
                                </button>
                            );
                        })}
                        <Sheet open={isCardSheetOpen} onOpenChange={setIsCardSheetOpen}>
                          <SheetTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start text-indigo-600 font-black h-14 rounded-2xl border-dashed border-2 border-indigo-100 hover:bg-indigo-50 transition-all">
                              <Plus className="h-4 w-4 mr-3" /> Adicionar Cartão Online
                            </Button>
                          </SheetTrigger>
                          <SheetContent side="bottom" className="h-[70vh] rounded-t-[2.5rem] p-8">
                            <AddCardForm onSuccess={() => setIsCardSheetOpen(false)} />
                          </SheetContent>
                        </Sheet>
                    </div>
                )}

                {availableMethods.some(m => m.category === 'delivery') && (
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-gray-500 px-1">Pagar na Entrega (Maquininha/Dinheiro)</p>
                        {availableMethods.filter(m => m.category === 'delivery').map(method => {
                            const isSelected = selectedPaymentType === method.id;
                            return (
                                <div key={method.id} className="space-y-3">
                                    <button 
                                        onClick={() => { setSelectedPaymentType(method.id as any); setSelectedCardId(null); setSelectedFlagId(null); }}
                                        className={cn("flex items-center justify-between w-full p-5 rounded-2xl bg-white shadow-sm transition-all", isSelected && "ring-2 ring-brand-accent bg-brand-accent/5")}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-gray-100 rounded-xl">{method.id === 'cash_delivery' ? <Banknote className="h-5 w-5 text-gray-400" /> : <CreditCard className="h-5 w-5 text-gray-400" />}</div>
                                            <span className="font-bold block text-left">{method.label}</span>
                                        </div>
                                        {isSelected && <Check className="h-5 w-5 text-brand-accent" />}
                                    </button>

                                    {isSelected && method.requiresFlag && (
                                        <div className="pl-4 pr-1 animate-in fade-in slide-in-from-top-2">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase mb-2 ml-1">Selecione a Bandeira:</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {method.flags?.map((flag: any) => (
                                                    <button 
                                                        key={flag.id}
                                                        onClick={() => setSelectedFlagId(flag.id)}
                                                        className={cn(
                                                            "p-3 rounded-xl border-2 text-xs font-black uppercase transition-all",
                                                            selectedFlagId === flag.id 
                                                                ? "border-indigo-600 bg-indigo-600 text-white shadow-lg" 
                                                                : "border-gray-100 bg-white text-gray-400 hover:border-indigo-100"
                                                        )}
                                                    >
                                                        {flag.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {isOfflinePayment && (
          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800 font-medium leading-relaxed">
              <strong>Nota:</strong> Como você escolheu pagar na entrega, este pedido será entregue pela <strong>frota própria do restaurante</strong> para processar seu pagamento. Se puder pague de forma online porque isso pode agilizar seu pedido.
            </p>
          </div>
        )}
      </section>

      <div className="p-6 bg-white rounded-[2.5rem] shadow-sm space-y-3 border border-gray-50">
        <div className="flex justify-between text-sm font-bold text-gray-400"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-sm font-bold text-gray-400">
            <span>Taxa de Entrega</span>
            <span className={cn(deliveryFee === 0 && "text-green-600")}>{deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : "GRÁTIS"}</span>
        </div>
        <div className="flex justify-between font-black text-2xl text-indigo-900 pt-4 border-t border-gray-50"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t safe-area-bottom z-20">
        <Button className="w-full py-8 rounded-[2rem] bg-brand-accent text-white font-black text-xl shadow-2xl" onClick={handleCheckout}>
          Finalizar Pedido
        </Button>
      </div>
    </div>
  );
};

export default CartPage;