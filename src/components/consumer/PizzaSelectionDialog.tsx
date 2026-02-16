"use client";

import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PizzaDetails, PizzaFlavor, PizzaSize, PizzaDough, PizzaCrust } from "@/types/product";
import { Check, Plus, Minus, Info, ShoppingCart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PizzaSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (cartItem: any) => void;
  pizzaDetails: PizzaDetails;
  restaurantId: string;
}

const PizzaSelectionDialog: React.FC<PizzaSelectionDialogProps> = ({ 
  isOpen, 
  onClose, 
  onAddToCart, 
  pizzaDetails,
  restaurantId
}) => {
  const [step, setStep] = useState<"size" | "flavors" | "dough" | "crust">("size");
  const [selectedSize, setSelectedSize] = useState<PizzaSize | null>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<PizzaFlavor[]>([]);
  const [selectedDough, setSelectedDough] = useState<PizzaDough | null>(pizzaDetails.doughs[0] || null);
  const [selectedCrust, setSelectedCrust] = useState<PizzaCrust | null>(pizzaDetails.crusts[0] || null);

  const currentPrice = useMemo(() => {
    if (!selectedSize) return 0;
    
    // Preço dos sabores (Média aritmética)
    let flavorsPrice = 0;
    if (selectedFlavors.length > 0) {
      const sum = selectedFlavors.reduce((acc, f) => acc + (f.prices[selectedSize.id] || 0), 0);
      flavorsPrice = sum / selectedFlavors.length;
    } else {
      // Se nenhum sabor selecionado ainda, mostra o menor preço possível para o tamanho
      const allPrices = pizzaDetails.flavors.map(f => f.prices[selectedSize.id] || 999999);
      flavorsPrice = Math.min(...allPrices);
    }

    return flavorsPrice + (selectedDough?.price || 0) + (selectedCrust?.price || 0);
  }, [selectedSize, selectedFlavors, selectedDough, selectedCrust, pizzaDetails]);

  const handleFinish = () => {
    if (!selectedSize || selectedFlavors.length === 0) return;

    const flavorNames = selectedFlavors.map(f => f.name).join(' / ');
    onAddToCart({
      id: `pizza-${Date.now()}`,
      restaurantId,
      name: `Pizza ${selectedSize.name} (${flavorNames})`,
      price: currentPrice,
      quantity: 1,
      imageUrl: selectedFlavors[0]?.imageUrl || "",
      notes: `Massa: ${selectedDough?.name}, Borda: ${selectedCrust?.name}`
    });
    onClose();
  };

  const toggleFlavor = (flavor: PizzaFlavor) => {
    if (selectedFlavors.find(f => f.id === flavor.id)) {
      setSelectedFlavors(selectedFlavors.filter(f => f.id !== flavor.id));
    } else {
      if (selectedFlavors.length < (selectedSize?.maxFlavors || 1)) {
        setSelectedFlavors([...selectedFlavors, flavor]);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl w-[95vw] rounded-[2.5rem] h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-indigo-900 text-white shrink-0">
          <DialogTitle className="text-2xl font-black">Personalize sua Pizza</DialogTitle>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
              {["Tamanho", "Sabores", "Massa", "Borda"].map((label, idx) => {
                  const stepKeys: any[] = ["size", "flavors", "dough", "crust"];
                  const isActive = step === stepKeys[idx];
                  return (
                    <button 
                        key={label} 
                        className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", isActive ? "bg-brand-accent text-white" : "text-white/40 hover:text-white/60")}
                        onClick={() => idx === 0 || selectedSize ? setStep(stepKeys[idx]) : null}
                    >
                        {label}
                    </button>
                  );
              })}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-white p-6">
          {step === "size" && (
            <div className="space-y-4">
              <h3 className="font-black text-indigo-900 text-lg mb-4">Escolha o tamanho:</h3>
              {pizzaDetails.sizes.map(s => (
                <button 
                  key={s.id}
                  onClick={() => { setSelectedSize(s); setStep("flavors"); }}
                  className={cn(
                    "w-full flex items-center justify-between p-6 rounded-3xl border-4 transition-all text-left",
                    selectedSize?.id === s.id ? "border-indigo-600 bg-indigo-50" : "border-gray-50 bg-gray-50/50 hover:bg-gray-50"
                  )}
                >
                  <div>
                    <p className="font-black text-indigo-900 text-lg">{s.name}</p>
                    <p className="text-xs text-gray-500 font-bold uppercase">{s.pieces} pedaços • Até {s.maxFlavors} sabores</p>
                  </div>
                  {selectedSize?.id === s.id && <Check className="h-6 w-6 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}

          {step === "flavors" && selectedSize && (
            <div className="space-y-6">
              <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900">
                    <Info className="h-4 w-4" />
                    <span className="text-sm font-bold">Escolha até {selectedSize.maxFlavors} sabores</span>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-600 text-white rounded-full">{selectedFlavors.length} / {selectedSize.maxFlavors}</Badge>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {pizzaDetails.flavors.filter(f => f.available).map(f => {
                  const isSelected = !!selectedFlavors.find(sf => sf.id === f.id);
                  const price = f.prices[selectedSize.id] || 0;
                  return (
                    <div 
                      key={f.id}
                      onClick={() => toggleFlavor(f)}
                      className={cn(
                        "p-4 rounded-3xl border-2 transition-all flex items-center gap-4 cursor-pointer",
                        isSelected ? "border-indigo-600 bg-indigo-50" : "border-gray-100 hover:border-indigo-200"
                      )}
                    >
                      <img src={f.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{f.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-tight">{f.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-indigo-900">R$ {price.toFixed(2)}</p>
                        {isSelected && <div className="mt-1 bg-indigo-600 text-white rounded-full p-1 w-fit ml-auto"><Check className="h-3 w-3" /></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === "dough" && (
            <div className="space-y-4">
              <h3 className="font-black text-indigo-900 text-lg mb-4">Tipo de massa:</h3>
              {pizzaDetails.doughs.filter(d => d.available).map(d => (
                <button 
                  key={d.id}
                  onClick={() => { setSelectedDough(d); setStep("crust"); }}
                  className={cn(
                    "w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all",
                    selectedDough?.id === d.id ? "border-indigo-600 bg-indigo-50" : "border-gray-100 hover:bg-gray-50"
                  )}
                >
                  <span className="font-bold text-gray-700">{d.name}</span>
                  <div className="flex items-center gap-4">
                    {d.price > 0 && <span className="text-xs font-black text-indigo-600">+ R$ {d.price.toFixed(2)}</span>}
                    {selectedDough?.id === d.id && <Check className="h-5 w-5 text-indigo-600" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === "crust" && (
            <div className="space-y-4">
              <h3 className="font-black text-indigo-900 text-lg mb-4">Escolha a borda:</h3>
              {pizzaDetails.crusts.filter(c => c.available).map(c => (
                <button 
                  key={c.id}
                  onClick={() => setSelectedCrust(c)}
                  className={cn(
                    "w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all",
                    selectedCrust?.id === c.id ? "border-indigo-600 bg-indigo-50" : "border-gray-100 hover:bg-gray-50"
                  )}
                >
                  <span className="font-bold text-gray-700">{c.name}</span>
                  <div className="flex items-center gap-4">
                    {c.price > 0 && <span className="text-xs font-black text-indigo-600">+ R$ {c.price.toFixed(2)}</span>}
                    {selectedCrust?.id === c.id && <Check className="h-5 w-5 text-indigo-600" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-8 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total do Produto</p>
            <p className="text-3xl font-black text-indigo-900">R$ {currentPrice.toFixed(2)}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {step === "crust" ? (
                <Button 
                    className="flex-1 sm:flex-initial rounded-2xl bg-indigo-600 text-white font-black h-16 px-10 shadow-xl shadow-indigo-100"
                    onClick={handleFinish}
                    disabled={selectedFlavors.length === 0}
                >
                    <ShoppingCart className="mr-2 h-5 w-5" /> Adicionar
                </Button>
            ) : (
                <Button 
                    className="flex-1 sm:flex-initial rounded-2xl bg-brand-accent text-white font-black h-16 px-10 shadow-xl"
                    onClick={() => {
                        if (step === "size") setStep("flavors");
                        else if (step === "flavors") setStep("dough");
                        else if (step === "dough") setStep("crust");
                    }}
                    disabled={step === "flavors" && selectedFlavors.length === 0}
                >
                    Continuar
                </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PizzaSelectionDialog;