"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Clock, Plus, ShoppingCart, Loader2, Pizza as PizzaIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/utils/toast";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import PizzaSelectionDialog from "@/components/consumer/PizzaSelectionDialog";

const RestaurantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, getItemCount } = useCart();
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [pizzaDetails, setPizzaDetails] = useState<any>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | undefined>(undefined);
  const [isPizzaDialogOpen, setIsPizzaDialogOpen] = useState(false);

  useEffect(() => {
    const fetchRestaurantAndProducts = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: merchant, error: mError } = await supabase
          .from('merchant_applications')
          .select('*')
          .eq('id', id)
          .single();

        if (mError) throw mError;

        const meta = merchant.metadata || {};
        const storeDetails = meta.store_details || {};

        setRestaurant({
          id: merchant.id,
          name: merchant.store_name || storeDetails.name || "Loja",
          cuisine: meta.category || "Restaurante",
          imageUrl: storeDetails.imageUrl || `https://placehold.co/800x300/6366f1/ffffff?text=${encodeURIComponent(merchant.store_name || "Loja")}`,
          rating: 5.0,
          deliveryTime: "30-45 min",
          deliveryFee: "R$ 5,00",
          description: storeDetails.description || "Descrição não disponível."
        });

        const { data: pData, error: pError } = await supabase
          .from('products')
          .select('*')
          .eq('merchant_id', id)
          .eq('isavailable', true);

        if (pError) throw pError;
        setProducts(pData || []);

      } catch (err: any) {
        console.error(err);
        showError("Erro ao carregar dados da loja.");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantAndProducts();
  }, [id]);

  // Função para "explodir" pizzas em tamanhos individuais
  const flattenedProducts = useMemo(() => {
    const result: any[] = [];
    
    products.forEach(p => {
        if (p.optiongroups?.type === 'PIZZA' && p.optiongroups?.pizzaDetails?.sizes) {
            const pizza = p.optiongroups.pizzaDetails;
            pizza.sizes.forEach((size: any) => {
                // Calcula o menor preço possível para este tamanho (a partir de)
                const validFlavors = pizza.flavors.filter((f: any) => f.available && f.prices[size.id] > 0);
                const minFlavorPrice = validFlavors.length > 0 ? Math.min(...validFlavors.map((f: any) => f.prices[size.id])) : 0;
                const minDoughPrice = pizza.doughs.filter((d: any) => d.available).length > 0 ? Math.min(...pizza.doughs.filter((d: any) => d.available).map((d: any) => d.price)) : 0;
                const minCrustPrice = pizza.crusts.filter((c: any) => c.available).length > 0 ? Math.min(...pizza.crusts.filter((c: any) => c.available).map((c: any) => c.price)) : 0;
                
                result.push({
                    ...p,
                    id: `${p.id}-${size.id}`, // ID virtual para a lista
                    originalId: p.id,
                    name: `Pizza ${size.name}`,
                    description: `Escolha até ${size.maxFlavors} sabores • ${size.pieces} pedaços.`,
                    price: minFlavorPrice + minDoughPrice + minCrustPrice,
                    isPizzaSize: true,
                    sizeId: size.id,
                    pizzaDetails: pizza
                });
            });
        } else {
            result.push(p);
        }
    });
    
    return result;
  }, [products]);

  const handleAction = (item: any) => {
    if (item.isPizzaSize) {
        setPizzaDetails(item.pizzaDetails);
        setSelectedSizeId(item.sizeId);
        setIsPizzaDialogOpen(true);
    } else {
        addItem({
            id: item.id,
            restaurantId: restaurant.id,
            name: item.name,
            price: parseFloat(item.price.toString()),
            imageUrl: item.imageurl,
        }, 1);
    }
  };

  const categories = Array.from(new Set(flattenedProducts.map(p => p.category || "Outros")));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Montando o cardápio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <Card className="rounded-[2.5rem] shadow-lg overflow-hidden border-none bg-white">
        <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-56 object-cover" />
        <CardContent className="p-8">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-black text-indigo-900 leading-tight">{restaurant.name}</CardTitle>
              <p className="text-indigo-400 font-bold uppercase tracking-wider text-xs">{restaurant.cuisine}</p>
            </div>
            <Badge className="bg-green-50 text-green-600 border-none font-black px-4 py-2 rounded-2xl text-lg">
              <Star className="h-5 w-5 mr-1 fill-green-600" /> {restaurant.rating.toFixed(1)}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-4 leading-relaxed">{restaurant.description}</p>
        </CardContent>
      </Card>

      <div className="space-y-10">
        {flattenedProducts.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-bold">Cardápio em atualização.</p>
          </div>
        ) : (
          categories.map((catName) => (
            <section key={catName}>
              <h2 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2 px-2">
                <span className="h-2 w-2 rounded-full bg-brand-accent" />
                {catName}
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {flattenedProducts
                  .filter(p => (p.category || "Outros") === catName)
                  .map((item) => (
                    <Card key={item.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                      <CardContent className="p-4 flex gap-4">
                        <div className="relative">
                            <img
                              src={item.imageurl || "https://placehold.co/200x200/f3f4f6/9ca3af?text=Pizza"}
                              alt={item.name}
                              className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-2xl shadow-inner bg-gray-50 shrink-0"
                            />
                            {item.isPizzaSize && (
                                <div className="absolute top-2 right-2 bg-brand-accent text-white p-1.5 rounded-xl shadow-lg">
                                    <PizzaIcon size={14} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                              <h3 className="font-black text-gray-800 truncate">{item.name}</h3>
                              <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>
                          </div>
                          <div className="flex items-center justify-between">
                              <div>
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.isPizzaSize ? 'A partir de' : 'Valor'}</p>
                                  <p className="text-xl font-black text-indigo-600">R$ {parseFloat(item.price.toString()).toFixed(2)}</p>
                              </div>
                              <Button 
                                  className="rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black h-12 px-6"
                                  onClick={() => handleAction(item)}
                              >
                                  {item.isPizzaSize ? 'Montar' : <Plus className="h-5 w-5" />}
                              </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </section>
          ))
        )}
      </div>

      {isPizzaDialogOpen && pizzaDetails && (
        <PizzaSelectionDialog 
            isOpen={isPizzaDialogOpen}
            onClose={() => { setIsPizzaDialogOpen(false); setPizzaDetails(null); }}
            onAddToCart={(item) => addItem(item, 1)}
            pizzaDetails={pizzaDetails}
            restaurantId={restaurant.id}
            initialSizeId={selectedSizeId}
        />
      )}

      {getItemCount() > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-20 safe-area-bottom">
          <Button
            className="w-full rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black h-16 text-lg shadow-2xl shadow-brand-accent/20"
            onClick={() => navigate("/cart")}
          >
            <ShoppingCart className="h-6 w-6 mr-3" />
            Ver Carrinho ({getItemCount()})
          </Button>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetailPage;