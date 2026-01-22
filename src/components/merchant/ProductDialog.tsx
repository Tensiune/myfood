"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, Plus, Trash2, Settings2, Package } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Option {
  id: string;
  name: string;
  price: number;
}

interface OptionGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  options: Option[];
}

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
    isAvailable: product?.isAvailable ?? true,
    stock: product?.stock || "",
    optionGroups: (product?.optionGroups as OptionGroup[]) || [],
  });

  const addOptionGroup = () => {
    const newGroup: OptionGroup = {
      id: Date.now().toString(),
      name: "",
      min: 0,
      max: 1,
      options: [],
    };
    setFormData({ ...formData, optionGroups: [...formData.optionGroups, newGroup] });
  };

  const removeGroup = (id: string) => {
    setFormData({ ...formData, optionGroups: formData.optionGroups.filter(g => g.id !== id) });
  };

  const addOption = (groupId: string) => {
    setFormData({
      ...formData,
      optionGroups: formData.optionGroups.map(g => {
        if (g.id === groupId) {
          return { ...g, options: [...g.options, { id: Date.now().toString(), name: "", price: 0 }] };
        }
        return g;
      })
    });
  };

  const updateOption = (groupId: string, optionId: string, field: keyof Option, value: any) => {
    setFormData({
      ...formData,
      optionGroups: formData.optionGroups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            options: g.options.map(o => o.id === optionId ? { ...o, [field]: value } : o)
          };
        }
        return g;
      })
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent className="sm:max-w-[700px] rounded-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
      <DialogHeader className="p-6 pb-2">
        <DialogTitle className="text-2xl font-black text-indigo-900 flex items-center gap-2">
          {product ? "Editar Produto" : "Novo Produto"}
        </DialogTitle>
      </DialogHeader>

      <ScrollArea className="flex-1 px-6">
        <form id="product-form" onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="w-full h-44 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-brand-accent transition-colors">
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImagePlus className="h-10 w-10 text-gray-300 mb-2" />
                    <span className="text-xs font-bold text-gray-400">Capa do Produto</span>
                  </>
                )}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={() => {}} />
              </div>

              <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl">
                <div className="flex flex-col">
                  <Label className="text-indigo-900 font-bold">Disponível</Label>
                  <span className="text-[10px] text-gray-500 uppercase">Visível no app</span>
                </div>
                <Switch 
                  checked={formData.isAvailable} 
                  onCheckedChange={(v) => setFormData({...formData, isAvailable: v})} 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Prato</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Pizza de Calabresa" 
                  className="rounded-xl border-gray-200" required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço (R$)</Label>
                  <Input 
                    type="number" step="0.01" value={formData.price} 
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0,00" className="rounded-xl border-gray-200" required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque</Label>
                  <Input 
                    type="number" value={formData.stock} 
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    placeholder="Livre" className="rounded-xl border-gray-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="rounded-xl border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Ingredientes e detalhes do prato..." 
              className="rounded-xl resize-none h-20 border-gray-200" 
            />
          </div>

          <Separator />

          {/* Complementos e Opções */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-lg text-indigo-900">Complementos / Sabores</h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addOptionGroup} className="rounded-xl border-indigo-100 text-indigo-600 font-bold">
                <Plus className="h-4 w-4 mr-1" /> Adicionar Grupo
              </Button>
            </div>

            <div className="space-y-4">
              {formData.optionGroups.map((group) => (
                <div key={group.id} className="p-4 border border-indigo-100 rounded-2xl bg-white space-y-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs uppercase text-gray-400 font-bold">Nome do Grupo (ex: Escolha os sabores)</Label>
                      <Input 
                        placeholder="Nome do grupo" 
                        value={group.name} 
                        onChange={(e) => setFormData({
                          ...formData,
                          optionGroups: formData.optionGroups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g)
                        })}
                        className="rounded-xl font-bold"
                      />
                    </div>
                    <div className="w-20 space-y-2">
                      <Label className="text-xs uppercase text-gray-400 font-bold">Mín</Label>
                      <Input type="number" value={group.min} onChange={(e) => setFormData({...formData, optionGroups: formData.optionGroups.map(g => g.id === group.id ? { ...g, min: parseInt(e.target.value) } : g)})} className="rounded-xl" />
                    </div>
                    <div className="w-20 space-y-2">
                      <Label className="text-xs uppercase text-gray-400 font-bold">Máx</Label>
                      <Input type="number" value={group.max} onChange={(e) => setFormData({...formData, optionGroups: formData.optionGroups.map(g => g.id === group.id ? { ...g, max: parseInt(e.target.value) } : g)})} className="rounded-xl" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeGroup(group.id)} className="mt-6 text-red-400 hover:text-red-500 rounded-full">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-2 pl-4 border-l-2 border-indigo-50">
                    {group.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-3">
                        <Input 
                          placeholder="Nome da opção" 
                          value={opt.name} 
                          onChange={(e) => updateOption(group.id, opt.id, "name", e.target.value)}
                          className="flex-1 rounded-lg h-9 text-sm"
                        />
                        <Input 
                          type="number" 
                          placeholder="R$ 0,00" 
                          value={opt.price} 
                          onChange={(e) => updateOption(group.id, opt.id, "price", parseFloat(e.target.value))}
                          className="w-24 rounded-lg h-9 text-sm"
                        />
                        <button 
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            optionGroups: formData.optionGroups.map(g => g.id === group.id ? { ...g, options: g.options.filter(o => o.id !== opt.id) } : g)
                          })}
                          className="text-gray-300 hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button type="button" variant="ghost" size="sm" onClick={() => addOption(group.id)} className="text-[10px] font-bold uppercase text-indigo-400 hover:text-indigo-600">
                      + Adicionar Item (ex: Muçarela)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </ScrollArea>

      <div className="p-6 bg-gray-50 border-t border-gray-100">
        <Button form="product-form" type="submit" className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black h-14 text-lg shadow-xl shadow-indigo-100">
          {product ? "Salvar Alterações" : "Adicionar ao Cardápio"}
        </Button>
      </div>
    </DialogContent>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default ProductDialog;