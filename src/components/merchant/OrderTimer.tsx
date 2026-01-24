"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTimerProps {
  orderId: string;
  autoTransitionAt: string | null;
  onTimerEnd: () => void;
  onAdjust: (minutes: number) => void;
}

const OrderTimer: React.FC<OrderTimerProps> = ({ orderId, autoTransitionAt, onTimerEnd, onAdjust }) => {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);

  const calculateTime = useCallback(() => {
    if (!autoTransitionAt) {
      setTimeLeftSeconds(0);
      return;
    }
    const diff = Math.max(0, Math.floor((new Date(autoTransitionAt).getTime() - new Date().getTime()) / 1000));
    setTimeLeftSeconds(diff);
    if (diff === 0 && autoTransitionAt) {
        onTimerEnd();
    }
  }, [autoTransitionAt, onTimerEnd]);

  useEffect(() => {
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [calculateTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${timeLeftSeconds > 0 ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`}>
          <Clock className="h-4 w-4 text-white" />
        </div>
        <span className={cn(
          "font-black text-lg tabular-nums transition-colors", 
          timeLeftSeconds > 0 ? 'text-indigo-900' : 'text-gray-400'
        )}>
          {timeLeftSeconds > 0 ? formatTime(timeLeftSeconds) : "Atrasado"}
        </span>
      </div>

      <div className="flex gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full border-indigo-200 text-indigo-600 active:scale-90 transition-transform"
          onClick={() => onAdjust(-5)}
          disabled={timeLeftSeconds <= 300}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full border-indigo-200 text-indigo-600 active:scale-90 transition-transform"
          onClick={() => onAdjust(5)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default OrderTimer;