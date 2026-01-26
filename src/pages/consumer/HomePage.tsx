"use client";

import React, { useState, useEffect, useMemo } from "react";
import CategoryCard from "@/components/consumer/CategoryCard";
import RestaurantCard from "@/components/consumer/RestaurantCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import WelcomeHeader from "@/components/consumer/WelcomeHeader";
import SearchBar from "@/components/consumer/SearchBar";
import { useAddresses } from "@/context/AddressContext";
import { canDeliver } from "@/utils/geo";
import { MapPin, Info, Loader2, Store, Utensils, ShoppingCart, Croissant, Pill, GlassWater, Cake } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

const HomePage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedAddress } = useAddresses();

  const categories = [
    { name: "Restaurantes", Icon: Utensils },
    { name: "Mercados", Icon: ShoppingCart },
    { name: "Padarias", Icon: Croissant },
    { name: "Farmácias", Icon: Pill },
    { name: "Bebidas", Icon: GlassWater },
    { name: "Doces", Icon: Cake },
  ];

  useEffect(() => {
    const fetchApprovedAndOpenMerchants = async () => {
      setLoading(true);
      try {
        // Agora filtramos apenas por lojas APROVADAS e ABERTAS
        const { data, error } = await supabase
          .from('merchant_applications')
          .select('*')
          .eq('status', 'APPROVED')
          .eq('is_open', true);

        if (error) throw error;

        const mapped = (data || []).map(m => {
          const meta = m.metadata || {};
          const storeDetails = meta.store_details || {};
          const deliveryArea = meta.delivery_area || { radius: 5, exclusionZones: [] };
          const addr = storeDetails.address || meta.address || {};

          return {
            id: m.id,
            name: m.store_name || storeDetails.name || "Nova Loja",
            cuisine: meta.category || "Restaurante",
            imageUrl: storeDetails.imageUrl || "https://via.placeholder.com/400x200/indigo/FFFFFF?text=" + encodeURIComponent(m.store_name || "Loja"),
            rating: 5.0,
            deliveryTime: "30-45 min",
            location: { 
              lat: addr.lat || -23.5505, 
              lng: addr.lng || -46.6333 
            },
            logistics: { 
              radius: deliveryArea.radius || 5, 
              exclusionZones: deliveryArea.exclusionZones || [] 
            }
          };
        });

        setRestaurants(mapped);
      } catch (err) {
        console.error("Erro ao buscar lojas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedAndOpenMerchants();
  }, []);

  // Filtragem baseada em localização
  const availableRestaurants = useMemo(() => {
    if (!selectedAddress?.lat || !selectedAddress?.lng) return restaurants;

    return restaurants.filter(rest => 
      canDeliver(
        selectedAddress.lat!, 
        selectedAddress.lng!, 
        rest.location.lat, 
        rest.location.lng, 
        rest.logistics.radius, 
        rest.logistics.exclusionZones
      )
    );
  }, [selectedAddress, restaurants]);

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
        {/* Removendo padding do container e ajustando o carrossel para usar margens negativas para o conteúdo */}
        <div className="relative"> 
          <Carousel opts={{ align: "start" }} className="w-full max-w-full mx-auto">
            <CarouselContent className="-ml-4"> {/* Aumentando a margem negativa para compensar o padding dos itens */}
              {categories.map((category, index) => (
                <CarouselItem key={index} className="pl-4 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6">
                  <CategoryCard name={category.name} Icon={category.Icon} />
                </CarouselItem>
              ))}
            </CarouselContent>
            {/* Posicionando os botões nas laterais, garantindo que não sobreponham o conteúdo clicável */}
            <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex" />
            <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex" />
          </Carousel>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-indigo-700">Lojas Disponíveis</h2>
          {selectedAddress && !loading && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Info className="h-3 w-3" /> Filtrado por sua localização
            </span>
          )}
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-2" />
            <p className="text-gray-500 font-medium">Buscando lojas reais...</p>
          </div>
        ) : (
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
                <Store className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma loja aberta no momento que entregue neste endereço.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;