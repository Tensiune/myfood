"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OrderTimerProps {
  orderId: string;
  autoTransitionAt: string | null;
  onTimerEnd: () => void;
}

const OrderTimer: React.FC<OrderTimerProps> = ({ orderId, autoTransitionAt, onTimerEnd }) => {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputMinutes, setInputMinutes] = useState<string>("");

  // Função para calcular o tempo restante
  const calculateTime = useCallback(() => {
    if (!autoTransitionAt) {
      setTimeLeftSeconds(0);
      return;
    }
    const diff = Math.max(0, Math.floor((new Date(autoTransitionAt).getTime() - new Date().getTime()) / 1000));
    setTimeLeftSeconds(diff);
    if (diff === 0) onTimerEnd();
  }, [autoTransitionAt, onTimerEnd]);

  // Efeito 1: Atualiza o tempo interno sempre que a prop vinda do banco mudar
  useEffect(() => {
    calculateTime();
  }, [autoTransitionAt, calculateTime]);

  // Efeito 2: Intervalo de 1 segundo para o countdown
  useEffect(() => {
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [calculateTime]);

  const updateTimer = async (minutesToAdd: number) => {
    setLoading(true);
    try {
      const now = new Date();
      let baseTime = autoTransitionAt ? new Date(autoTransitionAt) : now;
      
      if (baseTime.getTime() < now.getTime()) {
        baseTime = now;
      }

      const newDate = new Date(baseTime.getTime() + minutesToAdd * 60000);
      
      const { error } = await supabase
        .from('orders')
        .update({ auto_transition_at: newDate.toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      // O Realtime no pai (MerchantOrdersPage) vai atualizar a prop e o Efeito 1 cuidará do resto
    } catch (err) {
      showError("Erro ao ajustar tempo.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleManualTimeSet = async () => {
    const minutes = parseInt(inputMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      showError("Insira um tempo válido em minutos.");
      return;
    }
    
    setLoading(true);
    try {
      const newDate = new Date(Date.now() + minutes * 60000);
      
      const { error } = await supabase
        .from('orders')
        .update({ auto_transition_at: newDate.toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      setIsEditing(false);
    } catch (err) {
      showError("Erro ao definir tempo manualmente.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  
  const currentMinutes = Math.ceil(timeLeftSeconds / 60);

  return (
    <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${timeLeftSeconds > 0 ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`}>
          <Clock className="h-4 w-4 text-white" />
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={inputMinutes}
              onChange={(e) => setInputMinutes(e.target.value)}
              onBlur={handleManualTimeSet}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualTimeSet(); }}
              placeholder={currentMinutes.toString()}
              className="w-16 h-8 text-center font-black text-lg rounded-lg border-indigo-300 focus:border-indigo-500"
              autoFocus
            />
            <span className="text-sm text-gray-500">min</span>
          </div>
        ) : (
          <span 
            className={cn(
              `font-black text-lg tabular-nums cursor-pointer`, 
              timeLeftSeconds > 0 ? 'text-indigo-900' : 'text-gray-400'
            )}
            onClick={() => {
              if (timeLeftSeconds > 0) {
                setInputMinutes(currentMinutes.toString());
              } else {
                setInputMinutes("15");
              }
              setIsEditing(true);
            }}
          >
            {timeLeftSeconds > 0 ? formatTime(timeLeftSeconds) : "Definir Tempo"}
          </span>
        )}
      </div>

      <div className="flex gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full border-indigo-200 text-indigo-600"
          onClick={() => updateTimer(-5)}
          disabled={loading || timeLeftSeconds <= 300}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full border-indigo-200 text-indigo-600"
          onClick={() => updateTimer(5)}
          disabled={loading}
        >
          <Plus className="h-3 w-3" />
        </Button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-indigo-600 self-center" />}
      </div>
    </div>
  );
};

export default OrderTimer;