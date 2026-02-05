"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, DollarSign, Percent, Zap, CreditCard, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";

const AdminFeesPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fees, setFees] = useState({
    service_fee: { fixed: 0, percent: 0 },
    payment_fees: {
      pix: { fixed: 0, percent: 0 },
      card_credit_online: { fixed: 0, percent: 0 },
      card_debit_online: { fixed: 0, percent: 0 }
    }
  });

  useEffect(() => {
    const fetchFees = async () => {
      setLoading(true);
      const { data } = await supabase.from('app_settings').select('*').eq('key', 'platform_fees').single();
      if (data) {
        setFees(data.value);
      }
      setLoading(false);
    };
    fetchFees();
  }, []);

  const handleUpdateServiceFee = (field: 'fixed' | 'percent', value: string) => {
    setFees(prev => ({
      ...prev,
      service_fee: { ...prev.service_fee, [field]: parseFloat(value) || 0 }
    }));
  };

  const handleUpdatePaymentFee = (method: string, field: 'fixed' | 'percent', value: string) => {
    setFees(prev => ({
      ...prev,
      payment_fees: {
        ...prev.payment_fees,
        [method]: { ...prev.payment_fees[method as keyof typeof prev.payment_fees], [field]: parseFloat(value) || 0 }
      }
    }));
  };

  const saveFees = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert({
        key: 'platform_fees',
        value: fees,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      showSuccess("Taxas atualizadas com sucesso!");
    } catch (err: any) {
      showError("Erro ao salvar taxas: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Gestão de Taxas</h1>
          <p className="text-gray-500">Configure as comissões e taxas de processamento.</p>
        </div>
        <Button onClick={saveFees} disabled={saving} className="bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl h-12 px-8 shadow-lg gap-2">
          {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
          Salvar Configurações
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 rounded-[2.5rem] border-none shadow-sm bg-indigo-900 text-white p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl">
                <Zap className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold">Comissão da Plataforma</h3>
            </div>
            <p className="text-sm text-indigo-200">
              Cobrada sobre o valor total do pedido (Produtos + Taxa de Entrega).
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-indigo-300">Valor Fixo (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={fees.service_fee.fixed} 
                  onChange={(e) => handleUpdateServiceFee('fixed', e.target.value)}
                  className="bg-white/10 border-white/20 text-white text-xl font-black h-12 rounded-xl focus:ring-brand-accent"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-indigo-300">Porcentagem (%)</Label>
                <div className="relative">
                    <Input 
                        type="number" 
                        step="0.1"
                        value={fees.service_fee.percent} 
                        onChange={(e) => handleUpdateServiceFee('percent', e.target.value)}
                        className="bg-white/10 border-white/20 text-white text-xl font-black h-12 rounded-xl focus:ring-brand-accent pr-10"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-300" />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="md:col-span-2">
          <Tabs defaultValue="pix" className="w-full">
            <TabsList className="bg-white p-1 rounded-2xl shadow-sm mb-6 border border-gray-100 h-auto w-full flex">
              <TabsTrigger value="pix" className="flex-1 rounded-xl py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Wallet className="h-4 w-4 mr-2" /> PIX
              </TabsTrigger>
              <TabsTrigger value="credit" className="flex-1 rounded-xl py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <CreditCard className="h-4 w-4 mr-2" /> CRÉDITO
              </TabsTrigger>
              <TabsTrigger value="debit" className="flex-1 rounded-xl py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <CreditCard className="h-4 w-4 mr-2" /> DÉBITO
              </TabsTrigger>
            </TabsList>

            {[
              { id: 'pix', key: 'pix', label: 'PIX Online', icon: Wallet },
              { id: 'credit', key: 'card_credit_online', label: 'Crédito Online', icon: CreditCard },
              { id: 'debit', key: 'card_debit_online', label: 'Débito Online', icon: CreditCard }
            ].map((method) => (
              <TabsContent key={method.id} value={method.id}>
                <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white p-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <method.icon className="h-6 w-6 text-indigo-600" />
                        <h3 className="text-xl font-black text-indigo-900">{method.label}</h3>
                    </div>
                    <p className="text-sm text-gray-500">Taxas cobradas pela operadora de pagamentos sobre o valor transacionado.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custo Fixo por Transação</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">R$</span>
                                <Input 
                                    type="number" 
                                    step="0.01"
                                    value={fees.payment_fees[method.key as keyof typeof fees.payment_fees].fixed} 
                                    onChange={(e) => handleUpdatePaymentFee(method.key, 'fixed', e.target.value)}
                                    className="pl-10 rounded-xl h-12 border-gray-100 font-bold"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custo Percentual</Label>
                            <div className="relative">
                                <Input 
                                    type="number" 
                                    step="0.01"
                                    value={fees.payment_fees[method.key as keyof typeof fees.payment_fees].percent} 
                                    onChange={(e) => handleUpdatePaymentFee(method.key, 'percent', e.target.value)}
                                    className="rounded-xl h-12 border-gray-100 font-bold pr-10"
                                />
                                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                            </div>
                        </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminFeesPage;