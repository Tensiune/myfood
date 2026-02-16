"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, Plus, Trash2, ArrowRight, ArrowLeft, Loader2, CheckCircle2, LayoutGrid, Pizza as PizzaIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { uploadImage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import ProductTypeSelector from "./product/ProductTypeSelector";
import PizzaStepSizes from "./product/pizza/PizzaStepSizes";
import PizzaStepDough from "./product/pizza/PizzaStepDough";
import PizzaStepCrust from "./product/pizza/PizzaStepCrust";
import PizzaStepFlavors from "./product/pizza/PizzaStepFlavors";
import { ProductType, PizzaDetails } from "@/types/product";

interface ProductDialogProps {
  product?: any;
  onSave: (data: any) => void;
  categories: string[];
}

const ProductDialog: React.FC<ProductDialogProps> = ({ product, onSave, categories }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Dados comuns
  const [formData, setFormData] = useState({
    id: product?.id || null,
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || 0,
    category: product?.category || categories[0],
    imageUrl: product?.imageUrl || "",
    isAvailable: product?.isAvailable ?? true,
    type: (product?.optiongroups?.type as ProductType) || null,
    ean: product?.optiongroups?.ean || "",
    pizzaDetails: (product?.optiongroups?.pizzaDetails as PizzaDetails) || {
      sizes: [],
      doughs: [],
      crusts: [],
      flavors: []
    }
  });

  // Se estiver editando, pula a seleção de tipo
  useEffect(() => {
    if (product?.id && formData.type) {
        setStep(2);
    }
  }, [product]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const url = await uploadImage(file, `merchants/${user?.id}/products`);
      if (url) {
        setFormData(prev => ({ ...prev, imageUrl: url }));
        showSuccess("Imagem processada!");
      }
    } catch (err) { showError("Falha no upload."); }
    finally { setIsUploading(false); }
  };

  const handleNext = async () => {
    if (step === 1 && !formData.type) {
      showError("Selecione um tipo de produto.");
      return;
    }
    
    // Validações básicas por tipo
    if (step === 2 && formData.type !== 'PIZZA') {
        if (!formData.name) { showError("Nome é obrigatório."); return; }
    }

    setLoading(true);
    try {
      // Se for Pizza, salvamos o progresso a cada etapa
      if (formData.type === 'PIZZA' && step >= 2) {
          await saveToDatabase();
      }
      
      setStep(step + 1);
    } catch (err) {
      showError("Erro ao salvar progresso.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setStep(step - 1);

  const saveToDatabase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Cálculo do menor preço para Pizzas (a partir de)
    let displayPrice = Number(formData.price);
    if (formData.type === 'PIZZA' && formData.pizzaDetails.flavors.length > 0 && formData.pizzaDetails.sizes.length > 0) {
        const firstSize = formData.pizzaDetails.sizes[0];
        const flavorPrices = formData.pizzaDetails.flavors.map(f => f.prices[firstSize.id] || 999999);
        displayPrice = Math.min(...flavorPrices);
    }

    const dbPayload = {
      merchant_id: user?.id,
      name: formData.name || (formData.type === 'PIZZA' ? 'Cardápio de Pizzas' : ''),
      description: formData.description,
      price: displayPrice,
      category: formData.category,
      imageurl: formData.imageUrl,
      isavailable: formData.isAvailable,
      optiongroups: {
        type: formData.type,
        ean: formData.ean,
        pizzaDetails: formData.pizzaDetails
      }
    };

    const { data, error } = await supabase
      .from('products')
      .upsert({
        ...(formData.id ? { id: formData.id } : {}),
        ...dbPayload
      })
      .select()
      .single();

    if (error) throw error;
    if (data) setFormData(prev => ({ ...prev, id: data.id }));
    return data;
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const saved = await saveToDatabase();
      onSave(saved);
      showSuccess("Produto cadastrado com sucesso!");
    } catch (err) {
      showError("Erro ao finalizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  const renderPreparedForm = () => (
    <div className="space-y-6">
        <div className="flex flex-col items-center gap-6">
            <div className="w-full h-56 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden relative group hover:border-brand-accent transition-all flex items-center justify-center">
                {isUploading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-brand-accent" />
                ) : formData.imageUrl ? (
                    <img src={formData.imageUrl} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center">
                        <ImagePlus className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <span className="text-[10px] font-black text-gray-400 uppercase">Adicionar Foto</span>
                    </div>
                )}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} accept="image/*" />
            </div>
        </div>
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="font-bold">Nome do Produto</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Hambúrguer Duplo" className="rounded-xl h-12" />
            </div>
            <div className="space-y-2">
                <Label className="font-bold">Preço (R$)</Label>
                <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="rounded-xl h-12" />
            </div>
            <div className="space-y-2">
                <Label className="font-bold">Descrição</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descreva os ingredientes..." className="rounded-xl resize-none h-24" />
            </div>
        </div>
    </div>
  );

  const renderIndustrializedForm = () => (
    <div className="space-y-6">
        <div className="flex flex-col items-center gap-6">
            <div className="w-full h-56 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden relative flex items-center justify-center">
                {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <ImagePlus className="h-10 w-10 text-gray-300" />}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
            </div>
        </div>
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="font-bold">Nome do Produto</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Coca-Cola 350ml" className="rounded-xl h-12" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="font-bold">Preço (R$)</Label>
                    <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                    <Label className="font-bold text-gray-400">Código EAN (Opcional)</Label>
                    <Input value={formData.ean} onChange={e => setFormData({...formData, ean: e.target.value})} placeholder="789..." className="rounded-xl h-12" />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="font-bold">Descrição</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="rounded-xl h-12" />
            </div>
        </div>
    </div>
  );

  const totalPizzaSteps = 5;

  return (
    <DialogContent className="sm:max-w-[750px] w-[95vw] rounded-[2.5rem] h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
      <DialogHeader className="p-8 bg-indigo-900 text-white shrink-0 relative overflow-hidden">
        <div className="relative z-10">
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
                {formData.type === 'PIZZA' ? <PizzaIcon /> : <LayoutGrid />}
                {formData.id ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription className="text-indigo-200 font-medium">
                {step === 1 ? "Selecione o tipo de item para continuar" : 
                 formData.type === 'PIZZA' ? `Configurando Pizza - Passo ${step - 1} de 4` : 
                 "Preencha as informações detalhadas"}
            </DialogDescription>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10"><PizzaIcon size={120} /></div>
      </DialogHeader>

      <ScrollArea className="flex-1 p-8 bg-white">
        {step === 1 && (
            <div className="space-y-6">
                <div className="space-y-2 mb-6">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Categoria do Cardápio</Label>
                    <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                        <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <ProductTypeSelector selected={formData.type} onSelect={t => setFormData({...prev => prev, type: t})} />
            </div>
        )}

        {step === 2 && (
            formData.type === 'PREPARED' ? renderPreparedForm() : 
            formData.type === 'INDUSTRIALIZED' ? renderIndustrializedForm() :
            <PizzaStepSizes sizes={formData.pizzaDetails.sizes} setSizes={s => setFormData({...formData, pizzaDetails: {...formData.pizzaDetails, sizes: s}})} />
        )}

        {step === 3 && formData.type === 'PIZZA' && (
            <PizzaStepDough doughs={formData.pizzaDetails.doughs} setDoughs={d => setFormData({...formData, pizzaDetails: {...formData.pizzaDetails, doughs: d}})} />
        )}

        {step === 4 && formData.type === 'PIZZA' && (
            <PizzaStepCrust crusts={formData.pizzaDetails.crusts} setCrusts={c => setFormData({...formData, pizzaDetails: {...formData.pizzaDetails, crusts: c}})} />
        )}

        {step === 5 && formData.type === 'PIZZA' && (
            <PizzaStepFlavors 
                flavors={formData.pizzaDetails.flavors} 
                setFlavors={f => setFormData({...formData, pizzaDetails: {...formData.pizzaDetails, flavors: f}})} 
                sizes={formData.pizzaDetails.sizes}
            />
        )}
      </ScrollArea>

      <DialogFooter className="p-8 bg-gray-50/50 border-t flex flex-row justify-between items-center gap-4 shrink-0">
        {step > 1 && (
            <Button variant="ghost" onClick={handleBack} className="rounded-2xl h-14 px-8 font-bold text-gray-500">
                <ArrowLeft className="h-5 w-5 mr-2" /> Voltar
            </Button>
        )}
        
        {((formData.type !== 'PIZZA' && step === 2) || (formData.type === 'PIZZA' && step === 5)) ? (
            <Button 
                className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black h-14 shadow-xl shadow-indigo-100"
                onClick={handleFinalSubmit}
                disabled={loading}
            >
                {loading ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : <CheckCircle2 className="h-6 w-6 mr-2" />}
                Finalizar Cadastro
            </Button>
        ) : (
            <Button 
                className="flex-1 rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black h-14 shadow-xl shadow-brand-accent/20"
                onClick={handleNext}
                disabled={loading}
            >
                {loading ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : "Continuar"}
                <ArrowRight className="h-6 w-6 ml-2" />
            </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
};

export default ProductDialog;