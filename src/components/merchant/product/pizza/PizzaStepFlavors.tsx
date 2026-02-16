"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ImagePlus, Loader2, UtensilsCrossed } from "lucide-react";
import { PizzaFlavor, PizzaSize } from "@/types/product";
import { uploadImage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";

interface PizzaStepFlavorsProps {
  flavors: PizzaFlavor[];
  setFlavors: (flavors: PizzaFlavor[]) => void;
  sizes: PizzaSize[];
}

const PizzaStepFlavors: React.FC<PizzaStepFlavorsProps> = ({ flavors, setFlavors, sizes }) => {
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const addFlavor = () => {
    const initialPrices: Record<string, number> = {};
    sizes.forEach(s => initialPrices[s.id] = 0);
    
    setFlavors([...flavors, { 
      id: Date.now().toString(), 
      name: "", 
      description: "", 
      imageUrl: "", 
      prices: initialPrices,
      available: true 
    }]);
  };

  const removeFlavor = (id: string) => {
    setFlavors(flavors.filter(f => f.id !== id));
  };

  const updateFlavor = (id: string, field: keyof PizzaFlavor, value: any) => {
    setFlavors(flavors.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const updatePrice = (flavorId: string, sizeId: string, price: number) => {
    setFlavors(flavors.map(f => {
      if (f.id === flavorId) {
        return { ...f, prices: { ...f.prices, [sizeId]: price } };
      }
      return f;
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, flavorId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(flavorId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const url = await uploadImage(file, `merchants/${user?.id}/pizza-flavors`);
      if (url) {
        updateFlavor(flavorId, "imageUrl", url);
        showSuccess("Imagem do sabor carregada!");
      }
    } catch (err) {
      showError("Erro no upload.");
    } finally {
      setIsUploading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-black text-indigo-900 text-xl">4. Sabores</h3>
          <p className="text-sm text-gray-500">Cadastre os sabores e seus preços por tamanho.</p>
        </div>
        <Button onClick={addFlavor} className="rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold">
          <Plus className="h-4 w-4 mr-1" /> Novo Sabor
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {flavors.map((f) => (
          <div key={f.id} className="p-8 bg-white border-2 border-indigo-50 rounded-[2.5rem] shadow-sm space-y-6 relative overflow-hidden group hover:border-brand-accent/50 transition-all">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Foto e Info Básica */}
              <div className="md:col-span-4 space-y-4">
                <div className="relative aspect-square rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center">
                  {isUploading === f.id ? (
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  ) : f.imageUrl ? (
                    <img src={f.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <ImagePlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <span className="text-[10px] font-black text-gray-400 uppercase">Adicionar Foto</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => handleImageUpload(e, f.id)}
                    accept="image/*"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase">Nome do Sabor</Label>
                  <Input 
                    value={f.name} 
                    onChange={(e) => updateFlavor(f.id, "name", e.target.value)}
                    placeholder="Ex: Margherita Especial" 
                    className="rounded-xl font-bold border-gray-100"
                  />
                </div>
              </div>

              {/* Descrição e Preços */}
              <div className="md:col-span-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase">Ingredientes / Descrição</Label>
                  <Textarea 
                    value={f.description} 
                    onChange={(e) => updateFlavor(f.id, "description", e.target.value)}
                    placeholder="Molho, muçarela, tomate fatiado..." 
                    className="rounded-xl resize-none h-20 border-gray-100"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Preços por Tamanho (R$)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sizes.map(s => (
                      <div key={s.id} className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
                        <p className="text-[9px] font-black text-indigo-600 uppercase truncate mb-1">{s.name}</p>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={f.prices[s.id] || 0}
                          onChange={(e) => updatePrice(f.id, s.id, parseFloat(e.target.value))}
                          className="h-9 rounded-lg font-bold border-none bg-white text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeFlavor(f.id)} 
                className="absolute top-4 right-4 text-red-200 hover:text-red-500 rounded-full"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ))}
        {flavors.length === 0 && (
          <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
            <UtensilsCrossed className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nenhum sabor cadastrado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PizzaStepFlavors;