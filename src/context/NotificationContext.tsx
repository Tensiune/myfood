"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
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
  const { user } = useAuth();
  const { sendNotification: sendNative } = useNativeNotifications();

  useEffect(() => {
    if (!user) return;

    // Criamos um canal único para o usuário escutar mensagens
    const channel = supabase
      .channel(`user_notifications_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_chats' },
        async (payload) => {
          // Filtro Manual: Só processa se o destinatário for o usuário logado
          if (payload.new.receiver_id === user.id) {
            
            // Busca o nome de quem enviou (RPC)
            const { data: senderName } = await supabase.rpc('get_user_full_name', { 
                user_id: payload.new.sender_id 
            });
            
            const title = `Nova mensagem de ${senderName || 'Contato'}`;
            const body = payload.new.message;
            const chatLink = `/chat/${payload.new.sender_id}?orderId=${payload.new.order_id || ''}`;

            // 1. Adiciona à lista interna (Sininho)
            const newNotif: Notification = {
                id: payload.new.id,
                title,
                message: body,
                type: "chat",
                time: "Agora",
                isRead: false,
                link: chatLink
            };
            setNotifications(prev => [newNotif, ...prev]);

            // 2. Dispara o Toast no topo (Visual)
            toast(title, {
              description: body,
              icon: <MessageSquare className="h-5 w-5 text-indigo-600" />,
              duration: 5000,
              onClick: () => {
                window.location.href = chatLink;
              },
              action: {
                label: "Responder",
                onClick: () => window.location.href = chatLink
              }
            });

            // 3. Notificação Nativa (Caso o app esteja em background)
            sendNative(title, body);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sendNative]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addNotification = (notif: Omit<Notification, "id" | "time" | "isRead">) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substr(2, 9),
      time: "Agora",
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev]);
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