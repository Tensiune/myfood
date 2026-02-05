"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Wallet, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Smartphone, 
  Banknote,
  ShieldCheck,
  AlertCircle,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { GlobalPaymentSettings, PaymentMethodConfig, PaymentFlag } from "@/types/payment";

const INITIAL_METHODS: PaymentMethodConfig[] = [
  { id: "pix", label: "PIX", category: "app", enabled: true },
  { id: "card_credit_online", label: "Cartão de Crédito", category: "app", enabled: true },
  { id: "card_debit_online", label: "Cartão de Débito", category: "app", enabled: true },
  { id: "apple_pay", label: "Apple Pay", category: "app", enabled: false },
  { id: "google_pay", label: "Google Pay", category: "app", enabled: false },
  { id: "cash_delivery", label: "Dinheiro", category: "delivery", enabled: true },
  { id: "card_credit_delivery", label: "Cartão de Crédito", category: "delivery", enabled: true, requiresFlag: true, flags: [] },
  { id: "card_debit_delivery", label: "Cartão de Débito", category: "delivery", enabled: true, requiresFlag: true, flags: [] },
  { id: "meal_voucher_delivery", label: "Vale Refeição", category: "delivery", enabled: true, requiresFlag: true, flags: [] },
];

const AdminPaymentSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GlobalPaymentSettings>({ methods: INITIAL_METHODS });
  const [newFlagName, setNewFlagName] = useState("");
  const [activeMethodForFlag, setActiveMethodForFlag] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data } = await supabase.from('app_settings').select('*').eq('key', 'global_payment_methods').single();
      if (data) {
        setSettings(data.value);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleToggleMethod = (id: string) => {
    setSettings(prev => ({
      ...prev,
      methods: prev.methods.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
    }));
  };

  const handleAddFlag = () => {
    if (!newFlagName.trim() || !activeMethodForFlag) return;
    
    setSettings(prev => ({
      ...prev,
      methods: prev.methods.map(m => {
        if (m.id === activeMethodForFlag) {
          const newFlag: PaymentFlag = { id: Date.now().toString(), name: newFlagName.trim() };
          return { ...m, flags: [...(m.flags || []), newFlag] };
        }
        return m;
      })
    }));
    setNewFlagName("");
  };

  const handleRemoveFlag = (methodId: string, flagId: string) => {
    setSettings(prev => ({
      ...prev,
      methods: prev.methods.map(m => {
        if (m.id === methodId) {
          return { ...m, flags: m.flags?.filter(f => f.id !== flagId) };
        }
        return m;
      })
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert({
        key: 'global_payment_methods',
        value: settings,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      showSuccess("Configurações de pagamento salvas!");
    } catch (err: any) {
      showError("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Gestão de Pagamentos</h1>
          <p className="text-gray-500">Controle global de métodos e bandeiras aceitas na plataforma.</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl h-12 px-8 shadow-lg gap-2">
          {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
          Salvar Tudo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* PAGAMENTOS PELO APP */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Smartphone className="h-5 w-5 text-indigo-600" />
            <h2 className="font-black text-indigo-900 uppercase tracking-widest text-sm">Pelo Aplicativo (Online)</h2>
          </div>
          <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 divide-y divide-gray-50">
              {settings.methods.filter(m => m.category === 'app').map(method => (
                <div key={method.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", method.enabled ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-400")}>
                      {method.id === 'pix' ? <Wallet className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <span className={cn("font-bold", !method.enabled && "text-gray-400")}>{method.label}</span>
                  </div>
                  <Switch checked={method.enabled} onCheckedChange={() => handleToggleMethod(method.id)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* PAGAMENTOS NA ENTREGA */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Truck className="h-5 w-5 text-indigo-600" />
            <h2 className="font-black text-indigo-900 uppercase tracking-widest text-sm">Na Entrega (Offline)</h2>
          </div>
          <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 space-y-6">
              {settings.methods.filter(m => m.category === 'delivery').map(method => (
                <div key={method.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl", method.enabled ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-400")}>
                        {method.id === 'cash_delivery' ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                      </div>
                      <span className={cn("font-bold", !method.enabled && "text-gray-400")}>{method.label}</span>
                    </div>
                    <Switch checked={method.enabled} onCheckedChange={() => handleToggleMethod(method.id)} />
                  </div>
                  
                  {method.enabled && method.requiresFlag && (
                    <div className="pl-12 space-y-3 animate-in fade-in slide-in-from-top-1">
                      <div className="flex flex-wrap gap-2">
                        {method.flags?.map(flag => (
                          <Badge key={flag.id} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none px-3 py-1 gap-2">
                            {flag.name}
                            <button onClick={() => handleRemoveFlag(method.id, flag.id)}><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] font-black uppercase text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50"
                          onClick={() => setActiveMethodForFlag(method.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Bandeira
                        </Button>
                      </div>

                      {activeMethodForFlag === method.id && (
                        <div className="flex gap-2 animate-in zoom-in-95">
                          <Input 
                            placeholder="Ex: Mastercard" 
                            className="h-8 text-xs rounded-lg border-indigo-100" 
                            value={newFlagName} 
                            onChange={(e) => setNewFlagName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddFlag()}
                            autoFocus
                          />
                          <Button size="sm" className="h-8 px-4 bg-indigo-600 rounded-lg text-[10px] font-bold" onClick={handleAddFlag}>OK</Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setActiveMethodForFlag(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      <Card className="rounded-[2rem] border-none bg-indigo-900 text-white p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-2xl"><ShieldCheck className="h-8 w-8 text-indigo-300" /></div>
          <div>
            <h3 className="text-xl font-black mb-2">Regra de Logística Forçada</h3>
            <p className="text-indigo-200 text-sm leading-relaxed">
              O sistema está configurado para que qualquer pedido com <strong>Pagamento na Entrega</strong> (Dinheiro, Cartão ou Vale) seja obrigatoriamente entregue pela <strong>Frota Própria</strong> do lojista. 
              Isso garante que o entregador possua a maquininha ou troco correto. A comissão da plataforma será descontada do saldo de vendas online da loja.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminPaymentSettingsPage;