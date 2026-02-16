"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, CircleDot } from "lucide-react";
import { PizzaCrust } from "@/types/product";

interface PizzaStepCrustProps {
  crusts: PizzaCrust[];
  setCrusts: (crusts: PizzaCrust[]) => void;
}

const PizzaStepCrust: React.FC<PizzaStepCrustProps> = ({ crusts, setCrusts }) => {
  const addCrust = () => {
    setCrusts([...crusts, { id: Date.now().toString(), name: "", price: 0, available: true }]);
  };

  const removeCrust = (id: string) => {
    setCrusts(crusts.filter(c => c.id !== id));
  };

  const updateCrust = (id: string, field: keyof PizzaCrust, value: any) => {
    setCrusts(crusts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-black text-indigo-900 text-xl">3. Tipos de Borda</h3>
          <p className="text-sm text-gray-500">Configure as bordas recheadas ou tradicionais.</p>
        </div>
        <Button onClick={addCrust} variant="outline" className="rounded-xl border-indigo-200 text-indigo-600 font-bold">
          <Plus className="h-4 w-4 mr-1" /> Nova Borda
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {crusts.map((c) => (
          <div key={c.id} className="p-6 bg-white border-2 border-gray-100 rounded-3xl flex flex-col sm:flex-row gap-6 items-center shadow-sm">
            <div className="flex-1 w-full space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase">Nome da Borda</Label>
              <Input 
                value={c.name} 
                onChange={(e) => updateCrust(c.id, "name", e.target.value)}
                placeholder="Ex: Borda de Catupiry" 
                className="rounded-xl h-12"
              />
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase">Valor Adicional</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={c.price} 
                  onChange={(e) => updateCrust(c.id, "price", parseFloat(e.target.value))}
                  className="rounded-xl h-12 pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase">Status</span>
                <span className="text-xs font-bold text-indigo-900">{c.available ? 'Ativo' : 'Esgotado'}</span>
              </div>
              <Switch checked={c.available} onCheckedChange={(v) => updateCrust(c.id, "available", v)} />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeCrust(c.id)} className="h-12 w-12 text-red-300 hover:text-red-500 rounded-xl">
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ))}
        {crusts.length === 0 && (
          <div className="text-center py-10 bg-indigo-50/50 rounded-3xl border-2 border-dashed border-indigo-100">
            <CircleDot className="h-10 w-10 text-indigo-200 mx-auto mb-2" />
            <p className="text-indigo-400 font-bold">Nenhuma borda configurada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PizzaStepCrust;