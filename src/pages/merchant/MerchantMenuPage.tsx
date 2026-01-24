"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Trash2, Edit2, Package, EyeOff, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import ProductDialog from "@/components/merchant/ProductDialog";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const MerchantMenuPage = () => {
  const [categories, setCategories] = useState(["Pratos Principais", "Acompanhamentos", "Bebidas", "Sobremesas"]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newCatName, setNewCatName] = useState("");
  const [isAddingCat, setIsAddingCat] = useState(false);

  useEffect(() => {
    const loadMenu = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('merchant_id', user.id);

        if (error) throw error;
        if (data) setProducts(data);
      } catch (err) {
        console.error("Erro ao carregar menu:", err);
        showError("Erro ao carregar seus produtos do servidor.");
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, []);

  const handleSaveProduct = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mapeamento crucial: convertendo camelCase do front para snake_case/lowercase do banco
    const productData = {
      merchant_id: user.id,
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      category: data.category,
      imageurl: data.imageUrl || "https://via.placeholder.com/300?text=Sem+Imagem",
      isavailable: data.isAvailable ?? true,
      stock: data.stock ? parseInt(data.stock) : null,
      optiongroups: data.optionGroups || [],
    };

    try {
      const { data: savedData, error } = await supabase
        .from('products')
        .upsert({ 
          ...(editingProduct?.id ? { id: editingProduct.id } : {}),
          ...productData 
        })
        .select()
        .single();

      if (error) throw error;

      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? savedData : p));
        showSuccess("Produto atualizado com sucesso!");
      } else {
        setProducts([savedData, ...products]);
        showSuccess("Produto salvo com sucesso no servidor!");
      }
      
      setIsAddingProduct(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error(err);
      showError("Erro ao salvar no Supabase: " + err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
      showSuccess("Produto removido.");
    } catch (err: any) {
      showError("Erro ao remover: " + err.message);
    }
  };

  const toggleAvailability = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newStatus = !product.isavailable;
    
    // Update local state first for UX
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isavailable: newStatus } : p));

    try {
      const { error } = await supabase.from('products').update({ isavailable: newStatus }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      // Revert if failed
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isavailable: !newStatus } : p));
      showError("Não foi possível atualizar a disponibilidade.");
    }
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    if (categories.includes(newCatName)) {
      showError("Categoria já existe.");
      return;
    }
    setCategories([...categories, newCatName]);
    setNewCatName("");
    setIsAddingCat(false);
    showSuccess("Categoria criada!");
  };

  const removeCategory = (cat: string) => {
    if (products.some(p => p.category === cat)) {
      showError("Não é possível excluir categorias que possuem produtos.");
      return;
    }
    setCategories(categories.filter(c => c !== cat));
    showSuccess("Categoria removida.");
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Gestão do Cardápio</h1>
          <p className="text-gray-500 text-sm">Controle seus produtos e categorias em tempo real.</p>
        </div>
        <Dialog open={isAddingProduct} onOpenChange={(open) => { setIsAddingProduct(open); if(!open) setEditingProduct(null); }}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black h-14 px-8 shadow-xl shadow-brand-accent/20">
              <Plus className="h-5 w-5 mr-2" /> Novo Produto
            </Button>
          </DialogTrigger>
          <ProductDialog 
            categories={categories} 
            product={editingProduct ? {
              ...editingProduct,
              imageUrl: editingProduct.imageurl, // Map back for dialog
              isAvailable: editingProduct.isavailable,
              optionGroups: editingProduct.optiongroups
            } : null} 
            onSave={handleSaveProduct} 
          />
        </Dialog>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-indigo-900 text-sm uppercase tracking-wider">Categorias</h2>
          <Dialog open={isAddingCat} onOpenChange={setIsAddingCat}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl">
                + Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl sm:max-w-md">
              <DialogHeader><DialogTitle>Criar Categoria</DialogTitle></DialogHeader>
              <div className="py-4 space-y-4">
                <Input 
                  placeholder="Nome da categoria (ex: Massas)" 
                  value={newCatName} 
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="rounded-xl"
                />
                <Button onClick={handleAddCategory} className="w-full rounded-xl bg-indigo-600">Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <div key={cat} className="group relative">
              <Badge variant="secondary" className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all border-none flex items-center gap-2">
                {cat}
                <button onClick={() => removeCategory(cat)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
        <Input 
          placeholder="Buscar produtos..." 
          className="rounded-2xl pl-12 h-14 bg-white border-none shadow-sm focus:ring-2 focus:ring-indigo-100 text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Carregando cardápio...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className={cn(
              "rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white",
              !product.isavailable && "opacity-75 grayscale-[0.5]"
            )}>
              <CardContent className="p-5 flex flex-col md:flex-row items-center gap-6">
                <div className="relative shrink-0">
                  <img src={product.imageurl} className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover bg-gray-50 shadow-inner" />
                  {!product.isavailable && (
                    <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center">
                      <EyeOff className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 space-y-1 w-full text-center md:text-left">
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-black text-indigo-400 border-indigo-50">
                      {product.category}
                    </Badge>
                    {product.stock && (
                      <Badge variant="secondary" className="text-[10px] uppercase font-black bg-gray-100 text-gray-500 border-none">
                        <Package className="h-3 w-3 mr-1" /> {product.stock} em estoque
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-black text-xl text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                  <div className="pt-2">
                     <span className="text-2xl font-black text-indigo-600">R$ {product.price ? parseFloat(product.price.toString()).toFixed(2) : '0.00'}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                    <Switch 
                      checked={product.isavailable} 
                      onCheckedChange={() => toggleAvailability(product.id)}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl border-gray-100 hover:bg-indigo-50 hover:text-indigo-600 gap-2 h-11"
                      onClick={() => {
                        setEditingProduct(product);
                        setIsAddingProduct(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" /> Editar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-xl text-red-400 hover:bg-red-50 hover:text-red-500 h-11 w-11"
                      onClick={() => deleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredProducts.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-100">
              <Package className="h-16 w-16 text-gray-100 mx-auto mb-4" />
              <p className="text-gray-400 font-bold">Nenhum produto cadastrado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MerchantMenuPage;