"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Utensils, Box, Pizza, Check } from "lucide-react";
import { ProductType } from "@/types/product";
import { cn } from "@/lib/utils";

interface ProductTypeSelectorProps {
  selected: ProductType | null;
  onSelect: (type: ProductType) => void;
}

const ProductTypeSelector: React.FC<ProductTypeSelectorProps> = ({ selected, onSelect }) => {
  const types = [
    { id: 'PREPARED', label: 'Produto Preparado', desc: 'Bolo, marmita, lanches, etc.', icon: Utensils },
    { id: 'INDUSTRIALIZED', label: 'Produto Industrializado', desc: 'Refri, bala, chocolate, etc.', icon: Box },
    { id: 'PIZZA', label: 'Pizza', desc: 'Tamanhos, massas, bordas e sabores.', icon: Pizza },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      {types.map((t) => {
        const Icon = t.icon;
        const isSelected = selected === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id as ProductType)}
            className={cn(
              "flex items-center gap-4 p-6 rounded-3xl border-4 transition-all text-left",
              isSelected ? "border-indigo-600 bg-indigo-50" : "border-gray-50 bg-gray-50/50 hover:bg-gray-50"
            )}
          >
            <div className={cn("p-4 rounded-2xl", isSelected ? "bg-indigo-600 text-white" : "bg-white text-gray-400")}>
              <Icon className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-indigo-900 text-lg">{t.label}</h3>
              <p className="text-sm text-gray-500">{t.desc}</p>
            </div>
            {isSelected && <Check className="h-6 w-6 text-indigo-600" />}
          </button>
        );
      })}
    </div>
  );
};

export default ProductTypeSelector;