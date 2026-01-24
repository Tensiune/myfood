"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";

interface OrderTimerProps {
  orderId: string;
  autoTransitionAt: string | null;
  onTimerEnd: () => void;
}

const OrderTimer: React.FC<OrderTimerProps> = ({ orderId, autoTransitionAt, onTimerEnd }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!autoTransitionAt) {
      setTimeLeft(0);
      return;
    }

    const calculateTime = () => {
      const diff = Math.max(0, Math.floor((new Date(autoTransitionAt).getTime() - new Date().getTime()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) onTimerEnd();
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [autoTransitionAt, onTimerEnd]);

  const updateTimer = async (minutesToAdd: number) => {
    setLoading(true);
    try {
      const now = new Date();
      let baseTime = autoTransitionAt ? new Date(autoTransitionAt) : now;
      if (baseTime < now) baseTime = now;

      const newDate = new Date(baseTime.getTime() + minutesToAdd * 60000);
      
      const { error } = await supabase
        .from('orders')
        .update({ auto_transition_at: newDate.toISOString() })
        .eq('id', orderId);

      if (error) throw error;
    } catch (err) {
      showError("Erro ao ajustar tempo.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${timeLeft > 0 ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`}>
          <Clock className="h-4 w-4 text-white" />
        </div>
        <span className={`font-black text-lg tabular-nums ${timeLeft > 0 ? 'text-indigo-900' : 'text-gray-400'}`}>
          {timeLeft > 0 ? formatTime(timeLeft) : "--:--"}
        </span>
      </div>

      <div className="flex gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full border-indigo-200 text-indigo-600"
          onClick={() => updateTimer(-1)}
          disabled={loading || timeLeft <= 60}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full border-indigo-200 text-indigo-600"
          onClick={() => updateTimer(1)}
          disabled={loading}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[10px] font-black uppercase text-indigo-600 ml-1"
          onClick={() => updateTimer(5)}
          disabled={loading}
        >
          +5m
        </Button>
      </div>
    </div>
  );
};

export default OrderTimer;