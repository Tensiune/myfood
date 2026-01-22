"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Loader2 } from "lucide-react";

interface ProductDialogProps {
  product?: any;
  onSave: (data: any) => void;
  categories: string[];
}

const ProductDialog: React.FC<ProductDialogProps> = ({ product, onSave, categories }) => {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "",
    category: product?.category || categories[0],
    imageUrl: product?.imageUrl || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent className="sm:max-w-[500px] rounded-3xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-indigo-900">
          {product ? "Editar Produto" : "Novo Produto"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-5 py-4">
        <div className="flex justify-center">
          <div className="w-full h-40 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:bg-gray-200 transition-colors">
            {formData.imageUrl ? (
              <img src={formData.imageUrl} className="w-full h-full object-cover" />
            ) : (
              <>
                <ImagePlus className="h-10 w-10 text-gray-400 mb-2" />
                <span className="text-xs font-bold text-gray-500">Adicionar Foto</span>
              </>
            )}
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => {
                // Simulação de upload
                setFormData({...formData, imageUrl: "https://via.placeholder.com/400x300/indigo/white?text=Produto"})
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Nome do Prato</Label>
          <Input 
            value={formData.name} 
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Ex: Burger Gourmet" 
            className="rounded-xl" 
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Preço (R$)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.price} 
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              placeholder="0,00" 
              className="rounded-xl" 
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea 
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Descreva os ingredientes..." 
            className="rounded-xl resize-none h-24" 
          />
        </div>

        <DialogFooter className="pt-4">
          <Button type="submit" className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default ProductDialog;