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
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  UserPlus,
  Building2,
  MapPin
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const MerchantSetupPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("status");
  const [loading, setLoading] = useState(false);
  
  // Status states
  const [isOpen, setIsOpen] = useState(false);
  
  // Hours states
  const [hours, setHours] = useState({
    monday: { open: "08:00", close: "18:00", closed: false },
    tuesday: { open: "08:00", close: "18:00", closed: false },
    wednesday: { open: "08:00", close: "18:00", closed: false },
    thursday: { open: "08:00", close: "18:00", closed: false },
    friday: { open: "08:00", close: "18:00", closed: false },
    saturday: { open: "09:00", close: "13:00", closed: false },
    sunday: { open: "09:00", close: "13:00", closed: true }
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
    setCompletedSteps(prev => ({ ...prev, hours: true }));
    showSuccess("Horário de funcionamento salvo!");
  };

  const handleSaveStoreInfo = () => {
    if (!storeInfo.name || !storeInfo.phone || !storeInfo.address.street) {
      showError("Preencha todos os campos obrigatórios.");
      return;
    }
    setCompletedSteps(prev => ({ ...prev, store: true }));
    showSuccess("Informações da loja salvas!");
  };

  const handleSaveBankInfo = () => {
    if (!bankInfo.bank || !bankInfo.agency || !bankInfo.account) {
      showError("Preencha todos os campos bancários.");
      return;
    }
    setCompletedSteps(prev => ({ ...prev, bank: true }));
    showSuccess("Informações bancárias salvas!");
  };

  const handleSubmitForApproval = async () => {
    const allCompleted = Object.values(completedSteps).every(step => step);
    if (!allCompleted) {
      showError("Complete todas as etapas antes de enviar para aprovação.");
      return;
    }

    setLoading(true);
    try {
      // In a real app, we would update the merchant's status in the database
      // For now, we'll just show a success message
      showSuccess("Solicitação enviada para aprovação! Você será notificado quando for aprovado.");
      navigate("/merchant/dashboard");
    } catch (error: any) {
      showError(error.message || "Erro ao enviar para aprovação.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDayClosed = (day: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed
      }
    }));
  };

  const updateDayHours = (day: string, field: string, value: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const dayNames: Record<string, string> = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo"
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
        <h1 className="text-3xl font-black text-indigo-900 mb-2">Configuração Inicial</h1>
        <p className="text-gray-600">Complete as etapas abaixo para enviar sua loja para aprovação</p>
      </div>

      {/* Progress tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isCompleted = completedSteps[tab.id as keyof typeof completedSteps];
          
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              className={`flex items-center gap-2 rounded-xl h-14 px-4 ${
                activeTab === tab.id 
                  ? "bg-brand-accent hover:bg-brand-accent/90 text-white" 
                  : isCompleted 
                    ? "border-green-500 text-green-600" 
                    : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-5 w-5" />
              <span className="font-bold text-sm">{tab.label}</span>
              {isCompleted && activeTab !== tab.id && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </Button>
          );
        })}
      </div>

      {/* Status Tab */}
      {activeTab === "status" && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <Store className="h-6 w-6" />
              Status da Loja
            </CardTitle>
            <p className="text-gray-600">
              Configure se sua loja está aberta ou fechada para pedidos
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg text-yellow-800 mb-2">Loja em Configuração</h3>
              <p className="text-yellow-700">
                Sua loja está atualmente fechada pois ainda está em processo de configuração.
                Complete todas as etapas e envie para aprovação para começar a receber pedidos.
              </p>
            </div>
            
            <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-2xl">
              <div>
                <h3 className="font-bold text-lg text-indigo-900">Status Atual</h3>
                <p className="text-indigo-700">Loja Fechada (Em Configuração)</p>
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
                className="rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 px-6"
                onClick={() => setActiveTab("hours")}
              >
                Continuar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hours Tab */}
      {activeTab === "hours" && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <Clock className="h-6 w-6" />
              Horário de Funcionamento
            </CardTitle>
            <p className="text-gray-600">
              Defina os horários em que sua loja estará aberta para pedidos
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(hours).map(([day, dayHours]) => (
                <div key={day} className="border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800">{dayNames[day]}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Fechado</span>
                      <Switch
                        checked={!dayHours.closed}
                        onCheckedChange={() => toggleDayClosed(day)}
                      />
                      <span className="text-sm text-gray-500">Aberto</span>
                    </div>
                  </div>
                  
                  {!dayHours.closed ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">Abertura</Label>
                        <Input
                          type="time"
                          value={dayHours.open}
                          onChange={(e) => updateDayHours(day, "open", e.target.value)}
                          className="rounded-lg h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Fechamento</Label>
                        <Input
                          type="time"
                          value={dayHours.close}
                          onChange={(e) => updateDayHours(day, "close", e.target.value)}
                          className="rounded-lg h-10"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-lg py-2 text-center text-gray-500 text-sm">
                      Fechado o dia todo
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={() => setActiveTab("status")}
              >
                Voltar
              </Button>
              <Button 
                className="rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 px-6"
                onClick={() => {
                  handleSaveHours();
                  setActiveTab("store");
                }}
              >
                Salvar e Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Info Tab */}
      {activeTab === "store" && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <Building2 className="h-6 w-6" />
              Informações da Loja
            </CardTitle>
            <p className="text-gray-600">
              Dados básicos e endereço da sua loja
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Loja *</Label>
                <Input
                  placeholder="Ex: Hamburgueria do Zé"
                  value={storeInfo.name}
                  onChange={(e) => setStoreInfo({...storeInfo, name: e.target.value})}
                  className="rounded-xl h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={storeInfo.phone}
                  onChange={(e) => setStoreInfo({...storeInfo, phone: e.target.value})}
                  className="rounded-xl h-12"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <textarea
                placeholder="Conte um pouco sobre sua loja..."
                value={storeInfo.description}
                onChange={(e) => setStoreInfo({...storeInfo, description: e.target.value})}
                className="w-full rounded-xl border border-gray-200 p-3 h-24 resize-none"
              />
            </div>
            
            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Logradouro *</Label>
                  <Input
                    placeholder="Rua, Avenida, etc."
                    value={storeInfo.address.street}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, street: e.target.value}
                    })}
                    className="rounded-xl h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Número *</Label>
                  <Input
                    placeholder="000"
                    value={storeInfo.address.number}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, number: e.target.value}
                    })}
                    className="rounded-xl h-12"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    placeholder="Apartamento, sala, etc."
                    value={storeInfo.address.complement}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, complement: e.target.value}
                    })}
                    className="rounded-xl h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Bairro *</Label>
                  <Input
                    placeholder="Nome do bairro"
                    value={storeInfo.address.neighborhood}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, neighborhood: e.target.value}
                    })}
                    className="rounded-xl h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>CEP *</Label>
                  <Input
                    placeholder="00000-000"
                    value={storeInfo.address.zipCode}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, zipCode: e.target.value}
                    })}
                    className="rounded-xl h-12"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Input
                    placeholder="Nome da cidade"
                    value={storeInfo.address.city}
                    onChange={(e) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, city: e.target.value}
                    })}
                    className="rounded-xl h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select 
                    value={storeInfo.address.state}
                    onValueChange={(value) => setStoreInfo({
                      ...storeInfo, 
                      address: {...storeInfo.address, state: value}
                    })}
                  >
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">Acre</SelectItem>
                      <SelectItem value="AL">Alagoas</SelectItem>
                      <SelectItem value="AP">Amapá</SelectItem>
                      <SelectItem value="AM">Amazonas</SelectItem>
                      <SelectItem value="BA">Bahia</SelectItem>
                      <SelectItem value="CE">Ceará</SelectItem>
                      <SelectItem value="DF">Distrito Federal</SelectItem>
                      <SelectItem value="ES">Espírito Santo</SelectItem>
                      <SelectItem value="GO">Goiás</SelectItem>
                      <SelectItem value="MA">Maranhão</SelectItem>
                      <SelectItem value="MT">Mato Grosso</SelectItem>
                      <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                      <SelectItem value="MG">Minas Gerais</SelectItem>
                      <SelectItem value="PA">Pará</SelectItem>
                      <SelectItem value="PB">Paraíba</SelectItem>
                      <SelectItem value="PR">Paraná</SelectItem>
                      <SelectItem value="PE">Pernambuco</SelectItem>
                      <SelectItem value="PI">Piauí</SelectItem>
                      <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                      <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                      <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                      <SelectItem value="RO">Rondônia</SelectItem>
                      <SelectItem value="RR">Roraima</SelectItem>
                      <SelectItem value="SC">Santa Catarina</SelectItem>
                      <SelectItem value="SP">São Paulo</SelectItem>
                      <SelectItem value="SE">Sergipe</SelectItem>
                      <SelectItem value="TO">Tocantins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={() => setActiveTab("hours")}
              >
                Voltar
              </Button>
              <Button 
                className="rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 px-6"
                onClick={() => {
                  handleSaveStoreInfo();
                  setActiveTab("bank");
                }}
              >
                Salvar e Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bank Info Tab */}
      {activeTab === "bank" && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <CreditCard className="h-6 w-6" />
              Informações Bancárias
            </CardTitle>
            <p className="text-gray-600">
              Dados da conta para recebimento dos pagamentos
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Select 
                  value={bankInfo.bank}
                  onValueChange={(value) => setBankInfo({...bankInfo, bank: value})}
                >
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="001">Banco do Brasil</SelectItem>
                    <SelectItem value="033">Santander</SelectItem>
                    <SelectItem value="104">Caixa Econômica</SelectItem>
                    <SelectItem value="237">Bradesco</SelectItem>
                    <SelectItem value="341">Itaú</SelectItem>
                    <SelectItem value="399">HSBC</SelectItem>
                    <SelectItem value="745">Citibank</SelectItem>
                    <SelectItem value="756">Bancoob</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Conta *</Label>
                <Select 
                  value={bankInfo.accountType}
                  onValueChange={(value) => setBankInfo({...bankInfo, accountType: value})}
                >
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Agência *</Label>
                <Input
                  placeholder="0000"
                  value={bankInfo.agency}
                  onChange={(e) => setBankInfo({...bankInfo, agency: e.target.value})}
                  className="rounded-xl h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Dígito</Label>
                <Input
                  placeholder="0"
                  value={bankInfo.agencyDigit}
                  onChange={(e) => setBankInfo({...bankInfo, agencyDigit: e.target.value})}
                  className="rounded-xl h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Conta *</Label>
                <Input
                  placeholder="00000"
                  value={bankInfo.account}
                  onChange={(e) => setBankInfo({...bankInfo, account: e.target.value})}
                  className="rounded-xl h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Dígito</Label>
                <Input
                  placeholder="0"
                  value={bankInfo.accountDigit}
                  onChange={(e) => setBankInfo({...bankInfo, accountDigit: e.target.value})}
                  className="rounded-xl h-12"
                />
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={() => setActiveTab("store")}
              >
                Voltar
              </Button>
              <Button 
                className="rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 px-6"
                onClick={() => {
                  handleSaveBankInfo();
                  setActiveTab("team");
                }}
              >
                Salvar e Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Access Tab */}
      {activeTab === "team" && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <Users className="h-6 w-6" />
              Gestão de Acessos
            </CardTitle>
            <p className="text-gray-600">
              Convide colaboradores para gerenciar sua loja
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-indigo-50 rounded-2xl p-6">
              <h3 className="font-bold text-lg text-indigo-900 mb-2 flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Convidar Novo Colaborador
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>E-mail do Colaborador</Label>
                  <Input
                    placeholder="colaborador@empresa.com"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select>
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="employee">Funcionário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                Enviar Convite
              </Button>
            </div>
            
            <div>
              <h3 className="font-bold text-lg text-gray-800 mb-4">Colaboradores</h3>
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-800">{member.email}</p>
                      <Badge variant="secondary" className="mt-1">
                        {member.role === "manager" ? "Gerente" : "Funcionário"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.status === "active" ? "default" : "secondary"}>
                        {member.status === "active" ? "Ativo" : "Pendente"}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={() => setActiveTab("bank")}
              >
                Voltar
              </Button>
              <Button 
                className="rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 px-6"
                onClick={() => setActiveTab("completion")}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Tab */}
      {activeTab === "completion" && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900">
              <CheckCircle2 className="h-6 w-6" />
              Conclusão
            </CardTitle>
            <p className="text-gray-600">
              Revise suas informações e envie para aprovação
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-indigo-50 rounded-2xl p-6">
              <h3 className="font-bold text-lg text-indigo-900 mb-4">Resumo da Configuração</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${completedSteps.status ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {completedSteps.status ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Status da Loja</p>
                    <p className="text-sm text-gray-600">Loja configurada como fechada</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${completedSteps.hours ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {completedSteps.hours ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Horário de Funcionamento</p>
                    <p className="text-sm text-gray-600">Horários configurados para todos os dias</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${completedSteps.store ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {completedSteps.store ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Informações da Loja</p>
                    <p className="text-sm text-gray-600">Dados e endereço da loja preenchidos</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${completedSteps.bank ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {completedSteps.bank ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Informações Bancárias</p>
                    <p className="text-sm text-gray-600">Dados bancários para recebimento</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${completedSteps.menu ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {completedSteps.menu ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Cardápio</p>
                    <p className="text-sm text-gray-600">Cardápio configurado</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <h3 className="font-bold text-lg text-yellow-800 mb-2">Importante</h3>
              <p className="text-yellow-700">
                Após enviar para aprovação, nossa equipe irá analisar suas informações. 
                Você receberá um e-mail quando sua loja for aprovada e puder começar a receber pedidos.
              </p>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={() => setActiveTab("team")}
              >
                Voltar
              </Button>
              <Button 
                className="rounded-2xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 px-6"
                onClick={handleSubmitForApproval}
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar para Aprovação"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchantSetupPage;