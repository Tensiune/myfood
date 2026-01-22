"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, Package, CheckCircle2, Info } from "lucide-react";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "order" | "promo" | "info" | "success";
  time: string;
  isRead: boolean;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notif: Omit<Notification, "id" | "time" | "isRead">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem("user_notifications");
    return saved ? JSON.parse(saved) : [
      {
        id: "1",
        title: "Bem-vindo ao FoodApp!",
        message: "Aproveite os melhores restaurantes da sua região.",
        type: "info",
        time: "Agora",
        isRead: false
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("user_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addNotification = (notif: Omit<Notification, "id" | "time" | "isRead">) => {
    const newNotif: Notification = {
      ...notif,
      id: Date.now().toString(),
      time: "Agora",
      isRead: false
    };

    setNotifications(prev => [newNotif, ...prev]);

    // Mostrar Toast em tempo real
    toast(newNotif.title, {
      description: newNotif.message,
      icon: newNotif.type === 'order' ? <Package className="h-4 w-4 text-brand-accent" /> : <Bell className="h-4 w-4 text-indigo-600" />,
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      addNotification, 
      markAsRead, 
      markAllAsRead, 
      clearNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications deve ser usado dentro de um NotificationProvider");
  return context;
};