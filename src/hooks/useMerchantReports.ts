import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { DateRange } from "react-day-picker";
import { format, getMonth, getYear, startOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const DRIVER_COST_FIXED = 5.00; // Custo padrão de entrega da rede APP

interface Order {
  id: string;
  total: number;
  created_at: string;
  status: string;
  items: any[];
  payment_method: string;
  delivery_type: string;
  logistics_mode: string;
  driver_id: string | null;
}

export function useMerchantReports(dateRange?: DateRange) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>({});
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [annualComparisonData, setAnnualComparisonData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);

  const fetchConfigAndOrders = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: feeData } = await supabase.from('app_settings').select('*').eq('key', 'platform_fees').single();
      const platformFees = feeData?.value || {
          service_fee: { fixed: 0, percent: 10 },
          payment_fees: { pix: { fixed: 0, percent: 0.99 }, card_credit_online: { fixed: 0.5, percent: 3.99 }, card_debit_online: { fixed: 0.5, percent: 2.5 } }
      };
      setConfig(platformFees);

      let query = supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', user.id)
        .eq('status', 'DELIVERED');

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

    let totalGrossRevenue = 0; // 1
    let totalProductSales = 0; // 2
    let totalDeliveryRevenue = 0; // 3
    let totalDeliveryExpenses = 0; // 4
    let totalPlatformFees = 0; // 5
    let totalPaymentFees = 0; // 6

    orders.forEach(order => {
        const deliveryFeeCustomer = order.delivery_type === 'delivery' ? 5.00 : 0; // Simulado
        const productSubtotal = order.total - deliveryFeeCustomer;

        totalGrossRevenue += order.total;
        totalProductSales += productSubtotal;
        totalDeliveryRevenue += deliveryFeeCustomer;

        // Despesa de entrega (se usou motorista do APP)
        if (order.driver_id && order.logistics_mode !== 'OWN') {
            totalDeliveryExpenses += DRIVER_COST_FIXED;
        }
        
        // Comissão APP
        const platformFee = config.service_fee.fixed + (order.total * (config.service_fee.percent / 100));
        totalPlatformFees += platformFee;

        // Taxas Pagamento
        const payFee = config.payment_fees[order.payment_method];
        if (payFee) {
            const processingFee = payFee.fixed + (order.total * (payFee.percent / 100));
            totalPaymentFees += processingFee;
        }
    });

    const netRevenue = totalGrossRevenue - totalDeliveryExpenses - totalPlatformFees - totalPaymentFees;

    setStats({
      totalRevenue: totalGrossRevenue,
      productSales: totalProductSales,
      deliveryRevenue: totalDeliveryRevenue,
      deliveryExpenses: totalDeliveryExpenses,
      platformFees: totalPlatformFees,
      paymentFees: totalPaymentFees,
      netRevenue: netRevenue,
      totalOrders: orders.length,
      averageTicket: orders.length > 0 ? totalGrossRevenue / orders.length : 0,
    });

    // Chart logic (keep standard)
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); 
    const weeklySales = [];
    for (let i = 0; i < 7; i++) {
        const date = subDays(startOfCurrentWeek, -i);
        const dayName = format(date, 'EEE', { locale: ptBR });
        const dailyRevenue = orders.filter(o => format(new Date(o.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')).reduce((sum, o) => sum + o.total, 0);
        weeklySales.push({ name: dayName, vendas: dailyRevenue });
    }
    setSalesChartData(weeklySales);

    // Top Products
    const productCounts = new Map<string, number>();
    orders.forEach(order => {
        if (Array.isArray(order.items)) {
            order.items.forEach(item => {
                productCounts.set(item.name, (productCounts.get(item.name) || 0) + item.quantity);
            });
        }
    });
    setTopProducts(Array.from(productCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value], index) => ({
        name, value, color: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#f43f5e"][index % 5]
    })));

  }, [orders, config]);

  return { loading, stats, salesChartData, annualComparisonData, topProducts };
}