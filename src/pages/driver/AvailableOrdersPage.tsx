"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Store, Package, ArrowRight, DollarSign } from "lucide-react";
import { showSuccess } from "@/utils/toast";

const AvailableOrdersPage = () => {
  const availableOrders = [
    {
      id: "ORD-99",
      store: "Pizzaria Delícia",
      distance: "1.2 km",
      deliveryDistance: "3.5 km",
      earnings: "R$ 12.50",
      items: "2 itens"
    },
    {
      id: "ORD-104",
      store: "Sushi Express",
      distance: "0.8 km",
      deliveryDistance: "5.1 km",
      earnings: "R$ 15.00",
      items: "1 item"
    }
  ];

  const handleAcceptOrder = (id: string) => {
    showSuccess(`Pedido ${id} aceito! Navegue até a loja.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-indigo-900">Disponíveis</h1>
        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-3">2 próximos</Badge>
      </div>

      <div className="space-y-4">
        {availableOrders.map((order) => (
          <Card key={order.id} className="rounded-3xl border-none shadow-md overflow-hidden bg-white">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <Store className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-gray-800">{order.store}</span>
                </div>
                <span className="text-lg font-black text-green-600">{order.earnings}</span>
              </div>

              <div className="space-y-3 relative">
                {/* Linha pontilhada conectando os pontos */}
                <div className="absolute left-2.5 top-6 bottom-6 w-0.5 border-l-2 border-dashed border-gray-200" />
                
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                    <div className="h-2 w-2 bg-white rounded-full" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Retirada</p>
                    <p className="text-sm font-medium text-gray-600">{order.distance} de você</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brand-accent shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Entrega</p>
                    <p className="text-sm font-medium text-gray-600">{order.deliveryDistance} da loja</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <Package className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">{order.items}</span>
                </div>
                <Button 
                  onClick={() => handleAcceptOrder(order.id)}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-lg shadow-indigo-100"
                >
                  Aceitar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AvailableOrdersPage;