"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  MapPin, 
  MoreVertical, 
  Eye, 
  Power, 
  PowerOff,
  ArrowUpDown,
  Loader2,
  Filter,
  Download,
  Bike,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/utils/toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/utils/export";

const DRIVER_FEE_PER_ORDER = 5.00;

const DriverManagementPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Ordenação
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar entregadores (Principal)
      const { data: driverData, error: dError } = await supabase
        .from('driver_applications')
        .select('*');
      
      if (dError) throw dError;
      setDrivers(driverData || []);

      // 2. Buscar pedidos e pagamentos (Opcionais para as estatísticas)
      // Usamos Promise.allSettled para que se um falhar por RLS, o outro ainda carregue
      const [ordersRes, paymentsRes] = await Promise.allSettled([
        supabase.from('orders').select('id, total, status, driver_id, logistics_mode'),
        supabase.from('driver_payments').select('driver_id, amount')
      ]);

      if (ordersRes.status === 'fulfilled' && !ordersRes.value.error) {
        setOrders(ordersRes.value.data || []);
      }
      
      if (paymentsRes.status === 'fulfilled' && !paymentsRes.value.error) {
        setPayments(paymentsRes.value.data || []);
      }

    } catch (err: any) {
      console.error("[Admin] Fetch Error:", err);
      setError(err.message || "Erro ao conectar com o servidor.");
      showError("Erro ao carregar lista de entregadores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateDriverStats = (driverId: string) => {
    const driverOrders = orders.filter(o => o.driver_id === driverId);
    const completed = driverOrders.filter(o => o.status === 'DELIVERED');
    const cancelled = driverOrders.filter(o => o.status === 'CANCELLED');
    
    const totalSales = completed.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const appDeliveries = completed.filter(o => o.logistics_mode !== 'OWN');
    const totalEarned = appDeliveries.length * DRIVER_FEE_PER_ORDER;
    const totalPaid = payments.filter(p => p.driver_id === driverId).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    return { 
        totalSales, 
        completedCount: completed.length, 
        cancelledCount: cancelled.length, 
        balance: Math.max(0, totalEarned - totalPaid) 
    };
  };

  const tableData = useMemo(() => {
    return drivers.map(driver => {
        const stats = calculateDriverStats(driver.id);
        const addr = driver.metadata?.address || {};
        const fullAddr = `${addr.street || ''}, ${addr.city || ''}`.toLowerCase();
        
        return {
            ...driver,
            name: driver.full_name || "Sem Nome",
            fullAddress: fullAddr,
            ...stats
        };
    }).filter(d => {
        const matchName = d.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchAddr = d.fullAddress.includes(addressFilter.toLowerCase());
        const matchStatus = statusFilter === 'all' || d.status === statusFilter;
        return matchName && matchAddr && matchStatus;
    });
  }, [drivers, orders, payments, searchTerm, addressFilter, statusFilter]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return tableData;
    
    return [...tableData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tableData, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleToggleStatus = async (driverId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'APPROVED' ? 'DISABLED' : 'APPROVED';
    try {
        const { error } = await supabase.from('driver_applications').update({ status: newStatus }).eq('id', driverId);
        if (error) throw error;
        
        setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status: newStatus } : d));
        showSuccess(`Entregador ${newStatus === 'APPROVED' ? 'ativado' : 'desativado'}!`);
    } catch (e) {
        showError("Erro ao alterar status.");
    }
  };

  const handleExport = () => {
    const exportData = sortedData.map(d => ({
        "Nome": d.name,
        "E-mail": d.email,
        "Status": d.status,
        "Cadastro": format(new Date(d.created_at), 'dd/MM/yyyy'),
        "Total Vendas (Pedidos)": d.totalSales.toFixed(2),
        "Entregas Concluídas": d.completedCount,
        "Entregas Canceladas": d.cancelledCount,
        "Saldo a Receber": d.balance.toFixed(2),
        "Endereço": d.metadata?.address?.street || 'N/A'
    }));
    exportToExcel(exportData, `Relatorio_Entregadores_${format(new Date(), 'dd_MM_yyyy')}`);
  };

  if (loading) {
      return <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          <p className="text-gray-400 font-bold">Carregando entregadores...</p>
      </div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Gestão de Entregadores</h1>
          <p className="text-gray-500">Monitoramento de performance e saldos da rede.</p>
        </div>
        <div className="flex gap-2">
            <Button className="rounded-2xl bg-green-600 hover:bg-green-700 font-bold h-12" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" /> Exportar Planilha
            </Button>
            <Badge className="bg-brand-accent px-4 py-1.5 rounded-full text-sm">{tableData.length} Filtrados</Badge>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">Erro ao carregar dados: {error}</p>
            <Button variant="outline" size="sm" className="ml-auto rounded-xl" onClick={fetchData}>Tentar Novamente</Button>
        </div>
      )}

      {/* Toolbar de Filtros */}
      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <Input 
                placeholder="Nome do entregador..." 
                className="pl-10 rounded-xl h-12" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <Input 
                placeholder="Filtrar por endereço..." 
                className="pl-10 rounded-xl h-12" 
                value={addressFilter}
                onChange={(e) => setAddressFilter(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-indigo-400 shrink-0" />
                <select 
                    className="w-full h-12 rounded-xl border border-gray-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">Todos os Status</option>
                    <option value="APPROVED">Ativos (Aprovados)</option>
                    <option value="DISABLED">Desativados</option>
                    <option value="PENDING">Pendentes</option>
                    <option value="REJECTED">Rejeitados</option>
                </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-2">Nome <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('totalSales')}>
                <div className="flex items-center gap-2">Total Vendas <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('completedCount')}>
                <div className="flex items-center gap-2">Concluídos <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('cancelledCount')}>
                <div className="flex items-center gap-2">Cancelados <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors font-black text-indigo-900" onClick={() => requestSort('balance')}>
                <div className="flex items-center gap-2">Saldo a Receber <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20 text-gray-400 font-medium">Nenhum entregador encontrado.</TableCell></TableRow>
            ) : sortedData.map(d => (
              <TableRow key={d.id} className="hover:bg-indigo-50/20 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-2 w-2 rounded-full", d.status === 'APPROVED' ? "bg-green-500" : "bg-red-500")} />
                    <div>
                        <div className="font-bold text-gray-800">{d.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-black">{d.metadata?.vehicle?.type || "Veículo N/A"}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-gray-600">R$ {d.totalSales.toFixed(2)}</TableCell>
                <TableCell className="font-bold text-green-600">{d.completedCount}</TableCell>
                <TableCell className="font-bold text-red-500">{d.cancelledCount}</TableCell>
                <TableCell className="font-black text-indigo-900">R$ {d.balance.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-indigo-50 text-indigo-400">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 shadow-xl border-none">
                        <DropdownMenuLabel className="text-xs uppercase font-black text-gray-400 px-3">Controle</DropdownMenuLabel>
                        <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer font-bold" onClick={() => navigate(`/admin/drivers/${d.id}`)}>
                          <Eye className="h-4 w-4 text-indigo-600" /> Ver Cadastro
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className={cn("rounded-lg gap-2 cursor-pointer font-bold", d.status === 'APPROVED' ? "text-red-500" : "text-green-600")}
                            onClick={() => handleToggleStatus(d.id, d.status)}
                        >
                          {d.status === 'APPROVED' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          {d.status === 'APPROVED' ? "Desativar Entregador" : "Ativar Entregador"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default DriverManagementPage;