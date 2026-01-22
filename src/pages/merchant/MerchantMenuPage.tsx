"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import ProductDialog from "@/components/merchant/ProductDialog";
import { showSuccess } from "@/utils/toast";

const MerchantMenuPage = () => {
  const [categories] = useState(["Pratos Principais", "Acompanhamentos", "Bebidas", "Sobremesas"]);
  const [products, setProducts] = useState([
    { id: "1", name: "Hambúrguer de Costela", category: "Pratos Principais", price: 35.90, imageUrl: "https://via.placeholder.com/100", description: "Pão brioche, 180g costela, queijo prato." },
    { id: "2", name: "Batata Rústica", category: "Acompanhamentos", price: 18.00, imageUrl: "https://via.placeholder.com/100", description: "Batatas fritas com alecrim e páprica." },
    { id: "3", name: "Suco Natural", category: "Bebidas", price: 9.50, imageUrl: "https://via.placeholder.com/100", description: "Laranja ou Limão." },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = (data: any) => {
    const newProduct = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      price: parseFloat(data.price)
    };
    setProducts([newProduct, ...products]);
    setIsAdding(false);
    showSuccess("Produto adicionado ao seu cardápio!");
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">Meu Cardápio</h1>
          <p className="text-gray-500 text-sm">Organize seus produtos e preços.</p>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold h-12 px-6 shadow-lg shadow-brand-accent/20">
              <Plus className="h-5 w-5 mr-2" /> Novo Produto
            </Button>
          </DialogTrigger>
          <ProductDialog categories={categories} onSave={handleSave} />
        </Dialog>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <Badge key={cat} variant="secondary" className="px-4 py-2 rounded-xl text-sm cursor-pointer hover:bg-indigo-100 transition-colors shrink-0">
            {cat}
          </Badge>
        ))}
        <Button variant="ghost" size="sm" className="rounded-xl text-indigo-600 font-bold shrink-0">
          + Criar Categoria
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input 
          placeholder="Buscar no cardápio..." 
          className="rounded-2xl pl-10 h-12 bg-white border-none shadow-sm focus:ring-2 focus:ring-indigo-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <img src={product.imageUrl} className="w-20 h-20 rounded-2xl object-cover bg-gray-50" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-indigo-400 border-indigo-100 mb-1">
                      {product.category}
                    </Badge>
                    <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                  </div>
                  <span className="font-black text-indigo-600">R$ {product.price.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1 mt-1">{product.description}</p>
              </div>
              <div className="flex gap-1 ml-2">
                <Button variant="ghost" size="icon" className="rounded-full text-gray-400 hover:text-indigo-600">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MerchantMenuPage;