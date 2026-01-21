"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ArrowLeft, MapPin, CreditCard } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { showSuccess, showError } from "@/utils/toast";

const CartPage = () => {
  const { items, updateQuantity, removeItem, clearCart, getTotal, restaurantId } = useCart();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [deliveryAddress, setDeliveryAddress] = useState("Rua Exemplo, 123 - Apto 401");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");

  // Carregar endereço padrão do localStorage
  useEffect(() => {
    const savedAddresses = localStorage.getItem("deliveryAddresses");
    if (savedAddresses) {
      try {
        const addresses = JSON.parse(savedAddresses);
        const defaultAddress = addresses.find((addr: any) => addr.isDefault) || addresses[0];
        if (defaultAddress) {
          setDeliveryAddress(`${defaultAddress.street}, ${defaultAddress.number} - ${defaultAddress.neighborhood}`);
        }
      } catch (error) {
        console.error("Failed to parse addresses", error);
      }
    }
  }, []);

  const handleNoteChange = (itemId: string, value: string) => {
    setNotes(prev => ({ ...prev, [itemId]: value }));
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      showError("Seu carrinho está vazio!");
      return;
    }

    // Em um app real, aqui você enviaria os dados para o backend
    const orderData = {
      restaurantId,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: notes[item.id] || ""
      })),
      total: getTotal(),
      deliveryAddress,
      paymentMethod,
      status: "pending"
    };

    console.log("Order data:", orderData);
    showSuccess("Pedido realizado com sucesso! Em breve você receberá a confirmação.");
    clearCart();
    navigate("/orders");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center space-y-6">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full space-y-6">
          <div className="mx-auto mb-4">
            <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-indigo-800">Seu carrinho está vazio</h1>
          <p className="text-gray-600">Parece que você ainda não adicionou nada ao carrinho.</p>
          <Button
            className="rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-2 px-6"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Continuar Comprando
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <h1 className="text-4xl font-bold text-indigo-800 text-center">Seu Carrinho</h1>

      {/* Itens do Carrinho */}
      <section className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="rounded-lg shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="flex space-x-4">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-800">{item.name}</CardTitle>
                      <p className="text-sm text-gray-600">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 border rounded-lg p-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Adicionar observação"
                      className="text-sm"
                      value={notes[item.id] || ""}
                      onChange={(e) => handleNoteChange(item.id, e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Resumo do Pedido */}
      <Card className="rounded-xl shadow-lg border border-gray-200 sticky bottom-20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-indigo-800">Resumo do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">R$ {getTotal().toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Taxa de entrega</span>
              <span className="font-semibold">R$ 5,00</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-bold text-indigo-800">Total</span>
              <span className="font-bold text-indigo-800">R$ {(getTotal() + 5).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-indigo-600" />
              <Input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Endereço de entrega"
                className="flex-1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={paymentMethod === "credit_card" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setPaymentMethod("credit_card")}
                >
                  <CreditCard className="h-4 w-4 mr-2" /> Cartão de Crédito
                </Button>
                <Button
                  variant={paymentMethod === "money" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setPaymentMethod("money")}
                >
                  💵 Dinheiro
                </Button>
                <Button
                  variant={paymentMethod === "pix" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setPaymentMethod("pix")}
                >
                  📱 PIX
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-3 text-lg"
            onClick={handleCheckout}
          >
            Finalizar Pedido
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CartPage;