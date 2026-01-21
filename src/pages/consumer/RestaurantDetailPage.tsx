"use client";

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Clock, Plus, Minus, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { showSuccess } from "@/utils/toast";

const RestaurantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Dados mockados - em um app real, isso viria de uma API
  const restaurant = {
    id: id || "1",
    name: "Restaurante Sabor",
    cuisine: "Culinária Brasileira",
    imageUrl: "https://via.placeholder.com/800x300/FF6347/FFFFFF?text=Restaurante+Sabor",
    rating: 4.5,
    deliveryTime: "30-45 min",
    deliveryFee: "R$ 5,00",
    description: "O melhor da culinária brasileira com ingredientes frescos e receitas tradicionais.",
    menuCategories: [
      {
        name: "Pratos Principais",
        items: [
          {
            id: "1",
            name: "Feijoada Completa",
            description: "Feijão preto com carnes defumadas, servido com arroz, couve, farofa e laranja",
            price: 32.90,
            imageUrl: "https://via.placeholder.com/200/8B4513/FFFFFF?text=Feijoada",
          },
          {
            id: "2",
            name: "Moqueca de Peixe",
            description: "Peixe cozido em leite de coco com dendê, pimentões e tomates",
            price: 45.50,
            imageUrl: "https://via.placeholder.com/200/FFD700/FFFFFF?text=Moqueca",
          },
        ],
      },
      {
        name: "Acompanhamentos",
        items: [
          {
            id: "3",
            name: "Arroz com Feijão",
            description: "Arroz branco e feijão tropeiro",
            price: 12.00,
            imageUrl: "https://via.placeholder.com/200/DAA520/FFFFFF?text=Arroz",
          },
          {
            id: "4",
            name: "Farofa Especial",
            description: "Farofa com bacon e ovos",
            price: 8.50,
            imageUrl: "https://via.placeholder.com/200/CD853F/FFFFFF?text=Farofa",
          },
        ],
      },
      {
        name: "Sobremesas",
        items: [
          {
            id: "5",
            name: "Pudim de Leite",
            description: "Pudim tradicional de leite condensado",
            price: 10.00,
            imageUrl: "https://via.placeholder.com/200/FFD700/FFFFFF?text=Pudim",
          },
          {
            id: "6",
            name: "Brigadeiro",
            description: "Doce de chocolate tradicional (unidade)",
            price: 3.50,
            imageUrl: "https://via.placeholder.com/200/8B4513/FFFFFF?text=Brigadeiro",
          },
        ],
      },
    ],
  };

  const incrementQuantity = (itemId: string) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const decrementQuantity = (itemId: string) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max((prev[itemId] || 0) - 1, 0)
    }));
  };

  const addToCart = (item: any) => {
    const quantity = quantities[item.id] || 0;
    if (quantity > 0) {
      showSuccess(`${quantity}x ${item.name} adicionado(s) ao carrinho!`);
      // Em um app real, você adicionaria ao contexto do carrinho ou estado global
    }
  };

  const getTotalItems = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header do Restaurante */}
      <Card className="rounded-xl shadow-lg overflow-hidden border-none">
        <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-48 object-cover" />
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">{restaurant.name}</CardTitle>
              <p className="text-gray-600">{restaurant.cuisine}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-500 hover:bg-green-600 text-white rounded-full">
                <Star className="h-4 w-4 mr-1" /> {restaurant.rating}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                <Clock className="h-4 w-4 mr-1" /> {restaurant.deliveryTime}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">{restaurant.description}</p>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">Taxa de entrega: {restaurant.deliveryFee}</p>
          </div>
        </CardContent>
      </Card>

      {/* Menu do Restaurante */}
      <div className="space-y-6">
        {restaurant.menuCategories.map((category, categoryIndex) => (
          <section key={categoryIndex}>
            <h2 className="text-xl font-semibold text-indigo-700 mb-3 border-b-2 border-indigo-200 pb-2">
              {category.name}
            </h2>
            <div className="space-y-4">
              {category.items.map((item) => (
                <Card key={item.id} className="rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <CardContent className="p-3">
                    <div className="flex space-x-3">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <p className="font-bold text-indigo-600">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="flex flex-col items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-full border-indigo-200"
                            onClick={() => decrementQuantity(item.id)}
                          >
                            <Minus className="h-4 w-4 text-indigo-600" />
                          </Button>
                          <span className="w-6 text-center font-medium">
                            {quantities[item.id] || 0}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-full border-indigo-200"
                            onClick={() => incrementQuantity(item.id)}
                          >
                            <Plus className="h-4 w-4 text-indigo-600" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          className="rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-medium mt-2"
                          onClick={() => addToCart(item)}
                          disabled={(quantities[item.id] || 0) === 0}
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Carrinho Flutuante */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white shadow-lg border-t border-gray-200 z-20">
          <Button
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 text-lg"
            onClick={() => navigate("/cart")}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Ver Carrinho ({getTotalItems()} item{n.getTotalItems() !== 1 ? 's' : ''})
          </Button>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetailPage;