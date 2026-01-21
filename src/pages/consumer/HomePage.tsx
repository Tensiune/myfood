"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import CategoryCard from "@/components/consumer/CategoryCard";
import RestaurantCard from "@/components/consumer/RestaurantCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import WelcomeHeader from "@/components/consumer/WelcomeHeader"; // Import the new WelcomeHeader

const HomePage = () => {
  const categories = [
    { name: "Restaurantes", imageUrl: "https://via.placeholder.com/100/FFD700/FFFFFF?text=Rest" },
    { name: "Mercados", imageUrl: "https://via.placeholder.com/100/32CD32/FFFFFF?text=Merc" },
    { name: "Padarias", imageUrl: "https://via.placeholder.com/100/DAA520/FFFFFF?text=Pade" },
    { name: "Farmácias", imageUrl: "https://via.placeholder.com/100/8A2BE2/FFFFFF?text=Farm" },
    { name: "Bebidas", imageUrl: "https://via.placeholder.com/100/1E90FF/FFFFFF?text=Beb" },
    { name: "Doces", imageUrl: "https://via.placeholder.com/100/FF69B4/FFFFFF?text=Doce" },
  ];

  const featuredRestaurants = [
    {
      name: "Restaurante Sabor",
      cuisine: "Culinária Brasileira",
      imageUrl: "https://via.placeholder.com/400x200/FF6347/FFFFFF?text=Sabor",
      rating: 4.5,
      deliveryTime: "30-45 min",
    },
    {
      name: "Pizzaria Delícia",
      cuisine: "Pizzas e Massas",
      imageUrl: "https://via.placeholder.com/400x200/FFA500/FFFFFF?text=Pizza",
      rating: 4.8,
      deliveryTime: "20-35 min",
    },
    {
      name: "Sushi Express",
      cuisine: "Comida Japonesa",
      imageUrl: "https://via.placeholder.00/4682B4/FFFFFF?text=Sushi",
      rating: 4.7,
      deliveryTime: "35-50 min",
    },
    {
      name: "Hamburgueria Top",
      cuisine: "Hambúrgueres Artesanais",
      imageUrl: "https://via.placeholder.com/400x200/8B4513/FFFFFF?text=Burger",
      rating: 4.6,
      deliveryTime: "25-40 min",
    },
  ];

  return (
    <div className="space-y-8 pb-20">
      <WelcomeHeader /> {/* Using the new WelcomeHeader component */}
      
      <div className="relative">
        <Input
          type="text"
          placeholder="Buscar restaurantes ou pratos..."
          className="w-full pl-10 pr-4 py-3 rounded-full border-2 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400 shadow-sm text-base"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-indigo-700">Categorias</h2>
        <Carousel
          opts={{
            align: "start",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {categories.map((category, index) => (
              <CarouselItem key={index} className="pl-2 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6">
                <CategoryCard
                  name={category.name}
                  imageUrl={category.imageUrl}
                  onClick={() => alert(`Clicou em ${category.name}`)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-indigo-700">Estabelecimentos em Destaque</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredRestaurants.map((restaurant, index) => (
            <RestaurantCard
              key={index}
              name={restaurant.name}
              cuisine={restaurant.cuisine}
              imageUrl={restaurant.imageUrl}
              rating={restaurant.rating}
              deliveryTime={restaurant.deliveryTime}
              onClick={() => alert(`Clicou em ${restaurant.name}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;