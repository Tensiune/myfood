"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Filter, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import RestaurantCard from "@/components/consumer/RestaurantCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [filterDeliveryTime, setFilterDeliveryTime] = useState("all");

  const allRestaurants = [
    {
      id: "1",
      name: "Restaurante Sabor",
      cuisine: "Culinária Brasileira",
      imageUrl: "https://via.placeholder.com/400x200/FF6347/FFFFFF?text=Sabor",
      rating: 4.5,
      deliveryTime: "30-45 min",
      category: "Restaurantes",
    },
    {
      id: "2",
      name: "Pizzaria Delícia",
      cuisine: "Pizzas e Massas",
      imageUrl: "https://via.placeholder.com/400x200/FFA500/FFFFFF?text=Pizza",
      rating: 4.8,
      deliveryTime: "20-35 min",
      category: "Restaurantes",
    },
    {
      id: "3",
      name: "Sushi Express",
      cuisine: "Comida Japonesa",
      imageUrl: "https://via.placeholder.com/400x200/4682B4/FFFFFF?text=Sushi",
      rating: 4.7,
      deliveryTime: "35-50 min",
      category: "Restaurantes",
    },
    {
      id: "4",
      name: "Hamburgueria Top",
      cuisine: "Hambúrgueres Artesanais",
      imageUrl: "https://via.placeholder.com/400x200/8B4513/FFFFFF?text=Burger",
      rating: 4.6,
      deliveryTime: "25-40 min",
      category: "Restaurantes",
    },
    {
      id: "5",
      name: "Mercado Fresco",
      cuisine: "Supermercado",
      imageUrl: "https://via.placeholder.com/400x200/32CD32/FFFFFF?text=Mercado",
      rating: 4.2,
      deliveryTime: "40-60 min",
      category: "Mercados",
    },
    {
      id: "6",
      name: "Padaria Doce Pão",
      cuisine: "Pães e Doces",
      imageUrl: "https://via.placeholder.com/400x200/DAA520/FFFFFF?text=Padaria",
      rating: 4.0,
      deliveryTime: "20-30 min",
      category: "Padarias",
    },
  ];

  const filteredRestaurants = allRestaurants.filter((restaurant) => {
    const matchesSearchTerm = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || restaurant.category === filterCategory;
    const matchesRating = filterRating === "all" || restaurant.rating >= parseFloat(filterRating);

    // Simple delivery time filter (can be made more complex)
    const matchesDeliveryTime = filterDeliveryTime === "all" ||
                                (filterDeliveryTime === "short" && parseInt(restaurant.deliveryTime.split('-')[0]) <= 30) ||
                                (filterDeliveryTime === "medium" && parseInt(restaurant.deliveryTime.split('-')[0]) > 30 && parseInt(restaurant.deliveryTime.split('-')[0]) <= 45) ||
                                (filterDeliveryTime === "long" && parseInt(restaurant.deliveryTime.split('-')[0]) > 45);

    return matchesSearchTerm && matchesCategory && matchesRating && matchesDeliveryTime;
  });

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-4xl font-bold text-indigo-800 text-center">Buscar Estabelecimentos</h1>

      <div className="flex items-center space-x-2">
        <div className="relative flex-grow">
          <Input
            type="text"
            placeholder="Buscar por nome, categoria..."
            className="w-full pl-10 pr-4 py-3 rounded-full border-2 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400 shadow-sm text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="rounded-full bg-brand-accent hover:bg-brand-accent/90 text-white" size="icon">
              <Filter className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-sm rounded-l-xl">
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold text-indigo-800">Filtros</SheetTitle>
            </SheetHeader>
            <div className="py-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Categoria</h3>
                <RadioGroup value={filterCategory} onValueChange={setFilterCategory} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="category-all" />
                    <Label htmlFor="category-all">Todas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Restaurantes" id="category-restaurants" />
                    <Label htmlFor="category-restaurants">Restaurantes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Mercados" id="category-markets" />
                    <Label htmlFor="category-markets">Mercados</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Padarias" id="category-bakeries" />
                    <Label htmlFor="category-bakeries">Padarias</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Avaliação Mínima</h3>
                <RadioGroup value={filterRating} onValueChange={setFilterRating} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="rating-all" />
                    <Label htmlFor="rating-all">Qualquer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4.5" id="rating-4.5" />
                    <Label htmlFor="rating-4.5">4.5+ <Star className="inline-block h-4 w-4 ml-1 text-yellow-500 fill-yellow-500" /></Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4.0" id="rating-4.0" />
                    <Label htmlFor="rating-4.0">4.0+ <Star className="inline-block h-4 w-4 ml-1 text-yellow-500 fill-yellow-500" /></Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Tempo de Entrega</h3>
                <Select value={filterDeliveryTime} onValueChange={setFilterDeliveryTime}>
                  <SelectTrigger className="w-full rounded-lg border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400">
                    <SelectValue placeholder="Selecione o tempo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-md">
                    <SelectItem value="all">Qualquer</SelectItem>
                    <SelectItem value="short">Até 30 min</SelectItem>
                    <SelectItem value="medium">30-45 min</SelectItem>
                    <SelectItem value="long">Mais de 45 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-indigo-700">Resultados da Busca</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRestaurants.length > 0 ? (
            filteredRestaurants.map((restaurant, index) => (
              <RestaurantCard
                key={index}
                id={restaurant.id}
                name={restaurant.name}
                cuisine={restaurant.cuisine}
                imageUrl={restaurant.imageUrl}
                rating={restaurant.rating}
                deliveryTime={restaurant.deliveryTime}
              />
            ))
          ) : (
            <p className="text-center text-gray-600 col-span-full">Nenhum estabelecimento encontrado com os filtros aplicados.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default SearchPage;