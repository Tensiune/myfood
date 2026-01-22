"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import { showError } from "@/utils/toast";

interface CategorySelectionStepProps {
  category: string;
  setCategory: (category: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const CategorySelectionStep: React.FC<CategorySelectionStepProps> = ({ 
  category, 
  setCategory, 
  onNext, 
  onBack 
}) => {
  const categories = [
    "mercado", "açai", "africana", "alemã", "árabe", "argentina", "brasileira", 
    "cafeteria", "carnes", "casa de sucos", "chinesa", "colombiana", "congelados", 
    "coreana", "doces e bolos", "espanhola", "francesa", "frutos do mar", "indiana", 
    "italiana", "japonesa", "lanches", "marmita", "mediterrânea", "mexicana", 
    "padaria", "pastel", "peixes", "peruana", "pizza", "portuguesa", "salgados", 
    "saudável", "sorvetes", "tailandesa", "vegetariana"
  ];

  const handleCategorySelect = () => {
    if (!category) {
      showError("Por favor, selecione uma categoria.");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Store className="h-16 w-16 text-brand-accent mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Categoria do Estabelecimento</h3>
        <p className="text-gray-600">
          Selecione a categoria que melhor representa o seu negócio
        </p>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {categories.map((cat) => (
          <div 
            key={cat}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              category === cat 
                ? "border-brand-accent bg-brand-accent/10" 
                : "border-gray-200 hover:border-brand-accent"
            }`}
            onClick={() => setCategory(cat)}
          >
            <p className="font-medium text-gray-800 capitalize">{cat}</p>
          </div>
        ))}
      </div>
      
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1 rounded-xl"
          onClick={onBack}
        >
          Voltar
        </Button>
        <Button 
          className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3"
          onClick={handleCategorySelect}
          disabled={!category}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};

export default CategorySelectionStep;