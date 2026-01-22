"use client";

import React from "react";
import { useNotifications } from "@/context/NotificationContext";
import { Button } from "@/components/ui/button";
import { Package, Bell, Info, CheckCircle2, Trash2, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const NotificationList = ({ onClose }: { onClose?: () => void }) => {
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case "order": return <Package className="h-5 w-5 text-brand-accent" />;
      case "success": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "info": return <Info className="h-5 w-5 text-blue-500" />;
      default: return <Bell className="h-5 w-5 text-indigo-600" />;
    }
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    if (n.link) navigate(n.link);
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-indigo-900">Notificações</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-[10px] font-bold uppercase text-indigo-600">
            Ler tudo
          </Button>
          <Button variant="ghost" size="sm" onClick={clearNotifications} className="text-[10px] font-bold uppercase text-red-500">
            Limpar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center">
              <Bell className="h-10 w-10 text-gray-200" />
            </div>
            <p className="text-gray-400 font-medium">Você não tem novas notificações.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer relative",
                n.isRead ? "bg-white border-gray-100 opacity-60" : "bg-indigo-50/50 border-indigo-100 shadow-sm"
              )}
            >
              {!n.isRead && <span className="absolute top-4 right-4 h-2 w-2 bg-brand-accent rounded-full" />}
              <div className="flex gap-4">
                <div className="mt-1">{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 leading-tight">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                  <span className="text-[10px] text-gray-400 font-medium mt-2 block">{n.time}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationList;