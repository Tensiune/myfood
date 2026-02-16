"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Maximize2 } from "lucide-react";
import { PizzaSize } from "@/types/product";

interface PizzaStepSizesProps {
  sizes: PizzaSize[];
  setSizes: (sizes: PizzaSize[]) => void;
}

const PizzaStepSizes: React.FC<PizzaStepSizesProps> = ({ sizes, setSizes }) => {
  const addSize = () => {
    setSizes([...sizes, { id: Date.now().toString(), name: "", pieces: 8, maxFlavors: 2 }]);
  };

  const removeSize = (id: string) => {
    setSizes(sizes.filter(s => s.id !== id));
  };

  const updateSize = (id: string, field: keyof PizzaSize, value: any) => {
    setSizes(sizes.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-black text-indigo-900 text-xl">1. Tamanhos</h3>
          <p className="text-sm text-gray-500">Defina os tamanhos de pizza disponíveis.</p>
        </div>
        <Button onClick={addSize} variant="outline" className="rounded-xl border-indigo-200 text-indigo-600 font-bold">
          <Plus className="h-4 w-4 mr-1" /> Novo Tamanho
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sizes.map((s) => (
          <div key={s.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end animate-in fade-in">
            <div className="sm:col-span-5 space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">Nome (ex: Grande 35cm)</Label>
              <Input 
                value={s.name} 
                onChange={(e) => updateSize(s.id, "name", e.target.value)}
                placeholder="Nome do tamanho" 
                className="rounded-xl bg-white h-12"
              />
            </div>
            <div className="sm:col-span-3 space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">Pedaços</Label>
              <Input 
                type="number" 
                value={s.pieces} 
                onChange={(e) => updateSize(s.id, "pieces", parseInt(e.target.value))}
                className="rounded-xl bg-white h-12"
              />
            </div>
            <div className="sm:col-span-3 space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">Sabores (1 a 4)</Label>
              <Input 
                type="number" 
                min={1} 
                max={4} 
                value={s.maxFlavors} 
                onChange={(e) => updateSize(s.id, "maxFlavors", parseInt(e.target.value))}
                className="rounded-xl bg-white h-12"
              />
            </div>
            <div className="sm:col-span-1">
              <Button variant="ghost" size="icon" onClick={() => removeSize(s.id)} className="h-12 w-full text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl">
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ))}
        {sizes.length === 0 && (
          <div className="text-center py-10 bg-indigo-50/50 rounded-3xl border-2 border-dashed border-indigo-100">
            <Maximize2 className="h-10 w-10 text-indigo-200 mx-auto mb-2" />
            <p className="text-indigo-400 font-bold">Nenhum tamanho configurado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PizzaStepSizes;