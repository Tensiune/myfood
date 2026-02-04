"use client";

import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Bike, List, User, Bell, Map, ChevronRight, MapPin, Clock, AlertCircle, History, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { useNativeNotifications } from "@/hooks/useNativeNotifications";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/context/NotificationContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import NotificationList from "@/components/shared/NotificationList";

const DriverLayout = () => {
  const [isOnline, setIsOnline] = useState(() => localStorage.getItem('driver_online_status') === 'online');
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { requestPermission } = useNativeNotifications();
  const { unreadCount } = useNotifications();
  
  useEffect(() => {
    const fetchStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const status = user.user_metadata?.status || 'NEEDS_SETUP';
        setDriverStatus(status);
        if (status !== 'APPROVED') {
            setIsOnline(false);
            localStorage.setItem('driver_online_status', 'offline');
        }
      }
      setLoading(false);
    };
    fetchStatus();
  }, []);

  useDriverLocationTracker(isOnline, null); // Ajustado para passar null se não tiver ID imediato, o hook lida

  const navItems = [
    { path: "/driver/orders", icon: List, label: "Pedidos" },
    { path: "/driver/map", icon: Map, label: "Mapa" },
    { path: "/driver/history", icon: History, label: "Histórico" },
    { path: "/driver/payments", icon: DollarSign, label: "Pagamentos" },
    { path: "/driver/profile", icon: User, label: "Perfil" },
  ];
  
  const handleToggleOnline = async (checked: boolean) => {
    if (checked) {
      if (driverStatus !== 'APPROVED') {
        showError("Aguarde a aprovação do seu perfil.");
        setIsOnline(false);
        return;
      }

      await requestPermission();
      
      if (localStorage.getItem('driver_location_permission') !== 'granted') {
        if (window.confirm("Autorizar GPS?")) {
          localStorage.setItem('driver_location_permission', 'granted');
        } else {
          setIsOnline(false);
          return;
        }
      }
      
      setIsOnline(true);
      localStorage.setItem('driver_online_status', 'online');
      showSuccess("Você está pronto para receber pedidos!");

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          supabase.functions.invoke('dispatch-order', {
              body: { driverId: user.id }
          }).catch(e => console.error("Initial match fail", e));
      }

    } else {
      setIsOnline(false);
      localStorage.setItem('driver_online_status', 'offline');
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white p-4 sticky top-0 z-20 border-b border-gray-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full animate-pulse", isOnline ? "bg-green-500" : "bg-red-500")} />
            <span className="font-bold text-indigo-900 text-sm">{isOnline ? "Online" : "Offline"}</span>
          </div>
          <Switch 
            id="online-status" 
            checked={isOnline} 
            onCheckedChange={handleToggleOnline}
            className="data-[state=checked]:bg-green-500"
            disabled={driverStatus !== 'APPROVED'}
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full relative bg-gray-50">
              <Bell className="h-5 w-5 text-indigo-900" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-white border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md rounded-l-3xl">
            <NotificationList />
          </SheetContent>
        </Sheet>
      </header>
      
      <main className="flex-grow container mx-auto p-4 max-w-2xl pb-24">
        <Outlet />
      </main>

      <nav className="bg-white border-t border-gray-100 p-2 fixed bottom-0 left-0 right-0 z-20 safe-area-bottom">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={cn("flex flex-col items-center p-2 transition-colors relative", isActive ? "text-indigo-600" : "text-gray-400")}>
                <Icon className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-bold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default DriverLayout;