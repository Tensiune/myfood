"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle, Star } from "lucide-react";
import RatingComponent from "@/components/consumer/RatingComponent";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";

const OrdersPage = () => {
  const orders = [
    {
      id: "1",
      restaurant: "Restaurante Sabor",
      items: "2x Feijoada, 1x Pudim",
      status: "Em Entrega",
      time: "15:30",
      total: "R$ 75.00",
      rating: null,
      canRate: true,
    },
    {
      id: "2",
      restaurant: "Pizzaria Delícia",
      items: "1x Pizza Calabresa G",
      status: "Entregue",
      time: "Ontem, 19:00",
      total: "R$ 55.00",
      rating: 4.5,
      canRate: false,
    },
    {
      id: "3",
      restaurant: "Mercado Fresco",
      items: "Leite, Pão, Ovos",
      status: "Aguardando Confirmação",
      time: "Hoje, 10:00",
      total: "R$ 42.50",
      rating: null,
      canRate: false,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Em Entrega":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full">Em Entrega</Badge>;
      case "Entregue":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white rounded-full">Entregue</Badge>;
      case "Aguardando Confirmação":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white rounded-full">Aguardando Confirmação</Badge>;
      default:
        return <Badge variant="secondary" className="rounded-full">{status}</Badge>;
    }
  };

  const handleRatingSubmit = (orderId: string, rating: number, comment?: string) => {
    return new Promise<void>((resolve) => {
      // Em um app real, você enviaria isso para o backend
      console.log(`Avaliação para pedido ${orderId}: ${rating} estrelas`, comment);
      showSuccess("Obrigado pela sua avaliação!");
      resolve();
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-4xl font-bold text-indigo-800 text-center">Meus Pedidos</h1>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-indigo-700">Pedidos Ativos</h2>
        {orders.filter(order => order.status !== "Entregue").length > 0 ? (
          orders.filter(order => order.status !== "Entregue").map((order) => (
            <Card key={order.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 bg-white">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-gray-800">{order.restaurant}</CardTitle>
                  {getStatusBadge(order.status)}
                </div>
                <p className="text-sm text-gray-600">{order.items}</p>
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" /> {order.time}
                  </div>
                  <div className="flex items-center">
                    <Package className="h-4 w-4 mr-1" /> {order.total}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-center text-gray-600">Nenhum pedido ativo no momento.</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-indigo-700">Histórico de Pedidos</h2>
        {orders.filter(order => order.status === "Entregue").length > 0 ? (
          orders.filter(order => order.status === "Entregue").map((order) => (
            <Card key={order.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 bg-white">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-gray-800">{order.restaurant}</CardTitle>
                  {getStatusBadge(order.status)}
                </div>
                <p className="text-sm text-gray-600">{order.items}</p>
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" /> {order.time}
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" /> {order.total}
                  </div>
                </div>

                {order.rating !== null && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 mt-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">Sua avaliação: {order.rating.toFixed(1)}</span>
                  </div>
                )}

                {order.canRate && (
                  <div className="pt-3 border-t border-gray-100 mt-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Avalie sua experiência:</h3>
                    <RatingComponent
                      onRatingSubmit={(rating, comment) => handleRatingSubmit(order.id, rating, comment)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-center text-gray-600">Nenhum pedido entregue ainda.</p>
        )}
      </section>
    </div>
  );
};

export default OrdersPage;