"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Star,
  Download,
  Calendar,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMerchantReports } from "@/hooks/useMerchantReports";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";

const MerchantReportsPage = () => {
  const [dateFilter, setDateFilter] = useState("7d");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  const calculatedDateRange = useMemo(() => {
    const today = startOfDay(new Date());
    switch (dateFilter) {
      case "24h":
        return { from: subDays(today, 1), to: today };
      case "7d":
        return { from: subDays(today, 7), to: today };
      case "30d":
        return { from: subMonths(today, 1), to: today };
      case "90d":
        return { from: subMonths(today, 3), to: today };
      case "other":
        return customDateRange;
      default:
        return { from: subDays(today, 7), to: today };
    }
  }, [dateFilter, customDateRange]);

  const { loading, stats, salesChartData, annualComparisonData, topProducts } = useMerchantReports(calculatedDateRange);

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const statCards = [
    { label: "Faturamento Total", value: `R$ ${stats.totalRevenue || '0.00'}`, trend: "+12.5%", isUp: true, icon: DollarSign },
    { label: "Total de Pedidos", value: `${stats.totalOrders || 0}`, trend: "+8.2%", isUp: true, icon: ShoppingBag },
    { label: "Ticket Médio", value: `R$ ${stats.averageTicket || '0.00'}`, trend: "-2.1%", isUp: false, icon: TrendingUp },
    { label: "Novos Clientes", value: `${stats.newCustomers || 0}`, trend: "+5.4%", isUp: true, icon: Users },
  ];

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    if (value !== 'other') {
      setCustomDateRange(undefined);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Relatórios de Desempenho</h1>
          <p className="text-gray-500">Acompanhe o crescimento da sua loja em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={handleDateFilterChange}>
            <SelectTrigger className="w-40 rounded-xl bg-white border-none shadow-sm">
              <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="other">Outro Período...</SelectItem>
            </SelectItemContent>
          </Select>
          
          {dateFilter === 'other' && (
            <DateRangePicker date={customDateRange} setDate={setCustomDateRange} className="w-full md:w-auto" />
          )}

          <Button variant="outline" className="rounded-xl bg-white border-none shadow-sm gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <stat.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className={`flex items-center text-xs font-bold ${stat.isUp ? 'text-green-600' : 'text-red-500'}`}>
                  {stat.trend}
                  {stat.isUp ? <TrendingUp className="h-3 w-3 ml-1" /> : <TrendingDown className="h-3 w-3 ml-1" />}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <h3 className="text-2xl font-black text-indigo-900 mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Sales Chart (Daily/Weekly) */}
        <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold text-indigo-900">Evolução de Vendas (Período Selecionado)</CardTitle>
          </CardHeader>
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  formatter={(value) => [`R$ ${parseFloat(value.toString()).toFixed(2)}`, 'Vendas']}
                />
                <Bar 
                  dataKey="vendas" 
                  fill="#6366f1" 
                  radius={[8, 8, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Products Chart (Real Data) */}
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold text-indigo-900">Top 10 Produtos Vendidos</CardTitle>
          </CardHeader>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                    formatter={(value, name, props) => [`${value} un.`, props.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-400 uppercase">Total</p>
                <p className="text-xl font-black text-indigo-900">{topProducts.reduce((sum, p) => sum + p.value, 0)}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3 max-h-40 overflow-y-auto pr-2">
            {topProducts.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-gray-600 truncate">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-indigo-900 shrink-0">{item.value} un.</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      {/* Annual Comparison Chart */}
      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold text-indigo-900">Comparação Anual de Vendas</CardTitle>
            <p className="text-gray-500 text-sm">Vendas Mês a Mês ({currentYear} vs {lastYear})</p>
          </CardHeader>
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualComparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  formatter={(value, name) => [`R$ ${parseFloat(value.toString()).toFixed(2)}`, name === 'currentYear' ? `Vendas ${currentYear}` : `Vendas ${lastYear}`]}
                />
                <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => value === 'currentYear' ? `Vendas ${currentYear}` : `Vendas ${lastYear}`}
                />
                <Bar 
                  dataKey="currentYear" 
                  name={`Vendas ${currentYear}`}
                  fill="#10b981" // Verde
                  radius={[8, 8, 0, 0]} 
                  barSize={20}
                />
                <Bar 
                  dataKey="lastYear" 
                  name={`Vendas ${lastYear}`}
                  fill="#3b82f6" // Azul
                  radius={[8, 8, 0, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>


      {/* Satisfaction Insights (Mocked) */}
      <Card className="rounded-[2.5rem] border-none shadow-sm bg-indigo-900 text-white p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold mb-2">Nível de Satisfação</h2>
            <p className="text-indigo-200">Sua loja está no topo! 98% dos clientes recomendariam você para amigos.</p>
            <div className="flex items-center gap-2 mt-6 justify-center md:justify-start">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className="h-8 w-8 text-yellow-400 fill-yellow-400" />
              ))}
              <span className="text-2xl font-black ml-2">4.9/5.0</span>
            </div>
          </div>
          <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md">
            <h4 className="font-bold mb-4">Melhores Comentários</h4>
            <div className="space-y-4">
              <p className="text-sm italic">"Melhor hambúrguer da cidade, entrega super rápida!"</p>
              <div className="h-px bg-white/20 w-full" />
              <p className="text-sm italic">"A comida chegou quentinha e muito bem embalada."</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MerchantReportsPage;