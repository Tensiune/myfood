"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Store, 
  Clock, 
  Users, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  UserPlus,
  Building2,
  MapPin,
  ShieldCheck
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import BusinessHoursManager, { DayHours } from "@/components/merchant/BusinessHoursManager";
import MerchantAddressForm from "@/components/merchant/MerchantAddressForm";

const BRAZILIAN_BANKS = [
  { code: "001", name: "Banco do Brasil" },
  { code: "033", name: "Santander" },
  { code: "104", name: "Caixa Econômica Federal" },
  { code: "237", name: "Bradesco" },
  { code: "341", name: "Itaú Unibanco" },
  { code: "077", name: "Banco Inter" },
  { code: "260", name: "Nubank (Nu Pagamentos)" },
  { code: "422", name: "Banco Safra" },
  { code: "745", name: "Citibank" },
  { code: "041", name: "Banrisul" },
  { code: "212", name: "Banco Original" },
  { code: "633", name: "Banco Rendimento" },
  { code: "707", name: "Banco Daycoval" },
  { code: "070", name: "Banco BRB" },
  { code: "197", name: "Stone Pagamentos" },
  { code: "290", name: "PagSeguro" },
  { code: "323", name: "Mercado Pago" },
  { code: "004", name: "Banco do Nordeste" },
  { code: "003", name: "Banco da Amazônia" },
];

const PERMISSIONS = [
  { id: "orders", label: "Gerenciar Pedidos" },
  { id: "menu", label: "Editar Cardápio" },
  { id: "reports", label: "Ver Relatórios" },
  { id: "settings", label: "Configurações da Loja" },
];

const MerchantSetupPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("status");
  const [loading, setLoading] = useState(false);
  
  // Status states
  const [isOpen, setIsOpen] = useState(false);
  
  // Hours states
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
      zipCode: "",
      lat: -23.5505,
      lng: -46.6333
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
  
  // Team invitation states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [invitePermissions, setInvitePermissions] = useState<string[]>(["orders"]);
  const [teamMembers, setTeamMembers] = useState([
    { id: "1", email: "gerente@loja.com", role: "manager", status: "active", permissions: ["orders", "menu", "reports", "settings"] }
  ]);

  const handleInviteSubmit = () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      showError("Informe um e-mail válido para o convite.");
      return;
    }
    
    const newMember = {
      id: Date.now().toString(),
      email: inviteEmail,
      role: inviteRole,
      status: "pending",
      permissions: [...invitePermissions]
    };
    
    setTeamMembers(prev => [newMember, ...prev]);
    setInviteEmail("");
    showSuccess("Convite enviado com sucesso!");
  };

  const togglePermission = (permId: string) => {
    setInvitePermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };
  
  // Completion states
  const [completedSteps, setCompletedSteps] = useState({
    status: false,
    hours: false,
    store: false,
    bank: false,
    menu: false
  });

  const handleSaveHours = () => {
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
    { id: "status", label: "Status", icon: Store },
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
        <p className="text-gray-500">Complete as etapas para liberar seu estabelecimento.</p>
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
                activeTab === tab.id ? "bg-indigo-600 text-white shadow-md" : isCompleted ? "text-green-600" : "text-gray-400"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              <span className="font-bold text-xs">{tab.label}</span>
              {isCompleted && activeTab !== tab.id && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </Button>
          );
        })}
      </div>

      {activeTab === "status" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white"><CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900"><Store className="h-6 w-6 text-brand-accent" />Status da Loja</CardTitle></CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-6 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg text-yellow-800 mb-2">Loja em Configuração</h3>
              <p className="text-yellow-700 text-sm">Sua loja está atualmente fechada. Complete todas as etapas para solicitar a abertura.</p>
            </div>
            <div className="flex items-center justify-between p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
              <div><h3 className="font-bold text-lg text-indigo-900">Status Atual</h3><p className="text-indigo-700 font-medium">Loja Fechada (Em Configuração)</p></div>
              <Switch checked={isOpen} onCheckedChange={setIsOpen} disabled className="data-[state=checked]:bg-green-500" />
            </div>
            <div className="flex justify-end"><Button className="rounded-2xl bg-indigo-600 text-white font-black py-6 px-8 h-auto shadow-lg shadow-indigo-100" onClick={() => setActiveTab("hours")}>Continuar</Button></div>
          </CardContent>
        </Card>
      )}

      {activeTab === "hours" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white"><CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900"><Clock className="h-6 w-6 text-brand-accent" />Horário de Funcionamento</CardTitle></CardHeader>
          <CardContent className="space-y-6 pt-4">
            <BusinessHoursManager hours={hours} onChange={setHours} />
            <div className="flex justify-between pt-4"><Button variant="ghost" className="rounded-xl font-bold text-gray-400" onClick={() => setActiveTab("status")}>Voltar</Button><Button className="rounded-2xl bg-indigo-600 text-white font-black py-6 px-8 h-auto shadow-lg shadow-indigo-100" onClick={handleSaveHours}>Salvar e Continuar</Button></div>
          </CardContent>
        </Card>
      )}

      {activeTab === "store" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white"><CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900"><Building2 className="h-6 w-6 text-brand-accent" />Informações da Loja</CardTitle></CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-bold text-gray-700">Nome da Loja *</Label><Input placeholder="Ex: Hamburgueria do Zé" value={storeInfo.name} onChange={(e) => setStoreInfo({...storeInfo, name: e.target.value})} className="rounded-xl h-12 border-gray-100" /></div>
              <div className="space-y-2"><Label className="font-bold text-gray-700">Telefone Comercial *</Label><Input placeholder="(00) 00000-0000" value={storeInfo.phone} onChange={(e) => setStoreInfo({...storeInfo, phone: e.target.value})} className="rounded-xl h-12 border-gray-100" /></div>
            </div>
            <div className="space-y-2"><Label className="font-bold text-gray-700">Descrição</Label><textarea placeholder="Conte um pouco sobre sua loja..." value={storeInfo.description} onChange={(e) => setStoreInfo({...storeInfo, description: e.target.value})} className="w-full rounded-2xl border border-gray-100 p-4 h-28 resize-none focus:ring-2 focus:ring-indigo-100 transition-all" /></div>
            <div className="pt-4 border-t border-gray-50"><h3 className="font-black text-lg text-indigo-900 mb-6 flex items-center gap-2"><MapPin className="h-5 w-5 text-brand-accent" />Endereço Comercial</h3><MerchantAddressForm address={storeInfo.address} onChange={(address) => setStoreInfo({ ...storeInfo, address })} /></div>
            <div className="flex justify-between pt-8"><Button variant="ghost" className="rounded-xl font-bold text-gray-400" onClick={() => setActiveTab("hours")}>Voltar</Button><Button className="rounded-2xl bg-indigo-600 text-white font-black py-6 px-8 h-auto shadow-lg shadow-indigo-100" onClick={handleSaveStoreInfo}>Salvar e Continuar</Button></div>
          </CardContent>
        </Card>
      )}

      {activeTab === "bank" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white"><CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900"><CreditCard className="h-6 w-6 text-brand-accent" />Informações Bancárias</CardTitle></CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Banco *</Label>
                <Select value={bankInfo.bank} onValueChange={(v) => setBankInfo({...bankInfo, bank: v})}>
                  <SelectTrigger className="rounded-xl h-12 border-gray-100">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60">
                    {BRAZILIAN_BANKS.map(bank => (
                      <SelectItem key={bank.code} value={bank.code}>{bank.code} - {bank.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="font-bold text-gray-700">Tipo de Conta *</Label><Select value={bankInfo.accountType} onValueChange={(v) => setBankInfo({...bankInfo, accountType: v})}><SelectTrigger className="rounded-xl h-12 border-gray-100"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="checking">Conta Corrente</SelectItem><SelectItem value="savings">Conta Poupança</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2"><Label className="font-bold text-gray-700">Agência *</Label><Input placeholder="0000" value={bankInfo.agency} onChange={(e) => setBankInfo({...bankInfo, agency: e.target.value})} className="rounded-xl h-12 border-gray-100" /></div>
                <div className="space-y-2"><Label className="font-bold text-gray-700">Dígito</Label><Input placeholder="0" value={bankInfo.agencyDigit} onChange={(e) => setBankInfo({...bankInfo, agencyDigit: e.target.value})} className="rounded-xl h-12 border-gray-100" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2 col-span-1 md:col-span-4 mt-4 md:mt-0">
                <div className="col-span-2 space-y-2"><Label className="font-bold text-gray-700">Conta *</Label><Input placeholder="00000" value={bankInfo.account} onChange={(e) => setBankInfo({...bankInfo, account: e.target.value})} className="rounded-xl h-12 border-gray-100" /></div>
                <div className="space-y-2"><Label className="font-bold text-gray-700">Dígito</Label><Input placeholder="0" value={bankInfo.accountDigit} onChange={(e) => setBankInfo({...bankInfo, accountDigit: e.target.value})} className="rounded-xl h-12 border-gray-100" /></div>
              </div>
            </div>
            <div className="flex justify-between pt-4"><Button variant="ghost" className="rounded-xl font-bold text-gray-400" onClick={() => setActiveTab("store")}>Voltar</Button><Button className="rounded-2xl bg-indigo-600 text-white font-black py-6 px-8 h-auto shadow-lg shadow-indigo-100" onClick={handleSaveBankInfo}>Salvar e Continuar</Button></div>
          </CardContent>
        </Card>
      )}

      {activeTab === "team" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white">
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900"><Users className="h-6 w-6 text-brand-accent" />Gestão de Equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 space-y-6">
              <h3 className="font-black text-indigo-900 flex items-center gap-2"><UserPlus className="h-5 w-5" />Convidar Novo Integrante</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="font-bold text-gray-700">E-mail</Label><Input placeholder="colaborador@loja.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="rounded-xl h-12 bg-white" /></div>
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700">Perfil de Acesso</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="rounded-xl h-12 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="manager">Gerente (Acesso Total)</SelectItem>
                      <SelectItem value="employee">Operador (Acesso Limitado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="font-black text-indigo-900 text-xs uppercase tracking-widest">Permissões de Acesso</Label>
                <div className="grid grid-cols-2 gap-3">
                  {PERMISSIONS.map(perm => (
                    <div key={perm.id} className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                      <Checkbox id={perm.id} checked={invitePermissions.includes(perm.id)} onCheckedChange={() => togglePermission(perm.id)} />
                      <label htmlFor={perm.id} className="text-sm font-bold text-gray-700 cursor-pointer">{perm.label}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button onClick={handleInviteSubmit} className="w-full md:w-auto rounded-xl bg-indigo-600 font-bold px-8 h-12">Enviar Convite</Button>
            </div>
            
            <div className="space-y-3">
              <Label className="font-black text-indigo-900 text-xs uppercase tracking-widest ml-1">Integrantes da Equipe</Label>
              {teamMembers.map((member) => (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 shrink-0">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{member.email}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-500">{member.role === "manager" ? "Gerente" : "Operador"}</Badge>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase",
                          member.status === "active" ? "text-green-600 border-green-200 bg-green-50" : "text-orange-500 border-orange-200 bg-orange-50"
                        )}>
                          {member.status === "active" ? "Ativo" : "Aguardando Aceite"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1 sm:flex-none text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold">Gerenciar</Button>
                    <Button variant="ghost" size="sm" className="flex-1 sm:flex-none text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl font-bold">Remover</Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between pt-4"><Button variant="ghost" className="rounded-xl font-bold text-gray-400" onClick={() => setActiveTab("bank")}>Voltar</Button><Button className="rounded-2xl bg-indigo-600 text-white font-black py-6 px-8 h-auto shadow-lg shadow-indigo-100" onClick={() => setActiveTab("completion")}>Continuar</Button></div>
          </CardContent>
        </Card>
      )}

      {activeTab === "completion" && (
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-white"><CardTitle className="flex items-center gap-2 text-2xl font-black text-indigo-900"><CheckCircle2 className="h-6 w-6 text-brand-accent" />Conclusão</CardTitle></CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-indigo-50/50 rounded-3xl p-8 border border-indigo-100">
              <h3 className="font-black text-xl text-indigo-900 mb-6">Resumo das Etapas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[{ label: "Horários", step: "hours" }, { label: "Dados da Loja", step: "store" }, { label: "Financeiro", step: "bank" }].map((item) => (
                  <div key={item.step} className="flex items-center p-4 bg-white rounded-2xl shadow-sm">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-4 ${completedSteps[item.step as keyof typeof completedSteps] ? 'bg-green-500' : 'bg-gray-100'}`}>
                      {completedSteps[item.step as keyof typeof completedSteps] ? <CheckCircle2 className="h-5 w-5 text-white" /> : <AlertCircle className="h-5 w-5 text-gray-300" />}
                    </div>
                    <span className={`font-bold ${completedSteps[item.step as keyof typeof completedSteps] ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4"><AlertCircle className="h-6 w-6 text-blue-500 shrink-0" /><p className="text-blue-700 text-sm font-medium">Após o envio, nossa equipe analisará seus dados em até 48 horas. Você será notificado via e-mail sobre a aprovação.</p></div>
            <div className="flex justify-between pt-4"><Button variant="ghost" className="rounded-xl font-bold text-gray-400" onClick={() => setActiveTab("team")}>Voltar</Button><Button className="rounded-2xl bg-brand-accent text-white font-black py-6 px-10 h-auto shadow-xl shadow-brand-accent/20" onClick={handleSubmitForApproval} disabled={loading}>{loading ? "Processando..." : "Enviar para Aprovação"}</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchantSetupPage;