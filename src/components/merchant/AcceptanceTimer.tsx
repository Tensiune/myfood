"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AcceptanceTimerProps {
  deadline: string;
  onExpire: () => void;
}

const AcceptanceTimer: React.FC<AcceptanceTimerProps> = ({ deadline, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTime = () => {
      const diff = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      
      if (diff === 0) {
        onExpire();
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [deadline, onExpire]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isUrgent = timeLeft < 120; // Menos de 2 minutos

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all animate-in fade-in",
      isUrgent 
        ? "bg-red-50 border-red-200 text-red-600 animate-pulse" 
        : "bg-indigo-50 border-indigo-100 text-indigo-700"
    )}>
      {isUrgent ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase leading-none mb-0.5">Tempo de Aceite</span>
        <span className="text-sm font-black tabular-nums">{formatTime(timeLeft)}</span>
      </div>
    </div>
  );
};

export default AcceptanceTimer;