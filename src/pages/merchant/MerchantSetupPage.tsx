"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Clock, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Map,
  Loader2
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import BusinessHoursManager, { DayHours } from "@/components/merchant/BusinessHoursManager";
import MerchantAddressForm from "@/components/merchant/MerchantAddressForm";
import DeliveryAreaManager from "@/components/merchant/DeliveryAreaManager";

const BRAZILIAN_BANKS = [
  { code: "001", name: "001 - Banco do Brasil" },
  { code: "033", name: "033 - Santander" },
  { code: "104", name: "104 - Caixa Econômica Federal" },
  { code: "237", name: "237 - Bradesco" },
  { code: "341", name: "341 - Itaú Unibanco" },
  { code: "260", name: "260 - Nu Pagamentos (Nubank)" },
  { code: "077", name: "077 - Banco Inter" },
].sort((a, b) => a.name.localeCompare(b.name));

const MerchantSetupPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("status");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  const [hours, setHours] = useState<Record<string, DayHours>>({
    monday: { closed: false, windows: [{ id: "1", open: "08:00", close: "18:00" }] },
    tuesday: { closed: false, windows: [{ id: "2", open: "08:00", close: "18:00" }] },
    wednesday: { closed: false, windows: [{ id: "3", open: "08:00", close: "18:00" }] },
    thursday: { closed: false, windows: [{ id: "4", open: "08:00", close: "18:00" }] },
    friday: { closed: false, windows: [{ id: "5", open: "08:00", close: "18:00" }] },
    saturday: { closed: false, windows: [{ id: "6", open: "09:00", close: "13:00" }] },
    sunday: { closed: true, windows: [] }
  });
  
  const [storeInfo, setStoreInfo] = useState({
    name: "",
    description: "",
    phone: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      lat: -23.5505,
      lng: -46.6333
    }
  });

  const [deliveryArea, setDeliveryArea] = useState<{ radius: number; exclusionZones: [number, number][][] }>({
    radius: 5,
    exclusionZones: []
  });
  
  const [bankInfo, setBankInfo] = useState({
    bank: "",
    accountType: "checking",
    agency: "",
    agencyDigit: "",
    account: "",
    accountDigit: ""
  });

  const [completedSteps, setCompletedSteps] = useState({
    status: false,
    hours: false,
    store: false,
    delivery: false,
    bank: false
  });

  // CARREGAR DADOS EXISTENTES
  useEffect(() => {
    const fetchCurrentData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        const meta = user.user_metadata;
        if (meta.business_hours) setHours(meta.business_hours);
        if (meta.store_details) setStoreInfo(meta.store_details);
        if (meta.delivery_area) setDeliveryArea(meta.delivery_area);
        if (meta.bank_info) setBankInfo(meta.bank_info);
        
        // Se já tem dados, marca passos como completados
        setCompletedSteps({
          status: true,
          hours: !!meta.business_hours,
          store: !!meta.store_details,
          delivery: !!meta.delivery_area,
          bank: !!meta.bank_info
        });
      }
      setInitializing(false);
    };
    fetchCurrentData();
  }, []);

  const handleSaveHours = () => {
    setCompletedSteps(prev => ({ ...prev, hours: true }));
    showSuccess("Horário salvo!");
    setActiveTab("store");
  };

  const handleSaveStoreInfo = () => {
    if (!storeInfo.name || !storeInfo.address.street) {
      showError("Preencha os campos obrigatórios.");
      return;
    }
    setCompletedSteps(prev => ({ ...prev, store: true }));
    showSuccess("Dados da loja salvos!");
    setActiveTab("delivery");
  };

  const handleSaveDeliveryArea = () => {
    setCompletedSteps(prev => ({ ...prev, delivery: true }));
    showSuccess("Área de entrega configurada!");
    setActiveTab("bank");
  };

  const handleSaveBankInfo = () => {
    if (!bankInfo.bank || !bankInfo.agency || !bankInfo.account || !bankInfo.accountDigit) {
      showError("Preencha os dados bancários obrigatórios.");
      return;
    }
    setCompletedSteps(prev => ({ ...prev, bank: true }));
    showSuccess("Dados bancários salvos!");
    setActiveTab("completion");
  };

  const handleSubmitForApproval = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          status: 'PENDING',
          business_hours: hours,
          bank_info: bankInfo,
          store_details: storeInfo,
          delivery_area: deliveryArea
        }
      });
      
      if (error) throw error;
      showSuccess("Cadastro enviado para análise!");
      navigate("/merchant/dashboard");
    } catch (error: any) {
      showError(error.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Recuperando seus dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-indigo-900 mb-2 tracking-tight">Configuração da Loja</h1>
        <p className="text-gray-500">Defina onde e como você vai vender.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isCompleted = completedSteps[tab.id as keyof typeof completedSteps];
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              className={`flex items-center gap-2 rounded-xl h-12 px-4 ${
                isActive ? "bg-indigo-600 text-white" : isCompleted ? "text-green-600" : "text-gray-400"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              <span className="font-bold text-xs">{tab.label}</span>
            </Button>
          );
        })}
      </div>

      {activeTab === "status" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <CardContent className="space-y-6 p-8">
            <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-6 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg text-yellow-800">Loja em Configuração</h3>
              <p className="text-yellow-700 text-sm">Sua loja será liberada após o envio para análise.</p>
            </div>
            <div className="flex justify-end">
              <Button className="rounded-2xl bg-indigo-600 px-8 py-6 h-auto" onClick={() => setActiveTab("hours")}>
                {completedSteps.status ? "Continuar Revisão" : "Começar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "hours" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0"><CardTitle className="text-2xl font-black text-indigo-900">Horário de Funcionamento</CardTitle></CardHeader>
          <CardContent className="space-y-6 p-8">
            <BusinessHoursManager hours={hours} onChange={setHours} />
            <div className="flex justify-between pt-4"><Button variant="ghost" onClick={() => setActiveTab("status")}>Voltar</Button><Button className="rounded-2xl bg-indigo-600 px-8 py-6 h-auto" onClick={handleSaveHours}>Continuar</Button></div>
          </CardContent>
        </Card>
      )}

      {activeTab === "store" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0"><CardTitle className="text-2xl font-black text-indigo-900">Dados da Loja</CardTitle></CardHeader>
          <CardContent className="space-y-6 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome da Loja *</Label><Input value={storeInfo.name} onChange={(e) => setStoreInfo({...storeInfo, name: e.target.value})} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Telefone *</Label><Input value={storeInfo.phone} onChange={(e) => setStoreInfo({...storeInfo, phone: e.target.value})} className="rounded-xl" /></div>
            </div>
            <MerchantAddressForm address={storeInfo.address} onChange={(address) => setStoreInfo({ ...storeInfo, address })} />
            <div className="flex justify-between pt-4"><Button variant="ghost" onClick={() => setActiveTab("hours")}>Voltar</Button><Button className="rounded-2xl bg-indigo-600 px-8 py-6 h-auto" onClick={handleSaveStoreInfo}>Continuar</Button></div>
          </CardContent>
        </Card>
      )}

      {activeTab === "delivery" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0"><CardTitle className="text-2xl font-black text-indigo-900">Área de Entrega</CardTitle></CardHeader>
          <CardContent className="space-y-6 p-8">
            <DeliveryAreaManager 
              center={[storeInfo.address.lat || -23.5505, storeInfo.address.lng || -46.6333]}
              radius={deliveryArea.radius}
              exclusionZones={deliveryArea.exclusionZones}
              onChange={(radius, zones) => setDeliveryArea({ radius, exclusionZones: zones })}
            />
            <div className="flex justify-between pt-4"><Button variant="ghost" onClick={() => setActiveTab("store")}>Voltar</Button><Button className="rounded-2xl bg-indigo-600 px-8 py-6 h-auto" onClick={handleSaveDeliveryArea}>Continuar</Button></div>
          </CardContent>
        </Card>
      )}

      {activeTab === "bank" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-2xl font-black text-indigo-900">Dados Bancários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Banco *</Label>
                <Select value={bankInfo.bank} onValueChange={(v) => setBankInfo({ ...bankInfo, bank: v })}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60">
                    {BRAZILIAN_BANKS.map((b) => (
                      <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Tipo de Conta *</Label>
                <Select value={bankInfo.accountType} onValueChange={(v) => setBankInfo({ ...bankInfo, accountType: v })}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label className="font-bold text-gray-700">Agência *</Label>
                  <Input
                    placeholder="0001"
                    value={bankInfo.agency}
                    onChange={(e) => setBankInfo({ ...bankInfo, agency: e.target.value })}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Dígito</Label>
                  <Input
                    placeholder="0"
                    maxLength={1}
                    value={bankInfo.agencyDigit}
                    onChange={(e) => setBankInfo({ ...bankInfo, agencyDigit: e.target.value })}
                    className="rounded-xl h-12 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label className="font-bold text-gray-700">Número da Conta *</Label>
                  <Input
                    placeholder="00000000"
                    value={bankInfo.account}
                    onChange={(e) => setBankInfo({ ...bankInfo, account: e.target.value })}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Dígito *</Label>
                  <Input
                    placeholder="0"
                    maxLength={1}
                    value={bankInfo.accountDigit}
                    onChange={(e) => setBankInfo({ ...bankInfo, accountDigit: e.target.value })}
                    className="rounded-xl h-12 text-center"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setActiveTab("delivery")} className="rounded-xl">Voltar</Button>
              <Button className="rounded-2xl bg-indigo-600 px-8 py-6 h-auto font-bold" onClick={handleSaveBankInfo}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "completion" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0"><CardTitle className="text-2xl font-black text-indigo-900">Finalizar</CardTitle></CardHeader>
          <CardContent className="space-y-6 p-8">
            <div className="bg-indigo-50 p-8 rounded-3xl text-center">
              <CheckCircle2 className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Tudo Pronto!</h2>
              <p className="text-gray-600">Sua loja será avaliada pela nossa equipe antes de ficar visível para os clientes.</p>
            </div>
            <div className="flex justify-between pt-4"><Button variant="ghost" onClick={() => setActiveTab("bank")}>Voltar</Button><Button className="rounded-2xl bg-brand-accent text-white px-8 py-6 h-auto shadow-xl" onClick={handleSubmitForApproval} disabled={loading}>{loading ? "Processando..." : "Enviar para Aprovação"}</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const tabs = [
  { id: "status", label: "Status", icon: Store },
  { id: "hours", label: "Horário", icon: Clock },
  { id: "store", label: "Minha Loja", icon: Building2 },
  { id: "delivery", label: "Área de Entrega", icon: Map },
  { id: "bank", label: "Financeiro", icon: CreditCard },
  { id: "completion", label: "Conclusão", icon: CheckCircle2 }
];

export default MerchantSetupPage;