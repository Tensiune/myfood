"use client";

import React, { useState, useMemo } from "react";
import CategoryCard from "@/components/consumer/CategoryCard";
import RestaurantCard from "@/components/consumer/RestaurantCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import WelcomeHeader from "@/components/consumer/WelcomeHeader";
import SearchBar from "@/components/consumer/SearchBar";
import { useAddresses } from "@/context/AddressContext";
import { canDeliver } from "@/utils/geo";
import { MapPin, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const HomePage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedAddress } = useAddresses();

  const categories = [
    { name: "Restaurantes", imageUrl: "https://via.placeholder.com/100/FFD700/FFFFFF?text=Rest" },
    { name: "Mercados", imageUrl: "https://via.placeholder.com/100/32CD32/FFFFFF?text=Merc" },
    { name: "Padarias", imageUrl: "https://via.placeholder.com/100/DAA520/FFFFFF?text=Pade" },
    { name: "Farmácias", imageUrl: "https://via.placeholder.com/100/8A2BE2/FFFFFF?text=Farm" },
    { name: "Bebidas", imageUrl: "https://via.placeholder.com/100/1E90FF/FFFFFF?text=Beb" },
    { name: "Doces", imageUrl: "https://via.placeholder.com/100/FF69B4/FFFFFF?text=Doce" },
  ];

  // Dados mockados com informações de logística
  const allRestaurants = [
    {
      id: "1",
      name: "Restaurante Sabor",
      cuisine: "Culinária Brasileira",
      imageUrl: "https://via.placeholder.com/400x200/FF6347/FFFFFF?text=Sabor",
      rating: 4.5,
      deliveryTime: "30-45 min",
      location: { lat: -23.5505, lng: -46.6333 },
      logistics: { radius: 5, exclusionZones: [] }
    },
    {
      id: "2",
      name: "Pizzaria Delícia",
      cuisine: "Pizzas e Massas",
      imageUrl: "https://via.placeholder.com/400x200/FFA500/FFFFFF?text=Pizza",
      rating: 4.8,
      deliveryTime: "20-35 min",
      location: { lat: -23.5605, lng: -46.6433 },
      logistics: { radius: 10, exclusionZones: [] }
    },
    {
      id: "3",
      name: "Sushi Express",
      cuisine: "Comida Japonesa",
      imageUrl: "https://via.placeholder.com/400x200/4682B4/FFFFFF?text=Sushi",
      rating: 4.7,
      deliveryTime: "35-50 min",
      location: { lat: -23.5705, lng: -46.6533 },
      logistics: { radius: 3, exclusionZones: [] }
    }
  ];

  // Filtragem baseada em localização
  const availableRestaurants = useMemo(() => {
    if (!selectedAddress?.lat || !selectedAddress?.lng) return allRestaurants;

    return allRestaurants.filter(rest => 
      canDeliver(
        selectedAddress.lat!, 
        selectedAddress.lng!, 
        rest.location.lat, 
        rest.location.lng, 
        rest.logistics.radius, 
        rest.logistics.exclusionZones
      )
    );
  }, [selectedAddress]);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <WelcomeHeader />

      {!selectedAddress && (
        <Alert className="bg-brand-accent/10 border-brand-accent/50 rounded-2xl">
          <MapPin className="h-4 w-4 text-brand-accent" />
          <AlertDescription className="text-sm font-medium text-indigo-900">
            Selecione um endereço para ver os restaurantes que entregam em sua região.
          </AlertDescription>
        </Alert>
      )}

      <SearchBar
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onSearch={handleSearch}
      />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-indigo-700">Categorias</h2>
        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent className="-ml-2">
            {categories.map((category, index) => (
              <CarouselItem key={index} className="pl-2 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6">
                <CategoryCard name={category.name} imageUrl={category.imageUrl} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-indigo-700">Em Destaque</h2>
          {selectedAddress && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Info className="h-3 w-3" /> Filtrado por localização
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableRestaurants.length > 0 ? (
            availableRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                id={restaurant.id}
                name={restaurant.name}
                cuisine={restaurant.cuisine}
                imageUrl={restaurant.imageUrl}
                rating={restaurant.rating}
                deliveryTime={restaurant.deliveryTime}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
              <MapPin className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Ops! Nenhum restaurante entrega nesta localização no momento.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;