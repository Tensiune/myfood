"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  DollarSign, 
  Bike, 
  Calendar, 
  MapPin, 
  Clock,
  History
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DeliveredOrder {
  id: string;
  total: number;
  created_at: string;
  delivery_address: any;
  customer_full_name: string;
}

const DRIVER_FEE_PER_ORDER = 5.00; // Placeholder for driver earnings

const DeliveryHistoryPage = () => {
  const [orders, setOrders] = useState<DeliveredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const fetchDeliveredOrders = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('orders')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'DELIVERED')
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('created_at', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        // Adiciona 1 dia para incluir o dia final
        const endOfDay = new Date(dateRange.to);
        endOfDay.setDate(endOfDay.getDate() + 1);
        query = query.lt('created_at', format(endOfDay, 'yyyy-MM-dd'));
      }

      const { data: rawOrders, error } = await query;

      if (error) throw error;
      
      const customerIds = Array.from(new Set((rawOrders || []).map(o => o.customer_id).filter(Boolean)));
      let profilesData: any[] = [];

      if (customerIds.length > 0) {
          const res = await supabase.from('profiles').select('id, first_name, last_name').in('id', customerIds);
          if (!res.error) profilesData = res.data || [];
      }

      const enrichedOrders = (rawOrders || []).map(order => {
        const profile = profilesData.find(p => p.id === order.customer_id);
        const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Cliente';
        return {
          ...order,
          customer_full_name: fullName,
        };
      });

      setOrders(enrichedOrders as DeliveredOrder[]);
    } catch (err: any) {
      console.error(err);
      showError("Erro ao carregar histórico de entregas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveredOrders();
  }, [dateRange]);

  const stats = useMemo(() => {
    const totalDeliveries = orders.length;
    const totalEarnings = totalDeliveries * DRIVER_FEE_PER_ORDER;
    return { totalDeliveries, totalEarnings };
  }, [orders]);

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-3xl font-black text-indigo-900">Histórico de Entregas</h1>
      <p className="text-gray-500">Entregas concluídas e seus ganhos.</p>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-2xl border-none shadow-lg bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">A Receber (Est.)</p>
              <h3 className="text-2xl font-black text-indigo-900">R$ {stats.totalEarnings.toFixed(2)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-lg bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Bike className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Entregas</p>
              <h3 className="text-2xl font-black text-indigo-900">{stats.totalDeliveries}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <DateRangePicker date={dateRange} setDate={setDateRange} />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-2" />
          <p className="text-gray-500 font-medium">Carregando entregas...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-100 rounded-3xl border-2 border-dashed border-gray-200">
          <History className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma entrega encontrada no período.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="rounded-2xl border-none shadow-sm bg-white">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500 text-white rounded-full text-xs font-bold">Entregue</Badge>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">#{order.id.slice(0, 6)}</span>
                  </div>
                  <span className="font-black text-lg text-green-600">R$ {DRIVER_FEE_PER_ORDER.toFixed(2)}</span>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-indigo-600 mt-1 shrink-0" />
                  <div>
                    <p className="font-bold text-gray-800 leading-tight">{order.customer_full_name}</p>
                    <p className="text-xs text-gray-600">{order.delivery_address?.street}, {order.delivery_address?.number}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                  {/* Botão de detalhes removido */}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryHistoryPage;