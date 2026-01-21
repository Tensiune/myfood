"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard as CardIcon, Lock } from "lucide-react";
import { usePayment } from "@/context/PaymentContext";
import { showSuccess, showError } from "@/utils/toast";

const AddCardForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { addCard } = usePayment();
  const [formData, setFormData] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Simple masking could be added here
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.number.length < 16) {
      showError("Número de cartão inválido.");
      return;
    }

    addCard({
      brand: "visa", // Mock brand logic
      lastFour: formData.number.slice(-4),
      expiry: formData.expiry,
      holderName: formData.name,
    });

    showSuccess("Cartão adicionado com sucesso!");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="number">Número do Cartão</Label>
        <div className="relative">
          <Input 
            id="number"
            name="number"
            placeholder="0000 0000 0000 0000"
            maxLength={16}
            value={formData.number}
            onChange={handleInputChange}
            className="rounded-xl pr-10"
            required
          />
          <CardIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry">Validade</Label>
          <Input 
            id="expiry"
            name="expiry"
            placeholder="MM/AA"
            maxLength={5}
            value={formData.expiry}
            onChange={handleInputChange}
            className="rounded-xl"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvc">CVC</Label>
          <Input 
            id="cvc"
            name="cvc"
            placeholder="123"
            maxLength={3}
            value={formData.cvc}
            onChange={handleInputChange}
            className="rounded-xl"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome no Cartão</Label>
        <Input 
          id="name"
          name="name"
          placeholder="Como está no cartão"
          value={formData.name}
          onChange={handleInputChange}
          className="rounded-xl"
          required
        />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-gray-400 bg-gray-50 p-2 rounded-lg">
        <Lock className="h-3 w-3" />
        Seus dados são processados de forma segura pelo Stripe.
      </div>

      <Button type="submit" className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6">
        Salvar Cartão
      </Button>
    </form>
  );
};

export default AddCardForm;