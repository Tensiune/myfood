"use client";

import { useCallback } from "react";

export function useNativeNotifications() {
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  const sendNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const n = new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      tag: "order-offer",
      requireInteraction: true, // Mantém na tela até o usuário agir
    });

    n.onclick = () => {
      window.focus();
      n.close();
    };
  }, []);

  return { requestPermission, sendNotification };
}