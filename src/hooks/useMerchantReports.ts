import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { DateRange } from "react-day-picker";
import { format, getMonth, getYear, startOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  total: number;
  created_at: string;
  status: string;
  items: any[];
}

interface SalesData {
  name: string;
  vendas: number;
}

interface MonthlySales {
  month: number;
  year: number;
  sales: number;
}

interface AnnualComparison {
  name: string; // Mês
  currentYear: number;
  lastYear: number;
}

interface TopProduct {
  name: string;
  value: number; // Quantidade vendida
  color: string;
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16"];

export function useMerchantReports(dateRange?: DateRange) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>({});
  const [salesChartData, setSalesChartData] = useState<SalesData[]>([]);
  const [annualComparisonData, setAnnualComparisonData] = useState<AnnualComparison[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('id, total, created_at, status, items') // Incluindo 'items' para o relatório de produtos
        .eq('merchant_id', user.id)
        .in('status', ['DELIVERED', 'OUT_FOR_DELIVERY', 'PREPARING', 'WAITING_FOR_DRIVER']);

      // Filtro de data
      if (dateRange?.from) {
        query = query.gte('created_at', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setDate(endOfDay.getDate() + 1);
        query = query.lt('created_at', format(endOfDay, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching merchant orders for reports:", error);
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (orders.length === 0) {
      setStats({});
      setSalesChartData([]);
      setAnnualComparisonData([]);
      setTopProducts([]);
      return;
    }

    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const deliveredCount = deliveredOrders.length;
    const averageTicket = deliveredCount > 0 ? totalRevenue / deliveredCount : 0;

    // Mock de novos clientes (precisaria de lógica de DB mais complexa, mantendo simples)
    const newCustomers = Math.floor(deliveredCount * 0.1); 

    setStats({
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders: totalOrders,
      averageTicket: averageTicket.toFixed(2),
      newCustomers: newCustomers,
    });

    // --- Sales Chart Data (Weekly: Monday to Sunday) ---
    const today = new Date();
    // Encontra o início da semana (Segunda-feira)
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); 
    const weeklySales: SalesData[] = [];
    
    // Itera 7 dias a partir da Segunda-feira
    for (let i = 0; i < 7; i++) {
        const date = subDays(startOfCurrentWeek, -i);
        // Formata o nome do dia (ex: Seg, Ter, etc.)
        const dayName = format(date, 'EEE', { locale: ptBR });
        
        const dailyOrders = deliveredOrders.filter(o => 
            format(new Date(o.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );
        const dailyRevenue = dailyOrders.reduce((sum, o) => sum + o.total, 0);
        
        weeklySales.push({ name: dayName, vendas: dailyRevenue });
    }
    setSalesChartData(weeklySales);


    // --- Annual Comparison Data (Monthly) ---
    const currentYear = getYear(new Date());
    const lastYear = currentYear - 1;
    
    const monthlySales: MonthlySales[] = deliveredOrders.map(o => ({
        month: getMonth(new Date(o.created_at)),
        year: getYear(new Date(o.created_at)),
        sales: o.total,
    }));

    const comparisonData: AnnualComparison[] = MONTH_NAMES.map((name, monthIndex) => {
        const currentYearSales = monthlySales
            .filter(m => m.year === currentYear && m.month === monthIndex)
            .reduce((sum, m) => sum + m.sales, 0);
            
        const lastYearSales = monthlySales
            .filter(m => m.year === lastYear && m.month === monthIndex)
            .reduce((sum, m) => sum + m.sales, 0);

        return {
            name,
            currentYear: currentYearSales,
            lastYear: lastYearSales,
        };
    });
    
    setAnnualComparisonData(comparisonData);
    
    // --- Top Products Data (Top 10) ---
    const productCounts = new Map<string, number>();
    deliveredOrders.forEach(order => {
        // Garantir que 'items' é um array e iterar sobre ele
        if (Array.isArray(order.items)) {
            order.items.forEach(item => {
                const name = item.name;
                const quantity = item.quantity;
                productCounts.set(name, (productCounts.get(name) || 0) + quantity);
            });
        }
    });
    
    const sortedProducts = Array.from(productCounts.entries())
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 10)
        .map(([name, value], index) => ({
            name,
            value,
            color: COLORS[index % COLORS.length]
        }));
        
    setTopProducts(sortedProducts);

  }, [orders]);

  return { loading, stats, salesChartData, annualComparisonData, topProducts };
}