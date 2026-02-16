"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Clock, Plus, Minus, ShoppingCart, Loader2, Store, Pizza as PizzaIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/utils/toast";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import PizzaSelectionDialog from "@/components/consumer/PizzaSelectionDialog";

const RestaurantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { addItem, getItemCount } = useCart();
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPizza, setSelectedPizza] = useState<any>(null);
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

  const handleAction = (item: any) => {
    const type = item.optiongroups?.type;
    
    if (type === 'PIZZA') {
        setSelectedPizza(item.optiongroups.pizzaDetails);
        setIsPizzaDialogOpen(true);
    } else {
        const quantity = quantities[item.id] || 1;
        addItem({
            id: item.id,
            restaurantId: restaurant.id,
            name: item.name,
            price: parseFloat(item.price.toString()),
            imageUrl: item.imageurl,
        }, quantity);
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category || "Outros")));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Carregando cardápio real...</p>
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
          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-gray-50">
             <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-300" />
                <span className="text-xs font-bold text-gray-600">{restaurant.deliveryTime}</span>
             </div>
             <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-indigo-300" />
                <span className="text-xs font-bold text-gray-600">Taxa: {restaurant.deliveryFee}</span>
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-10">
        {products.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-bold">O cardápio está sendo atualizado.</p>
          </div>
        ) : (
          categories.map((catName) => (
            <section key={catName}>
              <h2 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-accent" />
                {catName}
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {products
                  .filter(p => (p.category || "Outros") === catName)
                  .map((item) => {
                    const isPizza = item.optiongroups?.type === 'PIZZA';
                    return (
                      <Card key={item.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                        <CardContent className="p-4 flex gap-4">
                          <img
                            src={item.imageurl || "https://placehold.co/200x200/f3f4f6/9ca3af?text=Produto"}
                            alt={item.name}
                            className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-2xl shadow-inner bg-gray-50 shrink-0"
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {isPizza && <PizzaIcon className="h-3 w-3 text-brand-accent" />}
                                    <h3 className="font-black text-gray-800 truncate">{item.name}</h3>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{isPizza ? 'A partir de' : 'Valor'}</p>
                                    <p className="text-xl font-black text-indigo-600">R$ {parseFloat(item.price.toString()).toFixed(2)}</p>
                                </div>
                                <Button 
                                    className="rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black h-12 px-6"
                                    onClick={() => handleAction(item)}
                                >
                                    {isPizza ? 'Montar' : <Plus className="h-5 w-5" />}
                                </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </section>
          ))
        )}
      </div>

      {isPizzaDialogOpen && selectedPizza && (
        <PizzaSelectionDialog 
            isOpen={isPizzaDialogOpen}
            onClose={() => { setIsPizzaDialogOpen(false); setSelectedPizza(null); }}
            onAddToCart={(item) => addItem(item, 1)}
            pizzaDetails={selectedPizza}
            restaurantId={restaurant.id}
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