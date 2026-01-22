"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Phone, 
  CheckCircle2, 
  CornerUpRight,
  Map as MapIcon
} from "lucide-react";
import { showSuccess } from "@/utils/toast";

const NavigationPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"to_store" | "to_client">("to_store");

  const handleFinishStep = () => {
    if (step === "to_store") {
      showSuccess("Pedido coletado! Agora siga para o cliente.");
      setStep("to_client");
    } else {
      showSuccess("Pedido entregue com sucesso! Bom trabalho.");
      navigate("/driver/orders");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-50 overflow-hidden max-w-2xl mx-auto">
      {/* HUD de Navegação Topo */}
      <div className="p-6 bg-indigo-600 text-white z-20 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
            <CornerUpRight className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black">250m</h2>
            <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs">Vire à direita na Rua das Flores</p>
          </div>
        </div>
      </div>

      {/* Mapa do Entregador (Simulado com tons escuros) */}
      <div className="flex-1 relative bg-slate-800">
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,20 L100,20 M0,50 L100,50 M0,80 L100,80 M20,0 L20,100 M50,0 L50,100 M80,0 L80,100" stroke="white" strokeWidth="0.5" fill="none" />
        </svg>

        {/* Rota Dinâmica */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
           <div className="relative">
              <div className="absolute -inset-10 bg-indigo-500/20 rounded-full animate-ping" />
              <Navigation className="h-12 w-12 text-white fill-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
           </div>
        </div>

        {/* Destino */}
        <div className="absolute top-[20%] right-[20%] text-center">
          <div className="bg-brand-accent p-3 rounded-full shadow-2xl animate-bounce">
            {step === "to_store" ? <MapPin className="h-6 w-6 text-white" /> : <CheckCircle2 className="h-6 w-6 text-white" />}
          </div>
        </div>
      </div>

      {/* Painel Inferior de Ação */}
      <div className="p-6 bg-white rounded-t-[2.5rem] z-20 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <Badge className={step === "to_store" ? "bg-orange-500" : "bg-indigo-600"}>
              {step === "to_store" ? "Retirada" : "Entrega"}
            </Badge>
            <h3 className="text-xl font-black text-gray-900 mt-2">
              {step === "to_store" ? "Pizzaria Delícia" : "Maria Silva"}
            </h3>
            <p className="text-gray-500 text-sm">{step === "to_store" ? "Rua das Laranjeiras, 400" : "Av. Paulista, 1000"}</p>
          </div>
          <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-gray-100 shadow-sm">
            <Phone className="h-5 w-5 text-indigo-600" />
          </Button>
        </div>

        <Button 
          className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-100"
          onClick={handleFinishStep}
        >
          {step === "to_store" ? "Cheguei na Loja" : "Finalizar Entrega"}
        </Button>

        <Button 
          variant="ghost" 
          className="w-full text-gray-400 font-bold"
          onClick={() => navigate(-1)}
        >
          Sair da Navegação
        </Button>
      </div>
    </div>
  );
};

export default NavigationPage;