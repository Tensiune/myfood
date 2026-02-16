"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PizzaDetails, PizzaFlavor, PizzaSize, PizzaDough, PizzaCrust } from "@/types/product";
import { Check, Info, ShoppingCart, ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PizzaSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (cartItem: any) => void;
  pizzaDetails: PizzaDetails;
  restaurantId: string;
  initialSizeId?: string;
}

const PizzaSelectionDialog: React.FC<PizzaSelectionDialogProps> = ({ 
  isOpen, 
  onClose, 
  onAddToCart, 
  pizzaDetails,
  restaurantId,
  initialSizeId
}) => {
  const [selectedSize, setSelectedSize] = useState<PizzaSize | null>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<(PizzaFlavor | null)[]>([]);
  const [selectedDough, setSelectedDough] = useState<PizzaDough | null>(null);
  const [selectedCrust, setSelectedCrust] = useState<PizzaCrust | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const flavorRefs = useRef<Array<HTMLDivElement | null>>([]);
  const doughRef = useRef<HTMLDivElement>(null);
  const crustRef = useRef<HTMLDivElement>(null);

  // Inicializa o tamanho e os slots de sabores
  useEffect(() => {
    if (isOpen && initialSizeId) {
        const size = pizzaDetails.sizes.find(s => s.id === initialSizeId);
        if (size) {
            setSelectedSize(size);
            setSelectedFlavors(new Array(size.maxFlavors).fill(null));
        }
        setSelectedDough(null);
        setSelectedCrust(null);
    }
  }, [isOpen, initialSizeId, pizzaDetails]);

  const currentPrice = useMemo(() => {
    if (!selectedSize) return 0;
    
    const pickedFlavors = selectedFlavors.filter((f): f is PizzaFlavor => f !== null);
    
    let flavorsPrice = 0;
    if (pickedFlavors.length > 0) {
      // Média aritmética dos sabores selecionados
      const sum = pickedFlavors.reduce((acc, f) => acc + (f.prices[selectedSize.id] || 0), 0);
      flavorsPrice = sum / pickedFlavors.length;
    } else {
      // Valor base (mínimo possível)
      const allPrices = pizzaDetails.flavors
        .filter(f => f.available && f.prices[selectedSize.id] > 0)
        .map(f => f.prices[selectedSize.id]);
      flavorsPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    }

    return flavorsPrice + (selectedDough?.price || 0) + (selectedCrust?.price || 0);
  }, [selectedSize, selectedFlavors, selectedDough, selectedCrust, pizzaDetails]);

  const canFinish = useMemo(() => {
    return selectedSize && 
           selectedFlavors.every(f => f !== null) && 
           selectedDough !== null && 
           selectedCrust !== null;
  }, [selectedSize, selectedFlavors, selectedDough, selectedCrust]);

  const handleFinish = () => {
    if (!canFinish || !selectedSize) return;

    const flavorNames = selectedFlavors.map(f => f?.name).join(' / ');
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

  const selectFlavor = (index: number, flavor: PizzaFlavor) => {
    const newFlavors = [...selectedFlavors];
    newFlavors[index] = flavor;
    setSelectedFlavors(newFlavors);

    // Scroll suave para a próxima seção
    setTimeout(() => {
        if (index < selectedFlavors.length - 1) {
            flavorRefs.current[index + 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            crustRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
  };

  const selectCrust = (crust: PizzaCrust) => {
    setSelectedCrust(crust);
    setTimeout(() => {
        doughRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  if (!selectedSize) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl w-[95vw] rounded-[2.5rem] h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-indigo-900 text-white shrink-0">
          <DialogTitle className="text-2xl font-black">
            Pizza {selectedSize.name}
          </DialogTitle>
          <p className="text-indigo-200 text-sm font-medium mt-1">
            {selectedSize.pieces} pedaços • Escolha {selectedSize.maxFlavors} {selectedSize.maxFlavors === 1 ? 'sabor' : 'sabores'}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-white" ref={scrollAreaRef}>
          <div className="p-6 space-y-12 pb-32">
            
            {/* SESSÕES DE SABORES */}
            {selectedFlavors.map((selected, slotIdx) => (
                <div 
                    key={slotIdx} 
                    ref={el => flavorRefs.current[slotIdx] = el}
                    className="space-y-4 animate-in fade-in slide-in-from-bottom-2"
                >
                    <div className="flex items-center justify-between border-b-2 border-indigo-50 pb-2">
                        <h3 className="font-black text-indigo-900 text-lg uppercase tracking-tight">
                            {selectedSize.maxFlavors > 1 ? `${slotIdx + 1}º Sabor` : "Escolha o Sabor"}
                        </h3>
                        {selected && (
                            <Badge className="bg-green-500 text-white gap-1 px-3">
                                <Check size={12} /> {selected.name}
                            </Badge>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {pizzaDetails.flavors.filter(f => f.available).map(f => {
                            const isSelectedInThisSlot = selected?.id === f.id;
                            const price = f.prices[selectedSize.id] || 0;
                            return (
                                <div 
                                    key={f.id}
                                    onClick={() => selectFlavor(slotIdx, f)}
                                    className={cn(
                                        "p-4 rounded-[1.5rem] border-2 transition-all flex items-center gap-4 cursor-pointer",
                                        isSelectedInThisSlot 
                                            ? "border-indigo-600 bg-indigo-50 shadow-md scale-[1.02]" 
                                            : "border-gray-100 hover:border-indigo-200 bg-white"
                                    )}
                                >
                                    <img src={f.imageUrl} className="w-14 h-14 rounded-2xl object-cover shadow-sm bg-gray-50" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-800 text-sm truncate">{f.name}</p>
                                        <p className="text-[10px] text-gray-400 line-clamp-1 leading-tight">{f.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-indigo-900">R$ {price.toFixed(2)}</p>
                                        {isSelectedInThisSlot && <div className="mt-1 bg-indigo-600 text-white rounded-full p-1 w-fit ml-auto"><Check className="h-3 w-3" /></div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* SEÇÃO BORDA */}
            <div ref={crustRef} className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b-2 border-indigo-50 pb-2">
                    <h3 className="font-black text-indigo-900 text-lg uppercase tracking-tight">Tipo de Borda</h3>
                    {selectedCrust && <Badge className="bg-green-500 text-white gap-1">{selectedCrust.name}</Badge>}
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {pizzaDetails.crusts.filter(c => c.available).map(c => (
                        <button 
                            key={c.id}
                            onClick={() => selectCrust(c)}
                            className={cn(
                                "w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all",
                                selectedCrust?.id === c.id ? "border-indigo-600 bg-indigo-50 shadow-md" : "border-gray-100 bg-white"
                            )}
                        >
                            <span className="font-bold text-sm text-gray-700">{c.name}</span>
                            <div className="flex items-center gap-4">
                                {c.price > 0 && <span className="text-[10px] font-black text-indigo-600">+ R$ {c.price.toFixed(2)}</span>}
                                {selectedCrust?.id === c.id && <Check className="h-4 w-4 text-indigo-600" />}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* SEÇÃO MASSA */}
            <div ref={doughRef} className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b-2 border-indigo-50 pb-2">
                    <h3 className="font-black text-indigo-900 text-lg uppercase tracking-tight">Tipo de Massa</h3>
                    {selectedDough && <Badge className="bg-green-500 text-white gap-1">{selectedDough.name}</Badge>}
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {pizzaDetails.doughs.filter(d => d.available).map(d => (
                        <button 
                            key={d.id}
                            onClick={() => setSelectedDough(d)}
                            className={cn(
                                "w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all",
                                selectedDough?.id === d.id ? "border-indigo-600 bg-indigo-50 shadow-md" : "border-gray-100 bg-white"
                            )}
                        >
                            <span className="font-bold text-sm text-gray-700">{d.name}</span>
                            <div className="flex items-center gap-4">
                                {d.price > 0 && <span className="text-[10px] font-black text-indigo-600">+ R$ {d.price.toFixed(2)}</span>}
                                {selectedDough?.id === d.id && <Check className="h-4 w-4 text-indigo-600" />}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

          </div>
        </ScrollArea>

        {/* FOOTER FIXO COM PREÇO E BOTÃO */}
        <div className="p-8 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Total</p>
            <p className="text-3xl font-black text-indigo-900">R$ {currentPrice.toFixed(2)}</p>
          </div>
          <Button 
            className={cn(
                "w-full sm:w-64 h-16 rounded-[2rem] font-black text-lg shadow-xl transition-all",
                canFinish ? "bg-indigo-600 text-white shadow-indigo-100" : "bg-gray-200 text-gray-400 grayscale cursor-not-allowed"
            )}
            onClick={handleFinish}
            disabled={!canFinish}
          >
            <ShoppingCart className="mr-2 h-5 w-5" /> Adicionar ao Carrinho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PizzaSelectionDialog;