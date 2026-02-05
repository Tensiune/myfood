"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, subDays, startOfDay } from "date-fns";
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
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  CreditCard as PaymentIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/utils/export";
import DateRangeSelector from "@/components/merchant/DateRangeSelector";

const DRIVER_FEE_PAID = 5.00;

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
  subtotal: number;
  discount: number;
  hasCoupon: boolean;
  coupon_code?: string;
  item_count: number;
  delivery_fee_customer: number;
  merchant_commission: number;
  payment_processing_fee: number;
  driver_fee_paid: number;
  logistics_mode: 'APP' | 'OWN';
}

const MerchantOrderHistoryPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showItemDetails, setShowItemDetails] = useState(false);
  
  const today = startOfDay(new Date());
  const [dateFilter, setDateFilter] = useState("7d");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({ from: subDays(today, 7), to: today });

  const calculatedDateRange = useMemo(() => customDateRange, [customDateRange]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Tax Config
      const { data: feeData } = await supabase.from('app_settings').select('*').eq('key', 'platform_fees').single();
      const config = feeData?.value;

      // 2. Fetch Orders
      let query = supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (calculatedDateRange?.from) {
        query = query.gte('created_at', format(calculatedDateRange.from, 'yyyy-MM-dd'));
      }
      if (calculatedDateRange?.to) {
        const endOfDay = new Date(calculatedDateRange.to);
        endOfDay.setDate(endOfDay.getDate() + 1);
        query = query.lt('created_at', format(endOfDay, 'yyyy-MM-dd'));
      }

      const { data: rawOrders, error } = await query;
      if (error) throw error;
      
      const enrichedOrders = await Promise.all((rawOrders || []).map(async (order: any) => {
        const subtotal = (order.items || []).reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);
        
        // Simulação de cálculo de taxas baseado na config
        const platformFixed = config?.service_fee?.fixed || 0;
        const platformPercent = config?.service_fee?.percent || 10;
        const commission = platformFixed + (order.total * (platformPercent / 100));

        const payFeeConfig = config?.payment_fees?.[order.payment_method] || { fixed: 0, percent: 0 };
        const processingFee = payFeeConfig.fixed + (order.total * (payFeeConfig.percent / 100));

        const isOwnFleet = order.logistics_mode === 'OWN';

        return {
          ...order,
          subtotal,
          item_count: (order.items || []).reduce((sum: number, item: OrderItem) => sum + item.quantity, 0),
          merchant_commission: commission,
          payment_processing_fee: processingFee,
          driver_fee_paid: (order.driver_id && !isOwnFleet) ? DRIVER_FEE_PAID : 0,
          logistics_mode: order.logistics_mode || 'APP'
        };
      }));

      setOrders(enrichedOrders as Order[]);
    } catch (err: any) {
      console.error(err);
      showError("Erro ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  }, [calculatedDateRange]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const lowerCaseSearch = searchTerm.toLowerCase();
    return orders.filter(order => 
      order.id.toLowerCase().includes(lowerCaseSearch) ||
      order.customer_id.toLowerCase().includes(lowerCaseSearch) ||
      order.payment_method.toLowerCase().includes(lowerCaseSearch)
    );
  }, [orders, searchTerm]);

  const handleExport = () => {
    const exportData = filteredOrders.map(order => ({
      "ID": order.id.slice(0, 8),
      "Data": format(new Date(order.created_at), 'dd/MM/yyyy HH:mm'),
      "Total (R$)": order.total,
      "Comissão App (R$)": order.merchant_commission,
      "Taxa Proc. (R$)": order.payment_processing_fee,
      "Ganhos Líquidos (R$)": (order.total - order.merchant_commission - order.payment_processing_fee).toFixed(2),
      "Pagamento": order.payment_method
    }));
    exportToExcel(exportData, `Vendas_${new Date().getTime()}`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Histórico de Pedidos</h1>
          <p className="text-gray-500">Relatório detalhado com taxas reais aplicadas.</p>
        </div>
        <Button className="rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-8" onClick={handleExport} disabled={filteredOrders.length === 0}>
          <Download className="h-5 w-5 mr-2" /> Exportar Planilha
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <DateRangeSelector 
            dateFilter={dateFilter} setDateFilter={setDateFilter}
            customDateRange={customDateRange} setCustomDateRange={setCustomDateRange}
            calculatedDateRange={calculatedDateRange}
          />
        </div>
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <Input 
            placeholder="Buscar por ID ou forma de pagamento..." 
            className="rounded-xl pl-10 h-12"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">Pedido</TableHead>
              <TableHead className="font-bold">Logística</TableHead>
              <TableHead className="font-bold">Pagamento</TableHead>
              <TableHead className="font-bold">Comissão App</TableHead>
              <TableHead className="font-bold">Taxa Processamento</TableHead>
              <TableHead className="text-right font-bold">Líquido (R$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></TableCell></TableRow>
            ) : filteredOrders.map((order) => (
              <TableRow key={order.id} className="hover:bg-indigo-50/30">
                <TableCell>
                  <div className="font-bold text-gray-800">#{order.id.slice(0, 6)}</div>
                  <div className="text-xs text-gray-500">{format(new Date(order.created_at), 'dd/MM HH:mm')}</div>
                </TableCell>
                <TableCell>
                    <Badge variant="outline" className={cn("text-[9px] font-black border-none gap-1", order.logistics_mode === 'OWN' ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500")}>
                        {order.logistics_mode === 'OWN' ? 'FROTA PRÓPRIA' : 'REDE APP'}
                    </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-bold uppercase flex items-center gap-1.5">
                    <PaymentIcon className="h-3 w-3 text-indigo-400" />
                    {order.payment_method}
                  </div>
                </TableCell>
                <TableCell className="text-red-500 font-medium">- R$ {order.merchant_commission.toFixed(2)}</TableCell>
                <TableCell className="text-red-500 font-medium">
                  {order.payment_processing_fee > 0 ? `- R$ ${order.payment_processing_fee.toFixed(2)}` : 'R$ 0,00'}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-black text-lg text-green-600">
                    R$ {(order.total - order.merchant_commission - order.payment_processing_fee).toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default MerchantOrderHistoryPage;