"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  ChefHat, 
  Bike, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  MessageCircle,
  Store
} from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";

const MerchantOrdersPage = () => {
  const navigate = useNavigate();
  const [merchantStatus, setMerchantStatus] = useState<string | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false); // New state for manual store status

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMerchantStatus(user.user_metadata?.status || 'PENDING');
      }
    };
    fetchStatus();
  }, []);

  const [orders, setOrders] = useState([
    { 
      id: "101", 
      customer: "Maria Silva", 
      items: "2x Feijoada Completa, 1x Coca-Cola 2L", 
      total: "R$ 78.90", 
      status: "NEW", 
      time: "5 min atrás",
      address: "Rua das Flores, 123"
    },
    { 
      id: "102", 
      customer: "João Pedro", 
      items: "1x Pizza Calabresa G, 1x Suco de Laranja", 
      total: "R$ 55.00", 
      status: "PREPARING", 
      time: "15 min atrás",
      address: "Av. Central, 450 - Ap 12"
    },
    { 
      id: "103", 
      customer: "Ana Paula", 
      items: "3x X-Burger Artesanal", 
      total: "R$ 90.00", 
      status: "READY", 
      time: "25 min atrás",
      address: "Rua Treze de Maio, 88"
    }
  ]);

  const updateStatus = (id: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    showSuccess("Status do pedido atualizado!");
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case "NEW": return { label: "Novo", color: "bg-blue-500", icon: AlertCircle };
      case "PREPARING": return { label: "Na Cozinha", color: "bg-orange-500", icon: ChefHat };
      case "READY": return { label: "Pronto p/ Coleta", color: "bg-green-600", icon: Bike };
      default: return { label: "Concluído", color: "bg-gray-400", icon: CheckCircle2 };
    }
  };

  if (merchantStatus === 'PENDING' || merchantStatus === null) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6 bg-white rounded-3xl shadow-xl">
        <Store className="h-20 w-20 text-yellow-500 mx-auto" />
        <h1 className="text-3xl font-black text-indigo-900">Aguardando Aprovação</h1>
        <p className="text-gray-600 max-w-md">
          Seu cadastro foi enviado para análise. Você será notificado por e-mail quando sua loja for aprovada e puder começar a receber pedidos.
        </p>
        <Button 
          className="rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 px-6"
          onClick={() => navigate("/merchant/setup")}
        >
          Revisar Configuração
        </Button>
      </div>
    );
  }
  
  // Only show the dashboard content if APPROVED
  if (merchantStatus === 'APPROVED') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-900">Gestão de Pedidos</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-600">Loja {isStoreOpen ? 'Aberta' : 'Fechada'}</span>
              <Switch 
                checked={isStoreOpen} 
                onCheckedChange={setIsStoreOpen} 
                className="data-[state=checked]:bg-green-500"
              />
            </div>
            <Badge variant="outline" className="bg-white">Abertos: {orders.length}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Coluna: Novos / Pendentes */}
          <div className="space-y-4">
            <h2 className="font-bold text-gray-500 flex items-center gap-2 px-1">
              <span className="h-2 w-2 bg-blue-500 rounded-full" /> Recebidos
            </h2>
            {orders.filter(o => o.status === "NEW").map(order => (
              <OrderCard key={order.id} order={order} onAction={() => updateStatus(order.id, "PREPARING")} actionLabel="Aceitar Pedido" />
            ))}
          </div>

          {/* Coluna: Em Preparo */}
          <div className="space-y-4">
            <h2 className="font-bold text-gray-500 flex items-center gap-2 px-1">
              <span className="h-2 w-2 bg-orange-500 rounded-full" /> Em Preparo
            </h2>
            {orders.filter(o => o.status === "PREPARING").map(order => (
              <OrderCard key={order.id} order={order} onAction={() => updateStatus(order.id, "READY")} actionLabel="Marcar como Pronto" variant="warning" />
            ))}
          </div>

          {/* Coluna: Aguardando Coleta */}
          <div className="space-y-4">
            <h2 className="font-bold text-gray-500 flex items-center gap-2 px-1">
              <span className="h-2 w-2 bg-green-600 rounded-full" /> Aguardando Coleta
            </h2>
            {orders.filter(o => o.status === "READY").map(order => (
              <OrderCard key={order.id} order={order} onAction={() => updateStatus(order.id, "COMPLETED")} actionLabel="Entregue ao Entregador" variant="success" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

const OrderCard = ({ order, onAction, actionLabel, variant = "default" }: any) => {
  return (
    <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
      <CardContent className="p-0">
        <div className="p-4 border-b border-gray-50">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pedido #{order.id}</span>
              <h3 className="font-bold text-gray-900">{order.customer}</h3>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">{order.time}</Badge>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{order.items}</p>
        </div>
        <div className="p-4 bg-gray-50/50 space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MessageCircle className="h-3 w-3" />
            <span className="truncate">{order.address}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-black text-indigo-900">{order.total}</span>
            <Button 
              size="sm" 
              className={cn(
                "rounded-lg font-bold text-xs h-9 px-4",
                variant === "default" ? "bg-indigo-600 hover:bg-indigo-700" :
                variant === "warning" ? "bg-orange-500 hover:bg-orange-600" :
                "bg-green-600 hover:bg-green-700"
              )}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantOrdersPage;