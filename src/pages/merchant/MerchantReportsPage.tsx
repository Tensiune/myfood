"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
} from "recharts";
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Calendar,
  Loader2,
  Download,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMerchantReports } from "@/hooks/useMerchantReports";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { subDays, subMonths, startOfDay, format } from "date-fns";
import { exportToExcel } from "@/utils/export";
import { showSuccess } from "@/utils/toast";

const MerchantReportsPage = () => {
  const [dateFilter, setDateFilter] = useState("7d");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  const calculatedDateRange = useMemo(() => {
    const today = startOfDay(new Date());
    switch (dateFilter) {
      case "24h": return { from: subDays(today, 1), to: today };
      case "7d": return { from: subDays(today, 7), to: today };
      case "30d": return { from: subMonths(today, 1), to: today };
      case "other": return customDateRange;
      default: return { from: subDays(today, 7), to: today };
    }
  }, [dateFilter, customDateRange]);

  const { loading, stats, salesChartData, topProducts } = useMerchantReports(calculatedDateRange);

  const handleExport = () => {
    const exportData = [
      { "Métrica": "1. Faturamento Total", "Valor (R$)": stats.totalRevenue || 0 },
      { "Métrica": "2. Venda de Produtos", "Valor (R$)": stats.productSales || 0 },
      { "Métrica": "3. Receita com Taxa de Entrega", "Valor (R$)": stats.deliveryRevenue || 0 },
      { "Métrica": "4. Despesas com Taxa de Entrega", "Valor (R$)": stats.deliveryExpenses || 0 },
      { "Métrica": "5. Comissão do APP", "Valor (R$)": stats.platformFees || 0 },
      { "Métrica": "6. Taxa de Processamento de Pagamento", "Valor (R$)": stats.paymentFees || 0 },
      { "Métrica": "7. Ganhos Líquidos", "Valor (R$)": stats.netRevenue || 0 },
    ];
    exportToExcel(exportData, `Relatorio_Financeiro_${format(new Date(), 'dd_MM_yyyy')}`);
    showSuccess("Exportado com sucesso!");
  };

  if (loading) {
    return <div className="flex flex-col items-center justify-center py-20"><Loader2 className="h-10 w-10 text-indigo-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Relatórios Financeiros</h1>
          <p className="text-gray-500">Resumo detalhado dos pedidos entregues.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40 rounded-xl bg-white shadow-sm border-none">
              <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="other">Outro Período...</SelectItem>
            </SelectContent>
          </Select>
          {dateFilter === 'other' && <DateRangePicker date={customDateRange} setDate={setCustomDateRange} />}
          <Button className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
        </div>
      </div>

      {/* Tabela de Resumo Financeiro Solicita pelo Usuário */}
      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-8 bg-indigo-900 text-white">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5" /> Resumo Financeiro Detalhado
            </CardTitle>
            <p className="text-indigo-200 text-sm">Baseado em {stats.totalOrders} pedidos entregues no período.</p>
        </CardHeader>
        <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
                <div className="p-6 flex justify-between items-center bg-indigo-50/30">
                    <span className="font-bold text-gray-700">1. Faturamento Total (Vendas + Entregas)</span>
                    <span className="text-xl font-black text-indigo-900">R$ {stats.totalRevenue?.toFixed(2)}</span>
                </div>
                <div className="p-4 px-8 flex justify-between items-center">
                    <span className="text-sm text-gray-600">2. Faturamento com Venda de Produtos</span>
                    <span className="font-bold text-gray-800">R$ {stats.productSales?.toFixed(2)}</span>
                </div>
                <div className="p-4 px-8 flex justify-between items-center">
                    <span className="text-sm text-gray-600">3. Faturamento com Taxa de Entrega</span>
                    <span className="font-bold text-gray-800">R$ {stats.deliveryRevenue?.toFixed(2)}</span>
                </div>
                <div className="p-4 px-8 flex justify-between items-center text-red-500">
                    <span className="text-sm font-medium">4. Despesas com Taxa de Entrega (Motorista)</span>
                    <span className="font-bold">- R$ {stats.deliveryExpenses?.toFixed(2)}</span>
                </div>
                <div className="p-4 px-8 flex justify-between items-center text-red-500">
                    <span className="text-sm font-medium">5. Despesas com Comissão do APP</span>
                    <span className="font-bold">- R$ {stats.platformFees?.toFixed(2)}</span>
                </div>
                <div className="p-4 px-8 flex justify-between items-center text-red-500">
                    <span className="text-sm font-medium">6. Despesas com Taxa de Processamento</span>
                    <span className="font-bold">- R$ {stats.paymentFees?.toFixed(2)}</span>
                </div>
                <div className="p-6 flex justify-between items-center bg-green-50 border-t-2 border-green-100">
                    <span className="font-black text-green-800 uppercase tracking-wider">7. Líquido Final</span>
                    <span className="text-2xl font-black text-green-600">R$ {stats.netRevenue?.toFixed(2)}</span>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-white p-6">
            <CardTitle className="text-lg font-bold mb-6">Volume de Vendas</CardTitle>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="vendas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6">
            <CardTitle className="text-lg font-bold mb-6">Top Produtos</CardTitle>
            <div className="space-y-4">
                {topProducts.map((p, i) => (
                    <div key={i} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 truncate flex-1">{p.name}</span>
                        <span className="font-bold text-indigo-900 ml-4">{p.value} un.</span>
                    </div>
                ))}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default MerchantReportsPage;