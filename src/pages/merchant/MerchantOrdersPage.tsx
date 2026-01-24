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
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";

const MerchantOrdersPage = () => {
  const navigate = useNavigate();
  const [merchantStatus, setMerchantStatus] = useState<string | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMerchantStatus(user.user_metadata?.status || 'NEEDS_SETUP');
        
        // Buscar status de abertura real do banco
        const { data, error } = await supabase
          .from('merchant_applications')
          .select('is_open')
          .eq('id', user.id)
          .single();
        
        if (data) setIsStoreOpen(data.is_open);
      }
    };
    fetchStatus();
  }, []);

  const handleToggleStore = async (checked: boolean) => {
    setLoadingStatus(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('merchant_applications')
        .update({ is_open: checked })
        .eq('id', user.id);

      if (error) throw error;

      setIsStoreOpen(checked);
      showSuccess(checked ? "Loja aberta! Você já pode receber pedidos." : "Loja fechada com sucesso.");
    } catch (err: any) {
      showError("Erro ao alterar status da loja: " + err.message);
    } finally {
      setLoadingStatus(false);
    }
  };

  const [orders, setOrders] = useState([
    { 
      id: "101", 
      customer: "Maria Silva", 
      items: "2x Feijoada Completa, 1x Coca-Cola 2L", 
      total: "R$ 78.90", 
      status: "NEW", 
      time: "5 min atrás",
      address: "Rua das Flores, 123"
    }
  ]);

  const updateStatus = (id: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    showSuccess("Status do pedido atualizado!");
  };

  if (merchantStatus === 'PENDING') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6 bg-white rounded-3xl shadow-xl">
        <Store className="h-20 w-20 text-yellow-500 mx-auto" />
        <h1 className="text-3xl font-black text-indigo-900">Aguardando Aprovação</h1>
        <p className="text-gray-600 max-w-md">
          Seu cadastro foi enviado para análise. Você será notificado por e-mail quando sua loja for aprovada.
        </p>
        <Button 
          variant="outline"
          className="rounded-2xl border-indigo-200 text-indigo-600 font-bold py-3 px-6"
          onClick={() => navigate("/merchant/setup")}
        >
          Revisar Configuração
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-indigo-900">Gestão de Pedidos</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <span className={cn("text-sm font-bold", isStoreOpen ? "text-green-600" : "text-red-500")}>
              {loadingStatus ? "Processando..." : `Loja ${isStoreOpen ? 'Aberta' : 'Fechada'}`}
            </span>
            <Switch 
              checked={isStoreOpen} 
              onCheckedChange={handleToggleStore} 
              disabled={loadingStatus}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
          <Badge variant="outline" className="bg-white">Abertos: {orders.length}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h2 className="font-bold text-gray-500 flex items-center gap-2 px-1">
            <span className="h-2 w-2 bg-blue-500 rounded-full" /> Recebidos
          </h2>
          {orders.filter(o => o.status === "NEW").map(order => (
            <OrderCard key={order.id} order={order} onAction={() => updateStatus(order.id, "PREPARING")} actionLabel="Aceitar Pedido" />
          ))}
        </div>
        <div className="space-y-4">
          <h2 className="font-bold text-gray-500 flex items-center gap-2 px-1">
            <span className="h-2 w-2 bg-orange-500 rounded-full" /> Em Preparo
          </h2>
        </div>
        <div className="space-y-4">
          <h2 className="font-bold text-gray-500 flex items-center gap-2 px-1">
            <span className="h-2 w-2 bg-green-600 rounded-full" /> Aguardando Coleta
          </h2>
        </div>
      </div>
    </div>
  );
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
        <div className="p-4 bg-gray-50/50 flex justify-between items-center">
          <span className="font-black text-indigo-900">{order.total}</span>
          <Button size="sm" className="rounded-lg font-bold text-xs h-9 px-4 bg-indigo-600" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantOrdersPage;