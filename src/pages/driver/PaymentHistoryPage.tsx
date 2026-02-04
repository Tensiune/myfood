"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  DollarSign, 
  CreditCard, 
  Calendar, 
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"; // Importação adicionada

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  period_start: string;
  period_end: string;
}

const DRIVER_FEE_PER_ORDER = 5.00; // Must match the fee used in DeliveryHistoryPage

const PaymentHistoryPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch all delivered orders to calculate total earnings
      const { data: deliveredOrders, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('driver_id', user.id)
        .eq('status', 'DELIVERED');

      if (orderError) throw orderError;
      
      const calculatedEarnings = (deliveredOrders || []).length * DRIVER_FEE_PER_ORDER;
      setTotalEarnings(calculatedEarnings);

      // 2. Fetch payment history
      const { data: paymentData, error: paymentError } = await supabase
        .from('driver_payments')
        .select('*')
        .eq('driver_id', user.id)
        .order('payment_date', { ascending: false });

      if (paymentError) throw paymentError;
      setPayments(paymentData || []);

    } catch (err: any) {
      console.error(err);
      showError("Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const outstandingBalance = useMemo(() => {
    return Math.max(0, totalEarnings - totalPaid);
  }, [totalEarnings, totalPaid]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Carregando dados financeiros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-3xl font-black text-indigo-900">Pagamentos</h1>
      <p className="text-gray-500">Seu histórico de recebimentos e saldo pendente.</p>

      {/* Dashboard Stats */}
      <Card className={cn(
        "rounded-3xl border-none shadow-lg",
        outstandingBalance > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
      )}>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", outstandingBalance > 0 ? "bg-red-100" : "bg-green-100")}>
              {outstandingBalance > 0 ? <AlertTriangle className="h-6 w-6 text-red-600" /> : <CheckCircle2 className="h-6 w-6 text-green-600" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Saldo Pendente</p>
              <h3 className="text-2xl font-black text-indigo-900">R$ {outstandingBalance.toFixed(2)}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Ganho: R$ {totalEarnings.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Total Pago: R$ {totalPaid.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2 pt-4">
        <CreditCard className="h-5 w-5" /> Histórico de Pagamentos
      </h2>

      {payments.length === 0 ? (
        <div className="text-center py-12 bg-gray-100 rounded-3xl border-2 border-dashed border-gray-200">
          <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum pagamento registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="rounded-2xl border-none shadow-sm bg-white">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-bold text-gray-800">Pagamento Recebido</span>
                  </div>
                  <span className="font-black text-xl text-green-600">R$ {payment.amount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase">
                    Período: {format(new Date(payment.period_start), 'dd/MM')} - {format(new Date(payment.period_end), 'dd/MM')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentHistoryPage;