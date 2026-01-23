"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Users, 
  Store, 
  TrendingUp, 
  AlertCircle,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Dados Mockados para o Dashboard
  const stats = [
    { label: "Lojistas Ativos", value: "42", icon: Store, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Usuários Totais", value: "1.280", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Pedidos Hoje", value: "156", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Painel Administrativo</h1>
        <p className="text-gray-500">Visão geral e controle da plataforma.</p>
      </div>

      {/* Alerta de Pendências Prioritárias */}
      <Card className="rounded-[2.5rem] border-none shadow-xl bg-brand-accent text-white overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform">
          <ShieldCheck size={200} />
        </div>
        <CardContent className="p-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <AlertCircle className="h-5 w-5 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">Atenção Necessária</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black">Existem novos lojistas aguardando aprovação!</h2>
            <p className="text-white/80 max-w-md">Valide os documentos e a localização dos novos parceiros para expandir a rede.</p>
          </div>
          <Button 
            className="bg-white text-brand-accent hover:bg-indigo-50 font-black rounded-2xl h-16 px-8 text-lg shadow-2xl"
            onClick={() => navigate("/admin/merchants")}
          >
            Validar Agora <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-4 ${stat.bg} rounded-2xl`}>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black text-indigo-900">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8">
            <h4 className="font-bold text-indigo-900 mb-6 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" /> Atividades Recentes
            </h4>
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                            <p className="text-sm text-gray-700">Novo lojista aprovado: <span className="font-bold">Pizzaria Delícia</span></p>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">Há 2h</span>
                    </div>
                ))}
            </div>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-sm bg-indigo-900 text-white p-8 flex flex-col justify-center items-center text-center">
            <Users className="h-12 w-12 mb-4 text-indigo-300" />
            <h4 className="text-xl font-bold mb-2">Gestão de Usuários</h4>
            <p className="text-indigo-200 text-sm mb-6">Controle níveis de acesso e suporte técnico.</p>
            <Button variant="outline" className="rounded-xl border-indigo-700 text-white hover:bg-white/10" onClick={() => navigate("/admin/users")}>
                Gerenciar Contas
            </Button>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;