"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Wallet, 
  Truck, 
  Smartphone, 
  Banknote,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Save,
  Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { GlobalPaymentSettings, MerchantPaymentSettings } from "@/types/payment";

const MerchantPaymentSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalPaymentSettings | null>(null);
  const [merchantSettings, setMerchantSettings] = useState<MerchantPaymentSettings>({
    enabledMethods: [],
    enabledFlags: {}
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Busca Config Global do Admin
        const { data: global, error: globalError } = await supabase
          .from('app_settings')
          .select('*')
          .eq('key', 'global_payment_methods')
          .single();
        
        if (global) {
          setGlobalSettings(global.value);
        } else if (globalError) {
          console.warn("Global settings not found, using empty defaults.");
          setGlobalSettings({ methods: [] });
        }

        // 2. Busca Config da Loja
        const { data: merchant } = await supabase.from('merchant_applications').select('metadata').eq('id', user.id).single();
        if (merchant?.metadata?.payment_settings) {
          setMerchantSettings(merchant.metadata.payment_settings);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggleMethod = (methodId: string) => {
    setMerchantSettings(prev => {
      const isEnabled = prev.enabledMethods.includes(methodId);
      return {
        ...prev,
        enabledMethods: isEnabled 
          ? prev.enabledMethods.filter(id => id !== methodId)
          : [...prev.enabledMethods, methodId]
      };
    });
  };

  const handleToggleFlag = (methodId: string, flagId: string) => {
    setMerchantSettings(prev => {
      const currentFlags = prev.enabledFlags[methodId] || [];
      const isEnabled = currentFlags.includes(flagId);
      return {
        ...prev,
        enabledFlags: {
          ...prev.enabledFlags,
          [methodId]: isEnabled 
            ? currentFlags.filter(id => id !== flagId)
            : [...currentFlags, flagId]
        }
      };
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentMerchant } = await supabase.from('merchant_applications').select('metadata').eq('id', user.id).single();
      const updatedMetadata = {
        ...(currentMerchant?.metadata || {}),
        payment_settings: merchantSettings
      };

      const { error } = await supabase.from('merchant_applications').update({
        metadata: updatedMetadata
      }).eq('id', user.id);

      if (error) throw error;
      
      await supabase.auth.updateUser({ data: updatedMetadata });

      showSuccess("Formas de pagamento atualizadas!");
    } catch (err: any) {
      showError("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>;

  if (!globalSettings || !globalSettings.methods || globalSettings.methods.length === 0) {
      return (
          <div className="text-center py-20 space-y-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
              <h2 className="text-xl font-bold text-indigo-900">Métodos Globais não encontrados</h2>
              <p className="text-gray-500 max-w-md mx-auto">O administrador da plataforma ainda não configurou os métodos de pagamento aceitos globalmente.</p>
          </div>
      );
  }

  const activeGlobalMethods = globalSettings.methods.filter(m => m.enabled);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Formas de Pagamento</h1>
          <p className="text-gray-500">Escolha os métodos que sua loja aceita baseado nas regras da plataforma.</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl h-12 px-8 shadow-lg gap-2">
          {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ONLINE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Smartphone className="h-5 w-5 text-indigo-600" />
            <h2 className="font-black text-indigo-900 uppercase tracking-widest text-sm">Receber pelo App (Online)</h2>
          </div>
          <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 divide-y divide-gray-50">
              {activeGlobalMethods.filter(m => m.category === 'app').map(method => (
                <div key={method.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", merchantSettings.enabledMethods.includes(method.id) ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-400")}>
                      {method.id === 'pix' ? <Wallet className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <span className="font-bold">{method.label}</span>
                  </div>
                  <Switch 
                    checked={merchantSettings.enabledMethods.includes(method.id)} 
                    onCheckedChange={() => handleToggleMethod(method.id)} 
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* NA ENTREGA */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Truck className="h-5 w-5 text-indigo-600" />
            <h2 className="font-black text-indigo-900 uppercase tracking-widest text-sm">Receber na Entrega (Offline)</h2>
          </div>
          <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 space-y-8">
              {activeGlobalMethods.filter(m => m.category === 'delivery').map(method => (
                <div key={method.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl", merchantSettings.enabledMethods.includes(method.id) ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-400")}>
                        {method.id === 'cash_delivery' ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                      </div>
                      <span className="font-bold">{method.label}</span>
                    </div>
                    <Switch 
                      checked={merchantSettings.enabledMethods.includes(method.id)} 
                      onCheckedChange={() => handleToggleMethod(method.id)} 
                    />
                  </div>
                  
                  {merchantSettings.enabledMethods.includes(method.id) && method.requiresFlag && (
                    <div className="pl-12 grid grid-cols-2 gap-2 animate-in fade-in">
                      {method.flags?.map(flag => (
                        <button 
                          key={flag.id}
                          onClick={() => handleToggleFlag(method.id, flag.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                            merchantSettings.enabledFlags[method.id]?.includes(flag.id) 
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                              : "border-gray-50 text-gray-400 grayscale"
                          )}
                        >
                          <span className="text-[10px] font-black uppercase truncate">{flag.name}</span>
                          {merchantSettings.enabledFlags[method.id]?.includes(flag.id) && <Check className="h-3 w-3" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[2.5rem] flex items-start gap-4">
        <AlertTriangle className="h-6 w-6 text-orange-600 shrink-0 mt-1" />
        <div className="space-y-2">
          <h3 className="font-black text-orange-900 uppercase text-xs tracking-widest">Aviso Operacional Obrigatório</h3>
          <p className="text-orange-800/80 text-sm leading-relaxed">
            Ao ativar qualquer forma de <strong>Pagamento na Entrega</strong> (Dinheiro ou Maquininha), você assume a responsabilidade total pela cobrança. 
            Pedidos com estes métodos serão <strong>automaticamente bloqueados</strong> para a rede de entregadores do App, exigindo o uso de sua <strong>Frota Própria (Entregadores Exclusivos)</strong>, que deverão usar o aplicativo para inserir o código do cliente para confirmar a entrega.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MerchantPaymentSettingsPage;