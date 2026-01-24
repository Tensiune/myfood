"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import OrderTimer from "@/components/merchant/OrderTimer";
import { useNavigate } from "react-router-dom";

interface OrderCardProps {
  order: any;
  onAction: () => void;
  onAdjustTimer: (minutes: number) => void;
  actionLabel: string;
  variant: "blue" | "orange" | "indigo" | "green";
  showTimer?: boolean;
  onTimerEnd?: () => void;
  disabled?: boolean;
  showTrackingButton?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  onAction, 
  onAdjustTimer,
  actionLabel, 
  variant, 
  showTimer, 
  onTimerEnd, 
  disabled, 
  showTrackingButton 
}) => {
  const navigate = useNavigate();

  return (
    <Card className="rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all bg-white overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-gray-50 rounded-xl">
               <span className="text-[10px] font-black text-gray-400">#{order.id.slice(0, 6)}</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400">
              {new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </span>
          </div>

          <div className="space-y-1.5">
             {order.items.map((item: any, i: number) => (
               <div key={i} className="flex justify-between text-sm">
                 <p className="text-gray-700 font-medium">
                   <span className="text-indigo-600 font-black">{item.quantity}x</span> {item.name}
                 </p>
               </div>
             ))}
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-2xl">
            <MapPin className="h-3 w-3 mt-0.5 text-indigo-400 shrink-0" />
            <p className="line-clamp-1">{order.delivery_address?.street}, {order.delivery_address?.number}</p>
          </div>

          {showTimer && (
            <OrderTimer 
              orderId={order.id} 
              autoTransitionAt={order.auto_transition_at} 
              onTimerEnd={onTimerEnd || (() => {})} 
              onAdjust={onAdjustTimer}
            />
          )}
        </div>

        <div className="px-4 pb-4">
          {showTrackingButton ? (
            <Button 
              className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 bg-green-600 hover:bg-green-700 shadow-green-100"
              onClick={() => navigate(`/track/${order.id}`)}
            >
              <Map className="h-4 w-4 mr-2" /> Acompanhar Entrega
            </Button>
          ) : (
            <Button 
              className={cn(
                "w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95",
                variant === "blue" && "bg-blue-600 hover:bg-blue-700 shadow-blue-100",
                variant === "orange" && "bg-orange-500 hover:bg-orange-600 shadow-orange-100",
                variant === "indigo" && "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100",
                variant === "green" && "bg-green-600 opacity-60 cursor-default"
              )}
              onClick={onAction}
              disabled={disabled}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;