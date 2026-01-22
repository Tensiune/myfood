"use client";

import React, { useState } from "react";
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
  Users, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  UserPlus,
  Building2,
  MapPin
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import BusinessHoursManager, { DayHours } from "@/components/merchant/BusinessHoursManager";

const MerchantSetupPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("status");
  const [loading, setLoading] = useState(false);
  
  // Status states
  const [isOpen, setIsOpen] = useState(false);
  
  // Hours states - updated to support multiple windows
  const [hours, setHours] = useState<Record<string, DayHours>>({
    monday: { closed: false, windows: [{ id: "1", open: "08:00", close: "18:00" }] },
    tuesday: { closed: false, windows: [{ id: "2", open: "08:00", close: "18:00" }] },
    wednesday: { closed: false, windows: [{ id: "3", open: "08:00", close: "18:00" }] },
    thursday: { closed: false, windows: [{ id: "4", open: "08:00", close: "18:00" }] },
    friday: { closed: false, windows: [{ id: "5", open: "08:00", close: "18:00" }] },
    saturday: { closed: false, windows: [{ id: "6", open: "09:00", close: "13:00" }] },
    sunday: { closed: true, windows: [] }
  });
  
  // Store info states
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
      zipCode: ""
    }
  });
  
  // Bank info states
  const [bankInfo, setBankInfo] = useState({
    bank: "",
    accountType: "checking",
    agency: "",
    agencyDigit: "",
    account: "",
    accountDigit: ""
  });
  
  // Team access states
  const [teamMembers, setTeamMembers] = useState([
    { id: "1", email: "gerente@loja.com", role: "manager", status: "active" }
  ]);
  
  // Completion states
  const [completedSteps, setCompletedSteps] = useState({
    status: false,
    hours: false,
    store: false,
    bank: false,
    menu: false
  });

  const handleSaveHours = () => {
    // Validação básica: verificar se dias abertos têm pelo menos uma janela
    const invalidDays = Object.entries(hours).filter(([_, h]) => !h.closed && h.windows.length === 0);
    if (invalidDays.length > 0) {
      showError("Dias marcados como abertos devem ter pelo menos um horário de funcionamento.");
      return;
    }

    setCompletedSteps(prev => ({ ...prev, hours: true }));
    showSuccess("Horário de funcionamento salvo!");
    setActiveTab("store");
  };

  const handleSaveStoreInfo = () => {
    if (!storeInfo.name || !storeInfo.phone || !storeInfo.address.street) {
      showError("Preencha todos os campos obrigatórios.");
      return;
    }
    setCompletedSteps(prev => ({ ...prev, store: true }));
    showSuccess("Informações da loja salvas!");
    setActiveTab("bank");
  };

  const handleSaveBankInfo = () => {
    if (!bankInfo.bank || !bankInfo.agency || !bankInfo.account) {
      showError("Preencha todos os campos bancários.");
      return;
    }
    setCompletedSteps(prev => ({ ...prev, bank: true }));
    showSuccess("Informações bancárias salvas!");
    setActiveTab("team");
  };

  const handleSubmitForApproval = async () => {
    const allCompleted = Object.values(completedSteps).every(step => step);
    if (!allCompleted) {
      showError("Complete todas as etapas antes de enviar para aprovação.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          status: 'PENDING',
          business_hours: hours,
          bank_info: bankInfo,
          store_details: storeInfo
        }
      });
      
      if (error) throw error;

      showSuccess("Solicitação enviada para aprovação!");
      navigate("/merchant/dashboard");
    } catch (error: any) {
      showError(error.message || "Erro ao enviar para aprovação.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "status", label: "Status da Loja", icon: Store },
    { id: "hours", label: "Horário", icon: Clock },
    { id: "store", label: "Minha Loja", icon: Building2 },
    { id: "bank", label: "Financeiro", icon: CreditCard },
    { id: "team", label: "Acessos", icon: Users },
    { id: "completion", label: "Conclusão", icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-indigo-900 mb-2 tracking-tight">Configuração Inicial</h1>
        <p className="text-gray-500">Complete as etapas abaixo para enviar sua loja para aprovação.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isCompleted = completedSteps[tab.id as keyof typeof completedSteps];
          
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={`flex items-center gap-2 rounded-xl h-12 px-4 transition-all ${
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : isCompleted 
                    ? "text-green-600" 
                    : "text-gray-400"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              <span className="font-bold text-xs">{tab.label}</span>
              {isCompleted && activeTab !== tab.id && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </Button>
          );
        })}
      </div>

      {activeTab === "status" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <Store className="h-6 w-6 text-brand-accent" />
              Status da Loja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-6 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg text-yellow-800 mb-2">Loja em Configuração</h3>
              <p className="text-yellow-700 text-sm">
                Sua loja está atualmente fechada pois ainda está em processo de configuração.
                Complete todas as etapas e envie para aprovação para começar a receber pedidos.
              </p>
            </div>
            
            <div className="flex items-center justify-between p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
              <div>
                <h3 className="font-bold text-lg text-indigo-900">Status Atual</h3>
                <p className="text-indigo-700 font-medium">Loja Fechada (Em Configuração)</p>
              </div>
              <Switch
                checked={isOpen}
                onCheckedChange={setIsOpen}
                disabled
                className="data-[state=checked]:bg-green-500"
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 px-8 h-auto shadow-lg shadow-indigo-100"
                onClick={() => setActiveTab("hours")}
              >
                Continuar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "hours" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <Clock className="h-6 w-6 text-brand-accent" />
              Horário de Funcionamento
            </CardTitle>
            <p className="text-gray-500 text-sm">
              Defina os horários em que sua loja estará aberta para pedidos. Você pode adicionar múltiplos intervalos por dia.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <BusinessHoursManager 
              hours={hours}
              onChange={setHours}
            />
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="ghost" 
                className="rounded-xl font-bold text-gray-400"
                onClick={() => setActiveTab("status")}
              >
                Voltar
              </Button>
              <Button 
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 px-8 h-auto shadow-lg shadow-indigo-100"
                onClick={handleSaveHours}
              >
                Salvar e Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "store" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <Building2 className="h-6 w-6 text-brand-accent" />
              Informações da Loja
            </CardTitle>
            <p className="text-gray-500 text-sm">Dados básicos e endereço comercial.</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Nome da Loja *</Label>
                <Input
                  placeholder="Ex: Hamburgueria do Zé"
                  value={storeInfo.name}
                  onChange={(e) => setStoreInfo({...storeInfo, name: e.target.value})}
                  className="rounded-xl h-12 border-gray-100"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Telefone Comercial *</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={storeInfo.phone}
                  onChange={(e) => setStoreInfo({...storeInfo, phone: e.target.value})}
                  className="rounded-xl h-12 border-gray-100"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Descrição</Label>
              <textarea
                placeholder="Conte um pouco sobre sua loja..."
                value={storeInfo.description}
                onChange={(e) => setStoreInfo({...storeInfo, description: e.target.value})}
                className="w-full rounded-2xl border border-gray-100 p-4 h-28 resize-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            
            <div className="pt-4 border-t border-gray-50">
              <h3 className="font-black text-lg text-indigo-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-accent" />
                Endereço de Entrega/Coleta
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="font-bold text-gray-700">Rua/Avenida *</Label>
                  <Input
                    placeholder="Logradouro"
                    value={storeInfo.address.street}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, street: e.target.value}
                    })}
                    className="rounded-xl h-12 border-gray-100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Número *</Label>
                  <Input
                    placeholder="000"
                    value={storeInfo.address.number}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, number: e.target.value}
                    })}
                    className="rounded-xl h-12 border-gray-100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Complemento</Label>
                  <Input
                    placeholder="Sala, Andar, etc."
                    value={storeInfo.address.complement}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, complement: e.target.value}
                    })}
                    className="rounded-xl h-12 border-gray-100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Bairro *</Label>
                  <Input
                    placeholder="Bairro"
                    value={storeInfo.address.neighborhood}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, neighborhood: e.target.value}
                    })}
                    className="rounded-xl h-12 border-gray-100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">CEP *</Label>
                  <Input
                    placeholder="00000-000"
                    value={storeInfo.address.zipCode}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, zipCode: e.target.value}
                    })}
                    className="rounded-xl h-12 border-gray-100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Cidade *</Label>
                  <Input
                    placeholder="Cidade"
                    value={storeInfo.address.city}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, city: e.target.value}
                    })}
                    className="rounded-xl h-12 border-gray-100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Estado *</Label>
                  <Select 
                    value={storeInfo.address.state}
                    onValueChange={(value) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, state: value}
                    })}
                  >
                    <SelectTrigger className="rounded-xl h-12 border-gray-100">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="SP">São Paulo</SelectItem>
                      <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                      <SelectItem value="MG">Minas Gerais</SelectItem>
                      <SelectItem value="PR">Paraná</SelectItem>
                      {/* Outros estados poderiam ser adicionados aqui */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="ghost" 
                className="rounded-xl font-bold text-gray-400"
                onClick={() => setActiveTab("hours")}
              >
                Voltar
              </Button>
              <Button 
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 px-8 h-auto shadow-lg shadow-indigo-100"
                onClick={handleSaveStoreInfo}
              >
                Salvar e Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "bank" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <CreditCard className="h-6 w-6 text-brand-accent" />
              Informações Bancárias
            </CardTitle>
            <p className="text-gray-500 text-sm">Dados para o repasse das vendas.</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Banco *</Label>
                <Select 
                  value={bankInfo.bank}
                  onValueChange={(value) => setBankInfo({...bankInfo, bank: value})}
                >
                  <SelectTrigger className="rounded-xl h-12 border-gray-100">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="001">Banco do Brasil</SelectItem>
                    <SelectItem value="033">Santander</SelectItem>
                    <SelectItem value="341">Itaú</SelectItem>
                    <SelectItem value="237">Bradesco</SelectItem>
                    <SelectItem value="104">Caixa Econômica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Tipo de Conta *</Label>
                <Select 
                  value={bankInfo.accountType}
                  onValueChange={(value) => setBankInfo({...bankInfo, accountType: value})}
                >
                  <SelectTrigger className="rounded-xl h-12 border-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <Label className="font-bold text-gray-700">Agência *</Label>
                  <Input
                    placeholder="0000"
                    value={bankInfo.agency}
                    onChange={(e) => setBankInfo({...bankInfo, agency: e.target.value})}
                    className="rounded-xl h-12 border-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Dígito</Label>
                  <Input
                    placeholder="0"
                    value={bankInfo.agencyDigit}
                    onChange={(e) => setBankInfo({...bankInfo, agencyDigit: e.target.value})}
                    className="rounded-xl h-12 border-gray-100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 col-span-1 md:col-span-4 mt-4 md:mt-0">
                <div className="col-span-2 space-y-2">
                  <Label className="font-bold text-gray-700">Conta *</Label>
                  <Input
                    placeholder="00000"
                    value={bankInfo.account}
                    onChange={(e) => setBankInfo({...bankInfo, account: e.target.value})}
                    className="rounded-xl h-12 border-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Dígito</Label>
                  <Input
                    placeholder="0"
                    value={bankInfo.accountDigit}
                    onChange={(e) => setBankInfo({...bankInfo, accountDigit: e.target.value})}
                    className="rounded-xl h-12 border-gray-100"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="ghost" 
                className="rounded-xl font-bold text-gray-400"
                onClick={() => setActiveTab("store")}
              >
                Voltar
              </Button>
              <Button 
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 px-8 h-auto shadow-lg shadow-indigo-100"
                onClick={handleSaveBankInfo}
              >
                Salvar e Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "team" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <Users className="h-6 w-6 text-brand-accent" />
              Gestão de Acessos
            </CardTitle>
            <p className="text-gray-500 text-sm">Convide sua equipe para ajudar no gerenciamento.</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100">
              <h3 className="font-black text-indigo-900 mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Convidar Colaborador
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="font-bold text-gray-700">E-mail</Label>
                  <Input
                    placeholder="colaborador@empresa.com"
                    className="rounded-xl h-12 bg-white border-none shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Função</Label>
                  <Select>
                    <SelectTrigger className="rounded-xl h-12 bg-white border-none shadow-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="employee">Operador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="mt-4 rounded-xl bg-indigo-600 font-bold px-6">
                Enviar Convite
              </Button>
            </div>
            
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-50 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{member.email}</p>
                      <Badge variant="secondary" className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-500 border-none">
                        {member.role === "manager" ? "Gerente" : "Operador"}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl font-bold">
                    Remover
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="ghost" 
                className="rounded-xl font-bold text-gray-400"
                onClick={() => setActiveTab("bank")}
              >
                Voltar
              </Button>
              <Button 
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 px-8 h-auto shadow-lg shadow-indigo-100"
                onClick={() => setActiveTab("completion")}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "completion" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <CheckCircle2 className="h-6 w-6 text-brand-accent" />
              Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-indigo-50/50 rounded-3xl p-8 border border-indigo-100">
              <h3 className="font-black text-xl text-indigo-900 mb-6">Resumo das Etapas</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Horários", step: "hours" },
                  { label: "Dados da Loja", step: "store" },
                  { label: "Financeiro", step: "bank" },
                  { label: "Cardápio", step: "menu" }
                ].map((item) => (
                  <div key={item.step} className="flex items-center p-4 bg-white rounded-2xl shadow-sm">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-4 ${completedSteps[item.step as keyof typeof completedSteps] ? 'bg-green-500' : 'bg-gray-100'}`}>
                      {completedSteps[item.step as keyof typeof completedSteps] ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                    <span className={`font-bold ${completedSteps[item.step as keyof typeof completedSteps] ? 'text-gray-900' : 'text-gray-400'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4">
              <AlertCircle className="h-6 w-6 text-blue-500 shrink-0" />
              <p className="text-blue-700 text-sm font-medium">
                Após o envio, nossa equipe analisará seus dados em até 48 horas. Você será notificado via e-mail sobre a aprovação.
              </p>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="ghost" 
                className="rounded-xl font-bold text-gray-400"
                onClick={() => setActiveTab("team")}
              >
                Voltar
              </Button>
              <Button 
                className="rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-black py-6 px-10 h-auto shadow-xl shadow-brand-accent/20 transition-all active:scale-[0.98]"
                onClick={handleSubmitForApproval}
                disabled={loading}
              >
                {loading ? "Processando..." : "Enviar para Aprovação"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchantSetupPage;