"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Corrigido: Importação adicionada
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRange } from "react-day-picker";
import { format, subDays, startOfDay } from "date-fns";
import { 
  Loader2, 
  Search, 
  Download, 
  Package,
  ReceiptText
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/utils/export";
import DateRangeSelector from "@/components/merchant/DateRangeSelector";

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
}

const MerchantOrderHistoryPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  
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
      
      const enriched = (raw || []).map(o => {
        const deliveryFee = o.delivery_type === 'delivery' ? 5.00 : 0;
        const driverCost = (o.driver_id && o.logistics_mode !== 'OWN') ? DRIVER_FEE_PAID : 0;
        
        const commFixed = config?.service_fee?.fixed || 0;
        const commPercent = config?.service_fee?.percent || 10;
        const commission = commFixed + (o.total * (commPercent / 100));

        const payConfig = config?.payment_fees?.[o.payment_method] || { fixed: 0, percent: 0 };
        const paymentFee = payConfig.fixed + (o.total * (payConfig.percent / 100));

        return {
          ...o,
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
    return orders.filter(o => o.id.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [orders, searchTerm]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedOrders(newExpanded);
  };

  const getFriendlyPaymentMethod = (method: string) => {
    switch (method) {
        case 'pix': return "App - pix";
        case 'card_credit_online': return "App - cartão de crédito";
        case 'card_debit_online': return "App - Cartão de débito";
        case 'card_credit_delivery': return "Entrega - Cartão crédito";
        case 'card_debit_delivery': return "Entrega - Cartão de débito";
        case 'pix_delivery': return "Entrega - Pix";
        case 'cash_delivery': return "Entrega Dinheiro";
        default: return method;
    }
  };

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
      "Pagamento": getFriendlyPaymentMethod(o.payment_method),
      "Logística": o.logistics_mode === 'OWN' ? "Entregador próprio" : "Rede App",
      "Produtos": o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
    }));
    exportToExcel(exportData, `Relatorio_Vendas_${format(new Date(), 'dd_MM_yyyy')}`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Relatório de Pedidos</h1>
          <p className="text-gray-500">Histórico operacional e financeiro (Dados de clientes ocultos).</p>
        </div>
        <Button className="rounded-2xl bg-green-600 hover:bg-green-700 font-bold h-12 px-8" onClick={handleExport}>
          <Download className="h-5 w-5 mr-2" /> Exportar Planilha
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DateRangeSelector dateFilter={dateFilter} setDateFilter={setDateFilter} customDateRange={customDateRange} setCustomDateRange={setCustomDateRange} calculatedDateRange={customDateRange} />
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <Input placeholder="Buscar por ID do pedido..." className="rounded-xl pl-10 h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">Pedido</TableHead>
              <TableHead className="font-bold">Faturamento (1)</TableHead>
              <TableHead className="font-bold">Custo Entrega (4)</TableHead>
              <TableHead className="font-bold">Comissão APP (5)</TableHead>
              <TableHead className="font-bold">Taxa Pagamento (6)</TableHead>
              <TableHead className="font-bold">Líquido (7)</TableHead>
              <TableHead className="text-center font-bold">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600" /></TableCell></TableRow> :
            filteredOrders.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-20 text-gray-400 font-medium">Nenhum pedido encontrado.</TableCell></TableRow> :
            filteredOrders.map(o => (
              <React.Fragment key={o.id}>
                <TableRow className={cn("hover:bg-indigo-50/30 transition-colors", expandedOrders.has(o.id) && "bg-indigo-50/20")}>
                  <TableCell>
                    <div className="font-bold text-gray-800">#{o.id.slice(0, 6)}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-black">{format(new Date(o.created_at), 'dd/MM HH:mm')}</div>
                  </TableCell>
                  <TableCell className="font-bold">R$ {o.total.toFixed(2)}</TableCell>
                  <TableCell className="text-red-500 font-medium">R$ {o.driver_fee_paid.toFixed(2)}</TableCell>
                  <TableCell className="text-red-500 font-medium">R$ {o.merchant_commission.toFixed(2)}</TableCell>
                  <TableCell className="text-red-500 font-medium">R$ {o.payment_processing_fee.toFixed(2)}</TableCell>
                  <TableCell><span className="font-black text-green-600">R$ {(o.total - o.driver_fee_paid - o.merchant_commission - o.payment_processing_fee).toFixed(2)}</span></TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        <Checkbox 
                          id={`expand-${o.id}`} 
                          checked={expandedOrders.has(o.id)} 
                          onCheckedChange={() => toggleExpand(o.id)}
                          className="h-5 w-5 rounded-md border-indigo-200 data-[state=checked]:bg-indigo-600"
                        />
                        <label htmlFor={`expand-${o.id}`} className="text-[10px] font-black text-indigo-400 uppercase cursor-pointer select-none">Ver Itens</label>
                    </div>
                  </TableCell>
                </TableRow>
                
                {expandedOrders.has(o.id) && (
                  <TableRow className="bg-indigo-50/10 animate-in fade-in slide-in-from-top-1">
                    <TableCell colSpan={7} className="p-0">
                      <div className="p-6 border-x-4 border-indigo-600 bg-white shadow-inner m-2 rounded-2xl">
                        <div className="flex items-center gap-2 mb-4 text-indigo-900 font-black text-xs uppercase tracking-widest">
                          <Package className="h-4 w-4" /> Itens do Pedido
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {o.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center font-black text-indigo-600 shadow-sm border border-indigo-50">
                                  {item.quantity}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">Preço Un: R$ {item.price.toFixed(2)}</p>
                                </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase">
                                  {o.delivery_type === 'delivery' ? 'Entrega em Domicílio' : 'Retirada no Local'}
                                </Badge>
                                <div className="flex items-center gap-1.5">
                                  <ReceiptText className="h-3 w-3 text-gray-400" />
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">{getFriendlyPaymentMethod(o.payment_method)}</span>
                                </div>
                            </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default MerchantOrderHistoryPage;