"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, Filter, Star, Clock, Info, Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import RestaurantCard from "@/components/consumer/RestaurantCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";
import { useAddresses } from "@/context/AddressContext";
import { canDeliver } from "@/utils/geo";
import { cn } from "@/lib/utils";

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [filterDeliveryTime, setFilterDeliveryTime] = useState("all");
  const [allMerchants, setAllMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedAddress } = useAddresses();

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      // Busca todos os lojistas APROVADOS
      const { data, error } = await supabase
        .from('merchant_applications')
        .select('*')
        .eq('status', 'APPROVED');

      if (error) throw error;

      const mappedMerchants = (data || []).map(m => {
        const meta = m.metadata || {};
        const storeDetails = meta.store_details || {};
        const deliveryArea = meta.delivery_area || { radius: 5, exclusionZones: [] };
        const addr = storeDetails.address || meta.address || {};

        return {
          id: m.id,
          name: m.store_name || storeDetails.name || "Loja Parceira",
          cuisine: meta.category || "Restaurante",
          imageUrl: storeDetails.imageUrl || "https://via.placeholder.com/400x200/indigo/FFFFFF?text=" + encodeURIComponent(m.store_name || "Loja"),
          rating: 4.5, // Mock rating for now
          deliveryTime: "30-45 min", // Mock delivery time for now
          category: meta.category || "Restaurantes",
          is_open: m.is_open,
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

      setAllMerchants(mappedMerchants);
    } catch (err) {
      console.error("Erro ao buscar lojas:", err);
      showError("Erro ao carregar lojas disponíveis.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const filteredRestaurants = useMemo(() => {
    const customerLat = selectedAddress?.lat;
    const customerLng = selectedAddress?.lng;
    const hasLocation = customerLat && customerLng;

    return allMerchants.filter((restaurant) => {
      // 1. Filtragem por localização (apenas se o endereço estiver selecionado)
      if (hasLocation) {
        const canDeliverToAddress = canDeliver(
          customerLat, 
          customerLng, 
          restaurant.location.lat, 
          restaurant.location.lng, 
          restaurant.logistics.radius, 
          restaurant.logistics.exclusionZones
        );
        if (!canDeliverToAddress) return false;
      }

      // 2. Filtragem por termo de busca
      const matchesSearchTerm = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 3. Filtragem por categoria
      const matchesCategory = filterCategory === "all" || restaurant.category.toLowerCase() === filterCategory.toLowerCase();
      
      // 4. Filtragem por avaliação
      const matchesRating = filterRating === "all" || restaurant.rating >= parseFloat(filterRating);

      // 5. Filtragem por tempo de entrega (mantendo a lógica mockada)
      const matchesDeliveryTime = filterDeliveryTime === "all" ||
                                  (filterDeliveryTime === "short" && parseInt(restaurant.deliveryTime.split('-')[0]) <= 30) ||
                                  (filterDeliveryTime === "medium" && parseInt(restaurant.deliveryTime.split('-')[0]) > 30 && parseInt(restaurant.deliveryTime.split('-')[0]) <= 45) ||
                                  (filterDeliveryTime === "long" && parseInt(restaurant.deliveryTime.split('-')[0]) > 45);

      return matchesSearchTerm && matchesCategory && matchesRating && matchesDeliveryTime;
    });
  }, [allMerchants, searchTerm, filterCategory, filterRating, filterDeliveryTime, selectedAddress]);

  // Extrai categorias únicas para o filtro
  const uniqueCategories = useMemo(() => {
    const cats = allMerchants.map(m => m.category).filter(Boolean);
    return Array.from(new Set(cats));
  }, [allMerchants]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Buscando lojas aprovadas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-4xl font-bold text-indigo-800 text-center">Buscar Estabelecimentos</h1>

      {!selectedAddress && (
        <Alert className="bg-brand-accent/10 border-brand-accent/50 rounded-2xl">
          <MapPin className="h-4 w-4 text-brand-accent" />
          <AlertDescription className="text-sm font-medium text-indigo-900">
            Selecione um endereço para filtrar as lojas que entregam em sua região.
          </AlertDescription>
        </Alert>
      )}

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
                  {uniqueCategories.map(cat => (
                    <div key={cat} className="flex items-center space-x-2">
                      <RadioGroupItem value={cat} id={`category-${cat}`} />
                      <Label htmlFor={`category-${cat}`} className="capitalize">{cat}</Label>
                    </div>
                  ))}
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
              <div key={index} className={cn(!restaurant.is_open && "opacity-50 grayscale")}>
                <RestaurantCard
                  id={restaurant.id}
                  name={restaurant.name}
                  cuisine={restaurant.cuisine}
                  imageUrl={restaurant.imageUrl}
                  rating={restaurant.rating}
                  deliveryTime={restaurant.deliveryTime}
                />
                {!restaurant.is_open && (
                  <Badge className="mt-1 bg-red-500 text-white rounded-full text-xs font-bold w-full justify-center">
                    Fechado
                  </Badge>
                )}
              </div>
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