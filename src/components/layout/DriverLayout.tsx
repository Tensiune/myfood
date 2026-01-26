"use client";

import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Bike, List, User, Bell, Map, ChevronRight, MapPin, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

const DriverLayout = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Busca o status atual do entregador
  useEffect(() => {
    const fetchStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setDriverStatus(user.user_metadata?.status || 'NEEDS_SETUP');
      }
      setLoading(false);
    };
    fetchStatus();
  }, []);

  // Ativa o rastreamento quando o motorista está online
  const { isTracking } = useDriverLocationTracker(isOnline);

  const navItems = [
    { path: "/driver/orders", icon: List, label: "Pedidos" },
    { path: "/driver/map", icon: Map, label: "Mapa" },
    { path: "/driver/profile", icon: User, label: "Perfil" },
  ];
  
  const handleToggleOnline = (checked: boolean) => {
    if (checked) {
      // VALIDAÇÃO CRÍTICA: Só permite ficar online se estiver aprovado
      if (driverStatus !== 'APPROVED') {
        let msg = "Sua conta ainda não foi aprovada pelo administrador.";
        if (driverStatus === 'NEEDS_SETUP') msg = "Você precisa completar seu cadastro primeiro.";
        if (driverStatus === 'REJECTED') msg = "Seu cadastro foi recusado. Entre em contato com o suporte.";
        
        showError(msg);
        setIsOnline(false);
        return;
      }

      // Permissão de localização
      if (localStorage.getItem('driver_location_permission') !== 'granted') {
        if (window.confirm("Para ficar online, você precisa permitir o acesso à sua localização em segundo plano. Isso é essencial para receber pedidos. Deseja autorizar?")) {
          localStorage.setItem('driver_location_permission', 'granted');
          showSuccess("Permissão concedida! Você está online.");
          setIsOnline(true);
        } else {
          showError("Você precisa conceder a permissão para ficar online.");
          setIsOnline(false);
        }
      } else {
        setIsOnline(true);
      }
    } else {
      setIsOnline(false);
    }
  };

  const getStatusBadge = () => {
    switch (driverStatus) {
      case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-700 border-none gap-1"><Clock className="h-3 w-3" /> Em Análise</Badge>;
      case 'REJECTED': return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Recusado</Badge>;
      case 'APPROVED': return null; // Não mostra nada se estiver tudo ok
      default: return null;
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Driver Status Header */}
      <header className="bg-white p-4 sticky top-0 z-20 border-b border-gray-100 flex items-center justify-between shadow-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-3 w-3 rounded-full animate-pulse",
              isOnline ? "bg-green-500" : "bg-red-500"
            )} />
            <Label htmlFor="online-status" className="font-bold text-indigo-900">
              {isOnline ? "Online" : "Offline"}
            </Label>
          </div>
          <div className="mt-1">{getStatusBadge()}</div>
        </div>
        
        <Switch 
          id="online-status" 
          checked={isOnline} 
          onCheckedChange={handleToggleOnline}
          className="data-[state=checked]:bg-green-500"
          disabled={driverStatus !== 'APPROVED'}
        />
      </header>
      
      {/* Tracking Status Alert */}
      {isOnline && (
        <div className="bg-green-500 text-white p-2 text-center text-xs font-bold flex items-center justify-center gap-2">
          <MapPin className="h-3 w-3 animate-pulse" />
          RASTREAMENTO DE GPS ATIVO
        </div>
      )}

      {/* Content */}
      <main className="flex-grow container mx-auto p-4 max-w-2xl pb-24">
        {driverStatus === 'PENDING' && location.pathname !== "/driver/profile" && (
          <div className="bg-indigo-900 text-white p-6 rounded-3xl mb-6 shadow-xl shadow-indigo-200">
            <div className="flex items-start gap-4">
              <Clock className="h-8 w-8 text-yellow-400 shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-1">Perfil em Análise</h2>
                <p className="text-indigo-100 text-sm">
                  Recebemos seus documentos! Nossa equipe está validando os dados. 
                  Você não poderá ficar online até ser aprovado.
                </p>
              </div>
            </div>
          </div>
        )}

        {driverStatus === 'APPROVED' && !isOnline && location.pathname !== "/driver/profile" && (
          <div className="bg-indigo-900 text-white p-6 rounded-3xl mb-6 shadow-xl shadow-indigo-200">
            <h2 className="text-xl font-bold mb-2">Pronto para rodar?</h2>
            <p className="text-indigo-100 text-sm mb-4">Fique online para começar a receber pedidos próximos de você.</p>
            <Button 
              className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-bold rounded-xl"
              onClick={() => handleToggleOnline(true)}
            >
              Ficar Online Agora
            </Button>
          </div>
        )}
        
        <Outlet />
      </main>

      {/* Driver Bottom Nav */}
      <nav className="bg-white border-t border-gray-100 p-2 fixed bottom-0 left-0 right-0 z-20 safe-area-bottom">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center p-2 transition-colors relative",
                  isActive ? "text-indigo-600" : "text-gray-400"
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-bold">{item.label}</span>
                {isActive && (
                  <span className="absolute -top-1 h-1 w-1 bg-indigo-600 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default DriverLayout;