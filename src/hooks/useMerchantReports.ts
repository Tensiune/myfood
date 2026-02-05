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
  payment_method: string;
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
  name: string;
  currentYear: number;
  lastYear: number;
}

interface TopProduct {
  name: string;
  value: number;
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
  const [config, setConfig] = useState<any>(null);

  const fetchConfigAndOrders = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // 1. Fetch Tax Config
      const { data: feeData } = await supabase.from('app_settings').select('*').eq('key', 'platform_fees').single();
      const platformFees = feeData?.value || {
          service_fee: { fixed: 0, percent: 10 },
          payment_fees: { pix: { fixed: 0, percent: 0.99 }, card_credit_online: { fixed: 0.5, percent: 3.99 }, card_debit_online: { fixed: 0.5, percent: 2.5 } }
      };
      setConfig(platformFees);

      // 2. Fetch Orders
      let query = supabase
        .from('orders')
        .select('id, total, created_at, status, items, payment_method')
        .eq('merchant_id', user.id)
        .in('status', ['DELIVERED', 'OUT_FOR_DELIVERY', 'PREPARING', 'WAITING_FOR_DRIVER']);

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
      console.error("Error fetching merchant reports:", error);
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    fetchConfigAndOrders();
  }, [fetchConfigAndOrders]);

  useEffect(() => {
    if (orders.length === 0 || !config) {
      setStats({});
      setSalesChartData([]);
      setAnnualComparisonData([]);
      setTopProducts([]);
      return;
    }

    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
    
    // Cálculo financeiro real baseado nas taxas dinâmicas
    let totalGrossRevenue = 0;
    let totalPlatformFees = 0;
    let totalPaymentFees = 0;

    deliveredOrders.forEach(order => {
        totalGrossRevenue += order.total;
        
        // 1. Comissão da Plataforma
        const platformFee = config.service_fee.fixed + (order.total * (config.service_fee.percent / 100));
        totalPlatformFees += platformFee;

        // 2. Taxas de Processamento (apenas online)
        const payFee = config.payment_fees[order.payment_method];
        if (payFee) {
            const processingFee = payFee.fixed + (order.total * (payFee.percent / 100));
            totalPaymentFees += processingFee;
        }
    });

    const netRevenue = totalGrossRevenue - totalPlatformFees - totalPaymentFees;
    const deliveredCount = deliveredOrders.length;
    const averageTicket = deliveredCount > 0 ? totalGrossRevenue / deliveredCount : 0;

    setStats({
      totalRevenue: totalGrossRevenue.toFixed(2),
      netRevenue: netRevenue.toFixed(2),
      platformFees: totalPlatformFees.toFixed(2),
      paymentFees: totalPaymentFees.toFixed(2),
      totalOrders: orders.length,
      averageTicket: averageTicket.toFixed(2),
      newCustomers: Math.floor(deliveredCount * 0.1), 
    });

    // Chart Data logic stays the same but uses gross revenue
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); 
    const weeklySales: SalesData[] = [];
    for (let i = 0; i < 7; i++) {
        const date = subDays(startOfCurrentWeek, -i);
        const dayName = format(date, 'EEE', { locale: ptBR });
        const dailyOrders = deliveredOrders.filter(o => format(new Date(o.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
        const dailyRevenue = dailyOrders.reduce((sum, o) => sum + o.total, 0);
        weeklySales.push({ name: dayName, vendas: dailyRevenue });
    }
    setSalesChartData(weeklySales);

    // Annual Comparison
    const currentYear = getYear(new Date());
    const lastYear = currentYear - 1;
    const monthlySales = deliveredOrders.map(o => ({
        month: getMonth(new Date(o.created_at)),
        year: getYear(new Date(o.created_at)),
        sales: o.total,
    }));
    const comparisonData = MONTH_NAMES.map((name, monthIndex) => ({
        name,
        currentYear: monthlySales.filter(m => m.year === currentYear && m.month === monthIndex).reduce((sum, m) => sum + m.sales, 0),
        lastYear: monthlySales.filter(m => m.year === lastYear && m.month === monthIndex).reduce((sum, m) => sum + m.sales, 0),
    }));
    setAnnualComparisonData(comparisonData);
    
    // Top Products
    const productCounts = new Map<string, number>();
    deliveredOrders.forEach(order => {
        if (Array.isArray(order.items)) {
            order.items.forEach(item => {
                productCounts.set(item.name, (productCounts.get(item.name) || 0) + item.quantity);
            });
        }
    });
    setTopProducts(Array.from(productCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value], index) => ({
        name, value, color: COLORS[index % COLORS.length]
    })));

  }, [orders, config]);

  return { loading, stats, salesChartData, annualComparisonData, topProducts };
}