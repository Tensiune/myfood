"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, Plus, Trash2, Settings2, X, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { showSuccess, showError } from "@/utils/toast";
import { uploadImage } from "@/lib/storage";

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
  const [isUploading, setIsUploading] = useState(false);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Using a placeholder path for the merchant ID. In a real app, this should be the actual merchant ID.
    const merchantId = "merchant_123"; 
    const imageUrl = await uploadImage(file, merchantId);

    if (imageUrl) {
      setFormData(prev => ({ ...prev, imageUrl }));
    }
    
    setIsUploading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category) {
      showError("Preencha o nome, preço e categoria do produto.");
      return;
    }
    onSave(formData);
  };

  return (
    <DialogContent className="sm:max-w-[700px] w-[95vw] rounded-3xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
      <DialogHeader className="p-6 pb-4 bg-white border-b shrink-0">
        <DialogTitle className="text-2xl font-black text-indigo-900">
          {product ? "Editar Produto" : "Novo Produto"}
        </DialogTitle>
      </DialogHeader>

      <ScrollArea className="flex-1 w-full bg-white">
        <div className="p-6">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="w-full h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-brand-accent transition-all">
                  {isUploading ? (
                    <Loader2 className="h-10 w-10 text-brand-accent animate-spin" />
                  ) : formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImagePlus className="h-10 w-10 text-gray-300 mb-2" />
                      <span className="text-xs font-bold text-gray-400">Capa do Produto</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleImageUpload} 
                    accept="image/*"
                    disabled={isUploading}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <div className="flex flex-col">
                    <Label className="text-indigo-900 font-bold cursor-pointer" htmlFor="available-switch">Disponível</Label>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Visível para clientes</span>
                  </div>
                  <Switch 
                    id="available-switch"
                    checked={formData.isAvailable} 
                    onCheckedChange={(v) => setFormData({...formData, isAvailable: v})} 
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Nome do Prato</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Pizza de Calabresa" 
                    className="rounded-xl border-gray-200 h-12 focus:ring-brand-accent" required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Preço (R$)</Label>
                    <Input 
                      type="number" step="0.01" value={formData.price} 
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="0,00" className="rounded-xl border-gray-200 h-12" required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Estoque</Label>
                    <Input 
                      type="number" value={formData.stock} 
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      placeholder="Ilimitado" className="rounded-xl border-gray-200 h-12"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger className="rounded-xl border-gray-200 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Descrição</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Ingredientes e detalhes do prato..." 
                className="rounded-xl resize-none h-24 border-gray-200 focus:ring-brand-accent" 
              />
            </div>

            <Separator className="bg-gray-100" />

            {/* Complementos e Opções */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <Settings2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="font-black text-lg text-indigo-900">Complementos / Sabores</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addOptionGroup} className="rounded-xl border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Grupo
                </Button>
              </div>

              <div className="space-y-6">
                {formData.optionGroups.map((group) => (
                  <div key={group.id} className="p-5 border-2 border-indigo-50 rounded-[2rem] bg-indigo-50/20 space-y-4 shadow-sm relative overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                      <div className="sm:col-span-6 space-y-2">
                        <Label className="text-[10px] uppercase text-gray-400 font-black tracking-widest">Nome do Grupo</Label>
                        <Input 
                          placeholder="Ex: Escolha os sabores" 
                          value={group.name} 
                          onChange={(e) => setFormData({
                            ...formData,
                            optionGroups: formData.optionGroups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g)
                          })}
                          className="rounded-xl font-bold bg-white h-11"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <Label className="text-[10px] uppercase text-gray-400 font-black tracking-widest">Mín</Label>
                        <Input type="number" value={group.min} onChange={(e) => setFormData({...formData, optionGroups: formData.optionGroups.map(g => g.id === group.id ? { ...g, min: parseInt(e.target.value) } : g)})} className="rounded-xl bg-white h-11" />
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <Label className="text-[10px] uppercase text-gray-400 font-black tracking-widest">Máx</Label>
                        <Input type="number" value={group.max} onChange={(e) => setFormData({...formData, optionGroups: formData.optionGroups.map(g => g.id === group.id ? { ...g, max: parseInt(e.target.value) } : g)})} className="rounded-xl bg-white h-11" />
                      </div>
                      <div className="sm:col-span-2">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeGroup(group.id)} className="text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full w-full h-11">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 pl-4 border-l-4 border-white">
                      {group.options.map((opt) => (
                        <div key={opt.id} className="flex items-end gap-3 animate-in fade-in slide-in-from-left-2">
                          <Input 
                            placeholder="Nome do item (ex: Muçarela)" 
                            value={opt.name} 
                            onChange={(e) => updateOption(group.id, opt.id, "name", e.target.value)}
                            className="flex-1 rounded-xl h-11 text-sm bg-white"
                          />
                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">R$</span>
                            <Input 
                              type="number" 
                              placeholder="0,00" 
                              value={opt.price} 
                              onChange={(e) => updateOption(group.id, opt.id, "price", parseFloat(e.target.value))}
                              className="pl-8 rounded-xl h-11 text-sm bg-white"
                            />
                          </div>
                          <Button 
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setFormData({
                              ...formData,
                              optionGroups: formData.optionGroups.map(g => g.id === group.id ? { ...g, options: g.options.filter(o => o.id !== opt.id) } : g)
                            })}
                            className="text-gray-300 hover:text-red-400 rounded-full"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="ghost" size="sm" onClick={() => addOption(group.id)} className="text-xs font-black uppercase text-indigo-500 hover:text-indigo-700 hover:bg-white/50 rounded-lg mt-2 px-4">
                        <Plus className="h-3 w-3 mr-2" /> Adicionar Opção
                      </Button>
                    </div>
                  </div>
                ))}

                {formData.optionGroups.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                    <p className="text-sm font-bold text-gray-400">Nenhum grupo de complementos criado.</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </ScrollArea>

      <div className="p-6 bg-white border-t border-gray-100 shrink-0">
        <Button form="product-form" type="submit" className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black h-16 text-lg shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]">
          {product ? "Salvar Alterações" : "Adicionar ao Cardápio"}
        </Button>
      </div>
    </DialogContent>
  );
};

export default ProductDialog;