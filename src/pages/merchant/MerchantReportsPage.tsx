"use client";

import React, { useState } from "react";
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
  Pie
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Star,
  Download,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MerchantReportsPage = () => {
  // Dados Mockados
  const salesData = [
    { name: "Seg", vendas: 2400 },
    { name: "Ter", vendas: 1398 },
    { name: "Qua", vendas: 9800 },
    { name: "Qui", vendas: 3908 },
    { name: "Sex", vendas: 4800 },
    { name: "Sab", vendas: 13000 },
    { name: "Dom", vendas: 11000 },
  ];

  const topProducts = [
    { name: "Burger Gourmet", value: 400, color: "#6366f1" },
    { name: "Pizza Calabresa", value: 300, color: "#8b5cf6" },
    { name: "Batata Rústica", value: 200, color: "#a855f7" },
    { name: "Suco Natural", value: 100, color: "#d946ef" },
  ];

  const stats = [
    { label: "Faturamento Total", value: "R$ 45.600", trend: "+12.5%", isUp: true, icon: DollarSign },
    { label: "Total de Pedidos", value: "1.240", trend: "+8.2%", isUp: true, icon: ShoppingBag },
    { label: "Ticket Médio", value: "R$ 36,70", trend: "-2.1%", isUp: false, icon: TrendingUp },
    { label: "Novos Clientes", value: "145", trend: "+5.4%", isUp: true, icon: Users },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Relatórios de Desempenho</h1>
          <p className="text-gray-500">Acompanhe o crescimento da sua loja em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="7d">
            <SelectTrigger className="w-40 rounded-xl bg-white border-none shadow-sm">
              <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl bg-white border-none shadow-sm gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
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
        {/* Main Sales Chart */}
        <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold text-indigo-900">Evolução de Vendas</CardTitle>
          </CardHeader>
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
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

        {/* Top Products Chart */}
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold text-indigo-900">Produtos + Vendidos</CardTitle>
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
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-400 uppercase">Total</p>
                <p className="text-xl font-black text-indigo-900">1.0k</p>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {topProducts.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-gray-600">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-indigo-900">{item.value} un.</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Satisfaction Insights */}
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