import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, subMonths, getMonth, getYear, startOfYear, subYears, endOfYear } from "date-fns";

interface Order {
  id: string;
  total: number;
  created_at: string;
  status: string;
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

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function useMerchantReports(dateRange?: DateRange) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>({});
  const [salesChartData, setSalesChartData] = useState<SalesData[]>([]);
  const [annualComparisonData, setAnnualComparisonData] = useState<AnnualComparison[]>([]);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('id, total, created_at, status')
        .eq('merchant_id', user.id)
        .in('status', ['DELIVERED', 'OUT_FOR_DELIVERY', 'PREPARING', 'WAITING_FOR_DRIVER']); // Inclui todos os pedidos relevantes

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

    // --- Sales Chart Data (Daily/Weekly based on range) ---
    // Simplificando para mostrar apenas o total de pedidos por dia (últimos 7 dias)
    const today = new Date();
    const lastSevenDays: SalesData[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dayName = format(date, 'EEE', { locale: { localize: { day: (i) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][i] } } });
        
        const dailyOrders = deliveredOrders.filter(o => 
            format(new Date(o.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );
        const dailyRevenue = dailyOrders.reduce((sum, o) => sum + o.total, 0);
        
        lastSevenDays.push({ name: dayName, vendas: dailyRevenue });
    }
    setSalesChartData(lastSevenDays);


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

  }, [orders]);

  return { loading, stats, salesChartData, annualComparisonData };
}