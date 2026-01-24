"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTimerProps {
  orderId: string;
  autoTransitionAt: string | null;
  onTimerEnd: () => void;
  onAdjust: (minutes: number, isAbsolute?: boolean) => void;
}

const OrderTimer: React.FC<OrderTimerProps> = ({ orderId, autoTransitionAt, onTimerEnd, onAdjust }) => {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleEditClick = () => {
    const mins = Math.ceil(timeLeftSeconds / 60);
    setInputValue(mins > 0 ? mins.toString() : "15");
    setIsEditing(true);
  };

  const handleInputSubmit = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val) && val > 0) {
      onAdjust(val, true); // true indica que é valor absoluto (ex: quero 20 min agora)
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInputSubmit();
    if (e.key === 'Escape') setIsEditing(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-1">
        <div className={`p-1.5 rounded-lg ${timeLeftSeconds > 0 ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`}>
          <Clock className="h-4 w-4 text-white" />
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInputSubmit}
              onKeyDown={handleKeyDown}
              className="h-8 w-16 text-center font-black text-indigo-900 border-indigo-200 focus:ring-indigo-500 rounded-lg p-1"
              autoFocus
            />
            <span className="text-[10px] font-bold text-gray-400 uppercase">min</span>
          </div>
        ) : (
          <span 
            className={cn(
              "font-black text-lg tabular-nums transition-colors cursor-pointer hover:text-indigo-600", 
              timeLeftSeconds > 0 ? 'text-indigo-900' : 'text-gray-400'
            )}
            onClick={handleEditClick}
            title="Clique para editar"
          >
            {timeLeftSeconds > 0 ? formatTime(timeLeftSeconds) : "Definir Tempo"}
          </span>
        )}
      </div>

      <div className="flex gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full border-indigo-200 text-indigo-600 active:scale-90 transition-transform"
          onClick={() => onAdjust(-1)} // Mudado para 1 minuto
          disabled={timeLeftSeconds <= 60}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full border-indigo-200 text-indigo-600 active:scale-90 transition-transform"
          onClick={() => onAdjust(1)} // Mudado para 1 minuto
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default OrderTimer;