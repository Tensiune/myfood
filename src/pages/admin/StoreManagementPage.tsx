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
  Calendar as CalendarIcon,
  Store
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/utils/toast";
import { format, startOfDay, subDays } from "date-fns";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

const DRIVER_COST = 5.00;

const StoreManagementPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [feeConfig, setFeeConfig] = useState<any>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ 
    from: subDays(startOfDay(new Date()), 30), 
    to: startOfDay(new Date()) 
  });

  // Ordenação
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Config de Taxas
        const { data: fees } = await supabase.from('app_settings').select('*').eq('key', 'platform_fees').single();
        setFeeConfig(fees?.value);

        // 2. Lojistas
        const { data: merchants, error: mError } = await supabase.from('merchant_applications').select('*');
        if (mError) throw mError;
        setStores(merchants || []);

        // 3. Pedidos no período para calcular stats
        let query = supabase.from('orders').select('*');
        if (dateRange?.from) query = query.gte('created_at', format(dateRange.from, 'yyyy-MM-dd'));
        if (dateRange?.to) {
          const end = new Date(dateRange.to);
          end.setDate(end.getDate() + 1);
          query = query.lt('created_at', format(end, 'yyyy-MM-dd'));
        }
        
        const { data: orderData, error: oError } = await query;
        if (oError) throw oError;
        setOrders(orderData || []);

      } catch (err: any) {
        showError("Erro ao carregar dados: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  const calculateStoreStats = (merchantId: string) => {
    const storeOrders = orders.filter(o => o.merchant_id === merchantId);
    const completed = storeOrders.filter(o => o.status === 'DELIVERED');
    const cancelled = storeOrders.filter(o => o.status === 'CANCELLED');
    
    let totalSales = 0;
    let netBalance = 0;

    completed.forEach(order => {
        totalSales += order.total;
        
        // Lógica de saldo (Líquido para o lojista)
        const platformFee = (feeConfig?.service_fee?.fixed || 0) + (order.total * (feeConfig?.service_fee?.percent || 10) / 100);
        const payFee = feeConfig?.payment_fees?.[order.payment_method] || { fixed: 0, percent: 0 };
        const processingFee = payFee.fixed + (order.total * (payFee.percent / 100));
        const driverExpense = (order.driver_id && order.logistics_mode !== 'OWN') ? DRIVER_COST : 0;
        
        netBalance += (order.total - platformFee - processingFee - driverExpense);
    });

    return { totalSales, completedCount: completed.length, cancelledCount: cancelled.length, netBalance };
  };

  const tableData = useMemo(() => {
    return stores.map(store => {
        const stats = calculateStoreStats(store.id);
        const addr = store.metadata?.store_details?.address || store.metadata?.address || {};
        const fullAddr = `${addr.street || ''}, ${addr.number || ''}, ${addr.city || ''}`.toLowerCase();
        
        return {
            ...store,
            name: store.store_name || "Sem Nome",
            fullAddress: fullAddr,
            ...stats
        };
    }).filter(s => {
        const matchName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchAddr = s.fullAddress.includes(addressFilter.toLowerCase());
        const matchStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchName && matchAddr && matchStatus;
    });
  }, [stores, orders, searchTerm, addressFilter, statusFilter, feeConfig]);

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

  const handleToggleStore = async (storeId: string, currentStatus: boolean) => {
    try {
        const { error } = await supabase.from('merchant_applications').update({ is_open: !currentStatus }).eq('id', storeId);
        if (error) throw error;
        setStores(prev => prev.map(s => s.id === storeId ? { ...s, is_open: !currentStatus } : s));
        showSuccess(`Loja ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (e) {
        showError("Não foi possível alterar o status da loja.");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Gestão de Lojas</h1>
          <p className="text-gray-500">Monitoramento e controle administrativo de parceiros.</p>
        </div>
        <Badge className="bg-brand-accent px-4 py-1.5 rounded-full text-sm">{tableData.length} Lojas filtradas</Badge>
      </div>

      {/* Toolbar de Filtros */}
      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <Input 
                placeholder="Nome da loja..." 
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
                    <option value="APPROVED">Aprovadas</option>
                    <option value="PENDING">Pendentes</option>
                    <option value="REJECTED">Rejeitadas</option>
                </select>
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} className="h-12" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-2">Loja <ArrowUpDown className="h-3 w-3" /></div>
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
              <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors font-black text-indigo-900" onClick={() => requestSort('netBalance')}>
                <div className="flex items-center gap-2">Saldo a Receber <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600" /></TableCell></TableRow>
            ) : sortedData.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20 text-gray-400 font-medium">Nenhuma loja encontrada.</TableCell></TableRow>
            ) : sortedData.map(s => (
              <TableRow key={s.id} className="hover:bg-indigo-50/20 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-2 w-2 rounded-full", s.is_open ? "bg-green-500" : "bg-red-500")} />
                    <div>
                        <div className="font-bold text-gray-800">{s.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-black">{s.metadata?.category || "Restaurante"}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-gray-600">R$ {s.totalSales.toFixed(2)}</TableCell>
                <TableCell className="font-bold text-green-600">{s.completedCount}</TableCell>
                <TableCell className="font-bold text-red-500">{s.cancelledCount}</TableCell>
                <TableCell className="font-black text-indigo-900">R$ {s.netBalance.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-indigo-50 text-indigo-400">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 shadow-xl border-none">
                        <DropdownMenuLabel className="text-xs uppercase font-black text-gray-400 px-3">Controle</DropdownMenuLabel>
                        <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer font-bold" onClick={() => navigate(`/admin/stores/${s.id}`)}>
                          <Eye className="h-4 w-4 text-indigo-600" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className={cn("rounded-lg gap-2 cursor-pointer font-bold", s.is_open ? "text-red-500" : "text-green-600")}
                            onClick={() => handleToggleStore(s.id, s.is_open)}
                        >
                          {s.is_open ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          {s.is_open ? "Desativar Loja" : "Ativar Loja"}
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

export default StoreManagementPage;