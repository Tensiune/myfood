import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { DateRange } from "react-day-picker";
import { format, startOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const DRIVER_COST_FIXED = 5.00;

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
      setTopProducts([]);
      return;
    }

    let totalGrossRevenue = 0; 
    let totalOnlineRevenue = 0;
    let totalOfflineRevenue = 0;
    let totalProductSales = 0;
    let totalDeliveryRevenue = 0; 
    let totalDeliveryExpenses = 0;
    let totalPlatformFees = 0;
    let totalPaymentFees = 0;

    orders.forEach(order => {
        const deliveryFeeCustomer = order.delivery_type === 'delivery' ? 5.00 : 0;
        const productSubtotal = order.total - deliveryFeeCustomer;
        const isOffline = ['cash_delivery', 'card_credit_delivery', 'card_debit_delivery', 'meal_voucher_delivery'].includes(order.payment_method);

        totalGrossRevenue += order.total;
        totalProductSales += productSubtotal;
        totalDeliveryRevenue += deliveryFeeCustomer;

        if (isOffline) {
            totalOfflineRevenue += order.total;
        } else {
            totalOnlineRevenue += order.total;
        }

        // Custo entrega
        if (order.driver_id && order.logistics_mode !== 'OWN') {
            totalDeliveryExpenses += DRIVER_COST_FIXED;
        }
        
        // Comissão APP (Calculada sobre ONLINE e OFFLINE)
        const platformFee = config.service_fee.fixed + (order.total * (config.service_fee.percent / 100));
        totalPlatformFees += platformFee;

        // Taxas Pagamento (Apenas se for ONLINE)
        if (!isOffline) {
            const payFee = config.payment_fees[order.payment_method];
            if (payFee) {
                totalPaymentFees += (payFee.fixed + (order.total * (payFee.percent / 100)));
            }
        }
    });

    // O LÍQUIDO É: (Vendas Online - Taxas Online) - (Comissão sobre Vendas Offline) - (Custos Motorista App)
    // O lojista já ficou com 100% do totalOfflineRevenue.
    const netToReceive = (totalOnlineRevenue - totalPaymentFees) - totalPlatformFees - totalDeliveryExpenses;

    setStats({
      totalRevenue: totalGrossRevenue,
      onlineRevenue: totalOnlineRevenue,
      offlineRevenue: totalOfflineRevenue,
      productSales: totalProductSales,
      deliveryRevenue: totalDeliveryRevenue,
      deliveryExpenses: totalDeliveryExpenses,
      platformFees: totalPlatformFees,
      paymentFees: totalPaymentFees,
      netRevenue: netToReceive,
      totalOrders: orders.length,
    });

    // Gráfico
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

  return { loading, stats, salesChartData, topProducts };
}