"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Loader2, 
  Search, 
  Calendar, 
  Download, 
  DollarSign, 
  Tag, 
  Package, 
  Truck,
  User
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/utils/export";

// Constantes de taxas (assumidas do CartPage e para fins de demonstração)
const DELIVERY_FEE_CUSTOMER = 5.00;
const MERCHANT_COMMISSION_RATE = 0.10; // 10% de comissão sobre o subtotal

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  total: number;
  created_at: string;
  status: string;
  payment_method: string;
  customer_id: string;
  items: OrderItem[];
  is_new_customer?: boolean;
}

const MerchantOrderHistoryPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('created_at', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setDate(endOfDay.getDate() + 1);
        query = query.lt('created_at', format(endOfDay, 'yyyy-MM-dd'));
      }

      const { data: rawOrders, error } = await query;

      if (error) throw error;
      
      // Enriquecer dados (calcular subtotal, desconto, e verificar novo cliente)
      const enrichedOrders = await Promise.all((rawOrders || []).map(async (order: any) => {
        const subtotal = (order.items || []).reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);
        
        // Simulação de cupom (se o total for menor que o subtotal + taxa de entrega)
        const totalWithFee = subtotal + DELIVERY_FEE_CUSTOMER;
        const discount = Math.max(0, totalWithFee - order.total);
        const hasCoupon = discount > 0.01;
        
        // Verifica se é novo cliente
        const { data: isNew } = await supabase.rpc('is_new_customer', { 
            p_customer_id: order.customer_id, 
            p_current_order_created_at: order.created_at 
        });

        return {
          ...order,
          subtotal,
          discount,
          hasCoupon,
          is_new_customer: isNew,
          item_count: (order.items || []).reduce((sum: number, item: OrderItem) => sum + item.quantity, 0),
          delivery_fee_customer: DELIVERY_FEE_CUSTOMER,
          merchant_commission: subtotal * MERCHANT_COMMISSION_RATE,
        };
      }));

      setOrders(enrichedOrders as Order[]);
    } catch (err: any) {
      console.error(err);
      showError("Erro ao carregar histórico de pedidos.");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    return orders.filter(order => 
      order.id.toLowerCase().includes(lowerCaseSearch) ||
      order.status.toLowerCase().includes(lowerCaseSearch) ||
      order.payment_method.toLowerCase().includes(lowerCaseSearch) ||
      order.items.some(item => item.name.toLowerCase().includes(lowerCaseSearch))
    );
  }, [orders, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge className="bg-blue-100 text-blue-700 border-none rounded-full">Aguardando Loja</Badge>;
      case "PREPARING": return <Badge className="bg-orange-100 text-orange-700 border-none rounded-full">Em Preparo</Badge>;
      case "WAITING_FOR_DRIVER": return <Badge className="bg-indigo-100 text-indigo-700 border-none rounded-full">Aguardando Entregador</Badge>;
      case "OUT_FOR_DELIVERY": return <Badge className="bg-yellow-500 text-white rounded-full">Em Rota</Badge>;
      case "DELIVERED": return <Badge className="bg-green-500 text-white rounded-full">Entregue</Badge>;
      case "CANCELLED": return <Badge className="bg-red-100 text-red-600 border-none rounded-full">Cancelado</Badge>;
      default: return <Badge variant="secondary" className="rounded-full">{status}</Badge>;
    }
  };
  
  const handleExport = () => {
    const exportData = filteredOrders.map(order => ({
      "ID do Pedido": order.id.slice(0, 8),
      "Data/Hora": format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      "Status": order.status,
      "Total (R$)": order.total,
      "Subtotal (R$)": (order as any).subtotal,
      "Taxa Cliente (R$)": (order as any).delivery_fee_customer,
      "Comissão Loja (R$)": (order as any).merchant_commission,
      "Desconto Cupom (R$)": (order as any).discount,
      "Itens (Qtd)": (order as any).item_count,
      "Forma de Pagamento": order.payment_method,
      "Novo Cliente": (order as any).is_new_customer ? "Sim" : "Não",
    }));
    
    const dateLabel = dateRange?.from 
        ? `De ${format(dateRange.from, 'dd-MM-yyyy')} a ${format(dateRange.to || new Date(), 'dd-MM-yyyy')}`
        : 'Geral';
        
    exportToExcel(exportData, `Historico_Pedidos_${dateLabel}`);
    showSuccess("Histórico exportado com sucesso!");
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Histórico de Pedidos</h1>
          <p className="text-gray-500">Todos os pedidos recebidos pela sua loja.</p>
        </div>
        <Button 
          className="rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-8 shadow-lg gap-2"
          onClick={handleExport}
          disabled={filteredOrders.length === 0}
        >
          <Download className="h-5 w-5" /> Exportar ({filteredOrders.length})
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <Input 
            placeholder="Buscar por ID, status ou item do pedido..." 
            className="rounded-xl pl-10 h-12 border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-100 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">ID / Data</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Itens</TableHead>
              <TableHead className="font-bold">Pagamento</TableHead>
              <TableHead className="text-right font-bold">Total (R$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">Carregando histórico...</p>
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-gray-400 font-medium">
                  Nenhum pedido encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order: any) => (
                <TableRow key={order.id} className="hover:bg-indigo-50/30 transition-colors">
                  <TableCell>
                    <div className="font-bold text-gray-800">#{order.id.slice(0, 6)}</div>
                    <div className="text-xs text-gray-500">{format(new Date(order.created_at), 'dd/MM HH:mm')}</div>
                  </TableCell>
                  <TableCell>
                    <div className="mb-1">{getStatusBadge(order.status)}</div>
                    {order.is_new_customer && (
                        <Badge variant="outline" className="text-[10px] font-bold text-brand-accent border-brand-accent/50 bg-brand-accent/10 gap-1">
                            <User className="h-3 w-3" /> Novo Cliente
                        </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-700">{order.item_count} itens</div>
                    {order.hasCoupon && (
                        <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
                            <Tag className="h-3 w-3" /> Cupom Aplicado
                        </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-700 uppercase">{order.payment_method}</div>
                    <div className="text-xs text-gray-500">Comissão: R$ {order.merchant_commission.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Taxa Cliente: R$ {order.delivery_fee_customer.toFixed(2)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-black text-lg text-indigo-900">R$ {order.total.toFixed(2)}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default MerchantOrderHistoryPage;