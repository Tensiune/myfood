"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Loader2, 
  Search, 
  Download, 
  Eye,
  CreditCard as PaymentIcon,
  Truck,
  Package,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/utils/export";
import DateRangeSelector from "@/components/merchant/DateRangeSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import OrderReceipt from "@/components/merchant/OrderReceipt";
import { printReceipt } from "@/utils/print";

const DRIVER_FEE_PAID = 5.00;

interface Order {
  id: string;
  total: number;
  created_at: string;
  status: string;
  payment_method: string;
  customer_id: string;
  items: any[];
  delivery_type: string;
  logistics_mode: 'APP' | 'OWN';
  delivery_fee_customer: number;
  product_sales: number;
  merchant_commission: number;
  payment_processing_fee: number;
  driver_fee_paid: number;
  customer_full_name: string;
}

const MerchantOrderHistoryPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const today = startOfDay(new Date());
  const [dateFilter, setDateFilter] = useState("7d");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({ from: subDays(today, 7), to: today });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: feeData } = await supabase.from('app_settings').select('*').eq('key', 'platform_fees').single();
      const config = feeData?.value;

      let query = supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user.id)
        .eq('status', 'DELIVERED')
        .order('created_at', { ascending: false });

      if (customDateRange?.from) query = query.gte('created_at', format(customDateRange.from, 'yyyy-MM-dd'));
      if (customDateRange?.to) {
        const end = new Date(customDateRange.to);
        end.setDate(end.getDate() + 1);
        query = query.lt('created_at', format(end, 'yyyy-MM-dd'));
      }

      const { data: raw } = await query;
      
      const cIds = Array.from(new Set((raw || []).map(o => o.customer_id).filter(Boolean)));
      const { data: profiles } = cIds.length > 0 ? await supabase.from('profiles').select('id, first_name, last_name').in('id', cIds) : { data: [] };

      const enriched = (raw || []).map(o => {
        const p = profiles?.find(p => p.id === o.customer_id);
        const deliveryFee = o.delivery_type === 'delivery' ? 5.00 : 0;
        const driverCost = (o.driver_id && o.logistics_mode !== 'OWN') ? DRIVER_FEE_PAID : 0;
        
        const commFixed = config?.service_fee?.fixed || 0;
        const commPercent = config?.service_fee?.percent || 10;
        const commission = commFixed + (o.total * (commPercent / 100));

        const payConfig = config?.payment_fees?.[o.payment_method] || { fixed: 0, percent: 0 };
        const paymentFee = payConfig.fixed + (o.total * (payConfig.percent / 100));

        return {
          ...o,
          customer_full_name: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Cliente',
          delivery_fee_customer: deliveryFee,
          product_sales: o.total - deliveryFee,
          merchant_commission: commission,
          payment_processing_fee: paymentFee,
          driver_fee_paid: driverCost,
        };
      });

      setOrders(enriched as Order[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [customDateRange]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.customer_full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  const handleExport = () => {
    const exportData = filteredOrders.map(o => ({
      "1. Faturamento Total": o.total,
      "2. Venda Produtos": o.product_sales,
      "3. Taxa Entrega (Cliente)": o.delivery_fee_customer,
      "4. Custo Entrega (Motorista)": o.driver_fee_paid,
      "5. Comissão APP": o.merchant_commission,
      "6. Taxa Pagamento": o.payment_processing_fee,
      "7. Líquido": (o.total - o.driver_fee_paid - o.merchant_commission - o.payment_processing_fee).toFixed(2),
      "ID Pedido": o.id.slice(0, 8),
      "Data": format(new Date(o.created_at), 'dd/MM/yyyy HH:mm'),
      "Cliente": o.customer_full_name,
      "Pagamento": o.payment_method,
      "Logística": o.logistics_mode
    }));
    exportToExcel(exportData, `Historico_Vendas_${format(new Date(), 'dd_MM_yyyy')}`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Histórico de Pedidos</h1>
        <Button className="rounded-2xl bg-green-600 hover:bg-green-700 font-bold h-12 px-8" onClick={handleExport}>
          <Download className="h-5 w-5 mr-2" /> Exportar Planilha
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DateRangeSelector dateFilter={dateFilter} setDateFilter={setDateFilter} customDateRange={customDateRange} setCustomDateRange={setCustomDateRange} calculatedDateRange={customDateRange} />
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <Input placeholder="Buscar por ID ou nome do cliente..." className="rounded-xl pl-10 h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">Pedido</TableHead>
              <TableHead className="font-bold">Cliente</TableHead>
              <TableHead className="font-bold">Faturamento (1)</TableHead>
              <TableHead className="font-bold">Custo Entrega (4)</TableHead>
              <TableHead className="font-bold">Taxas (5+6)</TableHead>
              <TableHead className="text-right font-bold">Líquido (7)</TableHead>
              <TableHead className="text-right font-bold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></TableCell></TableRow> :
            filteredOrders.map(o => (
              <TableRow key={o.id} className="hover:bg-indigo-50/30">
                <TableCell>
                  <div className="font-bold text-gray-800">#{o.id.slice(0, 6)}</div>
                  <div className="text-[10px] text-gray-400 uppercase font-black">{format(new Date(o.created_at), 'dd/MM HH:mm')}</div>
                </TableCell>
                <TableCell className="font-medium text-gray-700">{o.customer_full_name}</TableCell>
                <TableCell className="font-bold">R$ {o.total.toFixed(2)}</TableCell>
                <TableCell className="text-red-500 font-medium">R$ {o.driver_fee_paid.toFixed(2)}</TableCell>
                <TableCell className="text-red-500 font-medium">R$ {(o.merchant_commission + o.payment_processing_fee).toFixed(2)}</TableCell>
                <TableCell className="text-right"><span className="font-black text-green-600">R$ {(o.total - o.driver_fee_paid - o.merchant_commission - o.payment_processing_fee).toFixed(2)}</span></TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="rounded-full text-indigo-600 hover:bg-indigo-50" onClick={() => setSelectedOrder(o)}>
                        <Eye className="h-5 w-5" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-md h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <DialogTitle className="text-xl font-black">Detalhes do Pedido</DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)}><X /></Button>
          </div>
          <ScrollArea className="flex-1 p-6 bg-white">
            {selectedOrder && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200 flex justify-center">
                    <OrderReceipt order={selectedOrder} merchantName="Minha Loja" customerName={selectedOrder.customer_full_name} printSettings={{ paperWidth: "80mm", fontSize: "medium", includeLogo: false, margin: 5 }} />
                </div>
                <Button variant="outline" className="w-full h-12 rounded-xl border-indigo-100 text-indigo-600 font-bold" onClick={() => printReceipt(selectedOrder, "Minha Loja", selectedOrder.customer_full_name, { paperWidth: "80mm", fontSize: "medium", includeLogo: false, margin: 5 })}>
                    IMPRIMIR COMANDA
                </Button>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantOrderHistoryPage;