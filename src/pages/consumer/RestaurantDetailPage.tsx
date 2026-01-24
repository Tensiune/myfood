"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Clock, Plus, Minus, ShoppingCart, Loader2, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/utils/toast";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

const RestaurantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { addItem, getItemCount } = useCart();
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurantAndProducts = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 1. Buscar dados do lojista
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
          imageUrl: storeDetails.imageUrl || "https://via.placeholder.com/800x300/indigo/FFFFFF?text=" + encodeURIComponent(merchant.store_name || "Loja"),
          rating: 5.0,
          deliveryTime: "30-45 min",
          deliveryFee: "R$ 5,00",
          description: storeDetails.description || "Descrição não disponível."
        });

        // 2. Buscar produtos reais
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

  const handleAddToCart = (item: any) => {
    const quantity = quantities[item.id] || 0;
    if (quantity > 0) {
      addItem(
        {
          id: item.id,
          restaurantId: restaurant.id,
          name: item.name,
          price: parseFloat(item.price.toString()),
          imageUrl: item.imageurl,
        },
        quantity
      );
      setQuantities(prev => ({ ...prev, [item.id]: 0 }));
    }
  };

  // Organizar produtos por categoria
  const categories = Array.from(new Set(products.map(p => p.category || "Outros")));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Carregando cardápio real...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Store className="h-16 w-16 text-gray-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Restaurante não encontrado</h2>
        <Button className="mt-4 rounded-xl bg-indigo-600" onClick={() => navigate("/")}>Voltar para o início</Button>
      </div>
    );
  }

  const totalItems = getItemCount();

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
        {products.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
            <p className="text-gray-500">Nenhum produto disponível no momento.</p>
          </div>
        ) : (
          categories.map((catName) => (
            <section key={catName}>
              <h2 className="text-xl font-semibold text-indigo-700 mb-3 border-b-2 border-indigo-200 pb-2">
                {catName}
              </h2>
              <div className="space-y-4">
                {products
                  .filter(p => (p.category || "Outros") === catName)
                  .map((item) => (
                    <Card key={item.id} className="rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                      <CardContent className="p-3">
                        <div className="flex space-x-3">
                          <img
                            src={item.imageurl || "https://via.placeholder.com/200?text=Produto"}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1 space-y-1">
                            <h3 className="font-semibold text-gray-800">{item.name}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                            <p className="font-bold text-indigo-600">R$ {parseFloat(item.price.toString()).toFixed(2).replace('.', ',')}</p>
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
                              onClick={() => handleAddToCart(item)}
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
          ))
        )}
      </div>

      {/* Carrinho Flutuante */}
      {totalItems > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white shadow-lg border-t border-gray-200 z-20">
          <Button
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 text-lg"
            onClick={() => navigate("/cart")}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Ver Carrinho ({totalItems} item{totalItems !== 1 ? 's' : ''})
          </Button>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetailPage;