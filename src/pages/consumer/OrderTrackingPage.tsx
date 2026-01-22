"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Bike, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Navigation,
  Clock,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const OrderTrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(65);

  // Simulação de movimento do entregador no mapa
  const [driverPos, setDriverPos] = useState({ x: 30, y: 40 });

  useEffect(() => {
    const interval = setInterval(() => {
      setDriverPos(prev => ({
        x: prev.x + (Math.random() * 2 - 0.5),
        y: prev.y + (Math.random() * 2 - 0.5)
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-indigo-50 flex flex-col z-50 overflow-hidden max-w-2xl mx-auto shadow-2xl">
      {/* Header Transparente */}
      <header className="absolute top-0 left-0 right-0 p-4 z-20 flex items-center justify-between">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => navigate(-1)} 
          className="rounded-full bg-white/80 backdrop-blur shadow-lg border-none"
        >
          <ArrowLeft className="h-6 w-6 text-indigo-900" />
        </Button>
        <Badge className="bg-indigo-900 text-white px-4 py-2 rounded-full shadow-lg border-none flex gap-2">
          <Clock className="h-4 w-4" /> Chega em 12 min
        </Badge>
      </header>

      {/* Área do Mapa Simulado */}
      <div className="flex-1 relative overflow-hidden bg-slate-200">
        {/* Camada de Mapa Estilizada (SVG) */}
        <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,20 L100,20 M0,50 L100,50 M0,80 L100,80 M20,0 L20,100 M50,0 L50,100 M80,0 L80,100" stroke="#94a3b8" strokeWidth="0.5" fill="none" />
          <path d="M10,10 Q50,40 90,90" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" fill="none" className="animate-pulse" />
        </svg>

        {/* Marcador: Loja */}
        <div className="absolute top-[10%] left-[10%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="bg-white p-2 rounded-full shadow-xl border-2 border-indigo-600">
            <MapPin className="h-6 w-6 text-indigo-600 fill-indigo-100" />
          </div>
          <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-full mt-1 shadow-sm uppercase">Loja</span>
        </div>

        {/* Marcador: Cliente */}
        <div className="absolute top-[90%] left-[90%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="bg-white p-2 rounded-full shadow-xl border-2 border-brand-accent">
            <Navigation className="h-6 w-6 text-brand-accent fill-brand-accent/20" />
          </div>
          <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-full mt-1 shadow-sm uppercase">Você</span>
        </div>

        {/* Marcador: Entregador (Animado) */}
        <div 
          className="absolute transition-all duration-[3000ms] ease-linear"
          style={{ top: `${driverPos.y}%`, left: `${driverPos.x}%` }}
        >
          <div className="relative">
            <div className="absolute -inset-4 bg-brand-accent/20 rounded-full animate-ping" />
            <div className="bg-brand-accent p-3 rounded-full shadow-2xl relative border-2 border-white transform -rotate-45">
              <Bike className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Informações (Drawer) */}
      <Card className="rounded-t-[2.5rem] border-none shadow-[0_-10px_40px_rgba(0,0,0,0.1)] bg-white z-20 pb-safe">
        <CardContent className="p-6 space-y-6">
          <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-4" />
          
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black text-indigo-900 leading-tight">O entregador está<br />a caminho!</h2>
              <p className="text-gray-500 text-sm mt-1">Pedido #4492 • Pizzaria Delícia</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-indigo-600">12</span>
              <span className="text-xs font-bold text-gray-400 block uppercase">Minutos</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
              <span>Status</span>
              <span>65%</span>
            </div>
            <Progress value={progress} className="h-3 bg-indigo-50" />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-full bg-indigo-200 border-2 border-white shadow-sm overflow-hidden">
                  <img src="https://via.placeholder.com/100/4682B4/FFFFFF?text=Joao" alt="Motorista" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 p-1 rounded-full border-2 border-white">
                  <ShieldCheck className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">João Silva</h4>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase">
                  <span>Moto Honda</span> • <span className="text-indigo-600">ABC-1234</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="rounded-full border-indigo-100 text-indigo-600" onClick={() => navigate('/chat/2')}>
                <MessageCircle className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="outline" className="rounded-full border-indigo-100 text-indigo-600">
                <Phone className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderTrackingPage;