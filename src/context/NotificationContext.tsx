"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, MessageSquare, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNativeNotifications } from "@/hooks/useNativeNotifications";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "order" | "chat" | "info" | "success";
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { sendNotification } = useNativeNotifications();

  useEffect(() => {
    const setupChatListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('global_chat_notifs')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'order_chats',
          filter: `receiver_id=eq.${user.id}`
        }, async (payload) => {
          // Busca o nome de quem enviou
          const { data: senderName } = await supabase.rpc('get_user_full_name', { user_id: payload.new.sender_id });
          
          const title = `Mensagem de ${senderName || 'Contato'}`;
          const body = payload.new.message;

          addNotification({
            title,
            message: body,
            type: "chat",
            link: `/chat/${payload.new.sender_id}?orderId=${payload.new.order_id}`
          });

          // Notificação Nativa (Funciona em segundo plano se o navegador permitir)
          sendNotification(title, body);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    setupChatListener();
  }, [sendNotification]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addNotification = (notif: Omit<Notification, "id" | "time" | "isRead">) => {
    const newNotif: Notification = {
      ...notif,
      id: Date.now().toString(),
      time: "Agora",
      isRead: false
    };

    setNotifications(prev => [newNotif, ...prev]);

    // Exibe o Toast no topo da tela
    toast(newNotif.title, {
      description: newNotif.message,
      icon: newNotif.type === 'chat' ? <MessageSquare className="h-4 w-4 text-indigo-600" /> : <Bell className="h-4 w-4 text-indigo-600" />,
      action: newNotif.link ? {
        label: "Ver",
        onClick: () => window.location.href = newNotif.link!
      } : undefined
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearNotifications = () => setNotifications([]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications deve ser usado dentro de um NotificationProvider");
  return context;
};